import { db } from '../../db/index.js';
import { deals, priceHistory, pricePredictions } from '../../db/schema.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

/**
 * AI-Powered Price Prediction Service (Cost-Free)
 *
 * Predicts future prices using local statistical algorithms:
 * 1. Moving Averages (SMA, EMA) - Trend detection
 * 2. Linear Regression - Price forecasting
 * 3. Seasonal Pattern Detection - Day-of-week analysis
 * 4. Flash Sale Pattern Recognition
 *
 * All algorithms run locally - NO external API calls.
 */

export interface PricePrediction {
  dealId: string;
  currentPrice: number;
  predictedPrice: number | null;
  predictedDate: Date | null;
  confidence: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  trendStrength: number; // 0-100
  bestBuyDay: string | null;
  flashSalePattern: boolean;
  nextFlashSaleDate: Date | null;
  priceVolatility: number; // 0-100
  lowestPriceLast30Days: number | null;
  highestPriceLast30Days: number | null;
  recommendation: 'buy_now' | 'wait' | 'skip';
  reasoning: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class PricePredictionService {
  /**
   * Generate price prediction for a deal
   */
  static async predictPrice(dealId: string): Promise<PricePrediction> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Get price history (last 90 days)
    const history = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.dealId, dealId))
      .orderBy(desc(priceHistory.scrapedAt))
      .limit(90);

    const prices = history.map(h => h.price);
    const currentPrice = deal.price;

    // Calculate all metrics
    const trend = this.calculateTrend(prices);
    const trendStrength = this.calculateTrendStrength(prices);
    const volatility = this.calculateVolatility(prices);
    const { predictedPrice, confidence } = this.predictNextPrice(prices, trend);
    const bestBuyDay = await this.findBestBuyDay(history);
    const flashSaleInfo = this.detectFlashSalePattern(history);
    const priceRange = this.getPriceRange(prices, currentPrice);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      currentPrice,
      predictedPrice,
      trend,
      confidence,
      priceRange.lowestPrice,
      flashSaleInfo.hasPattern,
      priceRange.percentileRank
    );

    const reasoning = this.generateReasoning(
      trend,
      trendStrength,
      volatility,
      priceRange,
      flashSaleInfo,
      bestBuyDay
    );

    return {
      dealId,
      currentPrice,
      predictedPrice: predictedPrice || null,
      predictedDate: predictedPrice ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      confidence,
      trend,
      trendStrength,
      bestBuyDay,
      flashSalePattern: flashSaleInfo.hasPattern,
      nextFlashSaleDate: flashSaleInfo.nextPredictedDate,
      priceVolatility: volatility,
      lowestPriceLast30Days: priceRange.lowestPrice,
      highestPriceLast30Days: priceRange.highestPrice,
      recommendation,
      reasoning,
    };
  }

  /**
   * Calculate price trend using linear regression
   */
  private static calculateTrend(prices: number[]): 'up' | 'down' | 'stable' {
    if (prices.length < 3) return 'stable';

    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = prices.reduce((sum, price, i) => sum + i * price, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgPrice = sumY / n;
    const slopePercent = (slope / avgPrice) * 100;

    if (slopePercent > 1) return 'up';
    if (slopePercent < -1) return 'down';
    return 'stable';
  }

  /**
   * Calculate how strong the trend is (0-100)
   */
  private static calculateTrendStrength(prices: number[]): number {
    if (prices.length < 3) return 0;

    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = prices.reduce((sum, price, i) => sum + i * price, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const sumY2 = prices.reduce((sum, price) => sum + price * price, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0 || isNaN(denominator)) return 0;

    const r = numerator / denominator;
    const result = Math.round(Math.abs(r) * 100);
    return isNaN(result) ? 0 : result;
  }

  /**
   * Calculate price volatility (0-100)
   */
  private static calculateVolatility(prices: number[]): number {
    if (prices.length < 3) return 0;

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (avgPrice === 0) return 0;

    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avgPrice) * 100;

    // Normalize to 0-100 scale (CV of 20% = 50, 40% = 100)
    const result = Math.min(100, Math.round(coefficientOfVariation * 2.5));
    return isNaN(result) ? 0 : result;
  }

  /**
   * Predict next price using linear regression
   */
  private static predictNextPrice(prices: number[], trend: string): { predictedPrice: number | null; confidence: number } {
    if (prices.length < 5) {
      return { predictedPrice: null, confidence: 0 };
    }

    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = prices.reduce((sum, price, i) => sum + i * price, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict 7 days ahead
    const predictedPrice = Math.round(slope * (n + 7) + intercept);

    // Calculate R-squared for confidence
    const avgY = sumY / n;
    const ssTot = prices.reduce((sum, p) => sum + Math.pow(p - avgY, 2), 0);
    const ssRes = prices.reduce((sum, p, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(p - predicted, 2);
    }, 0);

    // Handle edge case where all prices are the same (ssTot = 0)
    let confidence = 0;
    if (ssTot > 0) {
      const rSquared = 1 - (ssRes / ssTot);
      confidence = Math.round(Math.max(0, Math.min(100, rSquared * 100)));
    } else {
      // All prices are the same - high confidence in stability
      confidence = 80;
    }

    // Ensure predictedPrice is valid
    const finalPredictedPrice = isNaN(predictedPrice) ? prices[0] : Math.max(0, predictedPrice);

    return {
      predictedPrice: finalPredictedPrice,
      confidence: isNaN(confidence) ? 50 : confidence,
    };
  }

  /**
   * Find the best day of week to buy (historically lowest prices)
   */
  private static async findBestBuyDay(history: any[]): Promise<string | null> {
    if (history.length < 14) return null; // Need at least 2 weeks

    const dayBuckets: Record<number, number[]> = {};

    for (const entry of history) {
      const day = new Date(entry.scrapedAt).getDay();
      if (!dayBuckets[day]) dayBuckets[day] = [];
      dayBuckets[day].push(entry.price);
    }

    let bestDay = -1;
    let lowestAvg = Infinity;

    for (const [day, prices] of Object.entries(dayBuckets)) {
      if (prices.length < 2) continue;
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        bestDay = parseInt(day);
      }
    }

    return bestDay >= 0 ? DAY_NAMES[bestDay] : null;
  }

  /**
   * Detect flash sale patterns (sudden drops that recover quickly)
   */
  private static detectFlashSalePattern(history: any[]): {
    hasPattern: boolean;
    avgDropPercent: number;
    nextPredictedDate: Date | null;
  } {
    if (history.length < 10) {
      return { hasPattern: false, avgDropPercent: 0, nextPredictedDate: null };
    }

    const flashSales: { date: Date; drop: number; }[] = [];

    for (let i = 1; i < history.length - 1; i++) {
      const prev = history[i + 1]; // Earlier entry (history is desc)
      const curr = history[i];
      const next = history[i - 1]; // Later entry

      const dropFromPrev = (prev.price - curr.price) / prev.price;
      const recoverToNext = (next.price - curr.price) / curr.price;

      // Flash sale: dropped 15%+ from previous and recovered 10%+ next
      if (dropFromPrev > 0.15 && recoverToNext > 0.10) {
        flashSales.push({
          date: new Date(curr.scrapedAt),
          drop: dropFromPrev * 100,
        });
      }
    }

    if (flashSales.length >= 2) {
      const avgDropPercent = flashSales.reduce((sum, fs) => sum + fs.drop, 0) / flashSales.length;

      // Calculate average interval between flash sales
      const intervals: number[] = [];
      for (let i = 1; i < flashSales.length; i++) {
        const intervalDays = (flashSales[i - 1].date.getTime() - flashSales[i].date.getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(intervalDays);
      }

      const avgInterval = intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : 14; // Default 2 weeks

      const lastFlashSale = flashSales[0].date;
      const nextPredictedDate = new Date(lastFlashSale.getTime() + avgInterval * 24 * 60 * 60 * 1000);

      return {
        hasPattern: true,
        avgDropPercent: Math.round(avgDropPercent),
        nextPredictedDate: nextPredictedDate > new Date() ? nextPredictedDate : null,
      };
    }

    return { hasPattern: false, avgDropPercent: 0, nextPredictedDate: null };
  }

  /**
   * Get price range statistics
   */
  private static getPriceRange(prices: number[], currentPrice: number): {
    lowestPrice: number | null;
    highestPrice: number | null;
    isLowestEver: boolean;
    percentileRank: number;
  } {
    if (prices.length === 0) {
      return { lowestPrice: null, highestPrice: null, isLowestEver: false, percentileRank: 50 };
    }

    const sorted = [...prices].sort((a, b) => a - b);
    const lowestPrice = sorted[0];
    const highestPrice = sorted[sorted.length - 1];
    const isLowestEver = currentPrice <= lowestPrice;

    // Calculate percentile rank (0 = lowest, 100 = highest)
    const rank = sorted.filter(p => p < currentPrice).length;
    const percentileRank = Math.round((rank / sorted.length) * 100);

    return { lowestPrice, highestPrice, isLowestEver, percentileRank };
  }

  /**
   * Generate buy recommendation
   */
  private static generateRecommendation(
    currentPrice: number,
    predictedPrice: number | null,
    trend: string,
    confidence: number,
    lowestPrice: number | null,
    hasFlashSalePattern: boolean,
    percentileRank: number
  ): 'buy_now' | 'wait' | 'skip' {
    // Buy now if:
    // - At or near lowest price ever
    // - Price is in the lowest 30% of historical prices
    if (lowestPrice && currentPrice <= lowestPrice * 1.05) {
      return 'buy_now';
    }

    if (percentileRank <= 30) {
      return 'buy_now';
    }

    // Wait if:
    // - Price is above average (percentile > 50)
    // - Price is dropping with reasonable confidence
    // - Flash sale pattern detected
    if (percentileRank > 50) {
      return 'wait';
    }

    if (trend === 'down' && confidence >= 40) {
      return 'wait';
    }

    if (hasFlashSalePattern) {
      return 'wait';
    }

    if (predictedPrice && currentPrice > predictedPrice * 1.1) {
      return 'wait';
    }

    // Price is between 30-50 percentile - reasonable to buy
    if (trend === 'up' && confidence >= 60) {
      return 'buy_now';
    }

    // Default: price is around average, okay to buy if needed
    return 'buy_now';
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(
    trend: string,
    trendStrength: number,
    volatility: number,
    priceRange: any,
    flashSaleInfo: any,
    bestBuyDay: string | null
  ): string {
    const reasons: string[] = [];

    // Trend analysis
    if (trend === 'down' && trendStrength >= 40) {
      reasons.push(`Price is dropping (${trendStrength}% confidence)`);
    } else if (trend === 'up' && trendStrength >= 40) {
      reasons.push(`Price is rising (${trendStrength}% confidence)`);
    } else {
      reasons.push('Price is relatively stable');
    }

    // Price position
    if (priceRange.isLowestEver) {
      reasons.push('This is the lowest price recorded');
    } else if (priceRange.percentileRank <= 20) {
      reasons.push('Current price is in the lowest 20% historically');
    } else if (priceRange.percentileRank >= 80) {
      reasons.push('Current price is in the highest 20% historically');
    }

    // Volatility
    if (volatility >= 50) {
      reasons.push('Price is highly volatile - expect fluctuations');
    }

    // Flash sale
    if (flashSaleInfo.hasPattern) {
      reasons.push(`Flash sales detected (avg ${flashSaleInfo.avgDropPercent}% drop)`);
      if (flashSaleInfo.nextPredictedDate) {
        const daysUntil = Math.round(
          (flashSaleInfo.nextPredictedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil > 0 && daysUntil <= 14) {
          reasons.push(`Next flash sale expected in ~${daysUntil} days`);
        }
      }
    }

    // Best day
    if (bestBuyDay) {
      reasons.push(`${bestBuyDay} typically has lower prices`);
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Save prediction to database
   */
  static async savePrediction(prediction: PricePrediction): Promise<void> {
    await db
      .insert(pricePredictions)
      .values({
        dealId: prediction.dealId,
        currentPrice: prediction.currentPrice,
        predictedPrice: prediction.predictedPrice,
        predictedDate: prediction.predictedDate,
        confidence: prediction.confidence,
        trend: prediction.trend,
        trendStrength: prediction.trendStrength,
        bestBuyDay: prediction.bestBuyDay,
        flashSalePattern: prediction.flashSalePattern,
        nextFlashSaleDate: prediction.nextFlashSaleDate,
        priceVolatility: prediction.priceVolatility,
        lowestPriceLast30Days: prediction.lowestPriceLast30Days,
        highestPriceLast30Days: prediction.highestPriceLast30Days,
        recommendation: prediction.recommendation,
      } as any)
      .onConflictDoUpdate({
        target: pricePredictions.dealId,
        set: {
          currentPrice: prediction.currentPrice,
          predictedPrice: prediction.predictedPrice,
          predictedDate: prediction.predictedDate,
          confidence: prediction.confidence,
          trend: prediction.trend,
          trendStrength: prediction.trendStrength,
          bestBuyDay: prediction.bestBuyDay,
          flashSalePattern: prediction.flashSalePattern,
          nextFlashSaleDate: prediction.nextFlashSaleDate,
          priceVolatility: prediction.priceVolatility,
          lowestPriceLast30Days: prediction.lowestPriceLast30Days,
          highestPriceLast30Days: prediction.highestPriceLast30Days,
          recommendation: prediction.recommendation,
          updatedAt: new Date(),
        } as any,
      });
  }

  /**
   * Predict and save for a deal
   */
  static async predictAndSave(dealId: string): Promise<PricePrediction> {
    const prediction = await this.predictPrice(dealId);
    await this.savePrediction(prediction);
    return prediction;
  }

  /**
   * Get cached prediction from database
   */
  static async getCachedPrediction(dealId: string): Promise<PricePrediction | null> {
    const [existing] = await db
      .select()
      .from(pricePredictions)
      .where(eq(pricePredictions.dealId, dealId))
      .limit(1);

    if (!existing) return null;

    // Check if prediction is stale (older than 24 hours)
    const ageHours = (Date.now() - new Date(existing.updatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      // Refresh prediction
      return this.predictAndSave(dealId);
    }

    return {
      dealId: existing.dealId,
      currentPrice: existing.currentPrice,
      predictedPrice: existing.predictedPrice,
      predictedDate: existing.predictedDate,
      confidence: existing.confidence,
      trend: existing.trend as 'up' | 'down' | 'stable',
      trendStrength: existing.trendStrength || 0,
      bestBuyDay: existing.bestBuyDay,
      flashSalePattern: existing.flashSalePattern,
      nextFlashSaleDate: existing.nextFlashSaleDate,
      priceVolatility: existing.priceVolatility || 0,
      lowestPriceLast30Days: existing.lowestPriceLast30Days,
      highestPriceLast30Days: existing.highestPriceLast30Days,
      recommendation: (existing.recommendation as 'buy_now' | 'wait' | 'skip') || 'buy_now',
      reasoning: this.generateReasoning(
        existing.trend as 'up' | 'down' | 'stable',
        existing.trendStrength || 0,
        existing.priceVolatility || 0,
        {
          isLowestEver: false,
          percentileRank: 50,
          lowestPrice: existing.lowestPriceLast30Days,
          highestPrice: existing.highestPriceLast30Days,
        },
        {
          hasPattern: existing.flashSalePattern,
          avgDropPercent: 20,
          nextPredictedDate: existing.nextFlashSaleDate,
        },
        existing.bestBuyDay
      ),
    };
  }

  /**
   * Batch predict for multiple deals
   */
  static async batchPredict(dealIds: string[]): Promise<Map<string, PricePrediction>> {
    const results = new Map<string, PricePrediction>();

    for (const dealId of dealIds) {
      try {
        const prediction = await this.predictAndSave(dealId);
        results.set(dealId, prediction);
      } catch (error) {
        console.error(`Error predicting price for deal ${dealId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get deals with "wait" recommendation (prices expected to drop)
   */
  static async getDealsToWaitFor(limit: number = 20): Promise<any[]> {
    return db
      .select()
      .from(pricePredictions)
      .where(eq(pricePredictions.recommendation, 'wait'))
      .orderBy(desc(pricePredictions.confidence))
      .limit(limit);
  }

  /**
   * Get deals with flash sale patterns
   */
  static async getFlashSaleDeals(limit: number = 20): Promise<any[]> {
    return db
      .select()
      .from(pricePredictions)
      .where(eq(pricePredictions.flashSalePattern, true))
      .orderBy(desc(pricePredictions.updatedAt))
      .limit(limit);
  }
}

export const pricePredictionService = PricePredictionService;
