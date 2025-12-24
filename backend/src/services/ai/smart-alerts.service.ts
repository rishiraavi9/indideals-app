import { db } from '../../db/index.js';
import { deals, priceAlerts, priceHistory, pricePredictions } from '../../db/schema.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { PricePredictionService } from './price-prediction.service.js';

/**
 * Smart Price Alerts Service (Cost-Free)
 *
 * Enhances traditional price alerts with AI-powered predictions:
 * 1. Price Drop Probability - When is the price likely to drop?
 * 2. Flash Sale Alerts - Notify when flash sale pattern detected
 * 3. Buy Timing Suggestions - Wait vs buy now recommendations
 *
 * All algorithms run locally - NO external API calls.
 */

export interface SmartAlertSuggestion {
  dealId: string;
  currentPrice: number;
  targetPrice: number;
  alertType: 'fixed' | 'smart' | 'flash_sale';
  dropProbability: number; // 0-100
  suggestedWaitDays: number | null;
  suggestedTargetPrice: number | null;
  recommendation: 'set_alert' | 'buy_now' | 'wait';
  reasoning: string;
}

export interface AlertStrategyResult {
  shouldAlert: boolean;
  alertType: 'price_drop' | 'flash_sale' | 'trend_reversal' | 'lowest_price';
  message: string;
  confidence: number;
}

export class SmartAlertsService {
  /**
   * Suggest an optimal alert strategy for a deal
   */
  static async suggestAlertStrategy(
    dealId: string,
    targetPrice: number
  ): Promise<SmartAlertSuggestion> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Get price prediction
    let prediction;
    try {
      prediction = await PricePredictionService.predictPrice(dealId);
    } catch {
      prediction = null;
    }

    const currentPrice = deal.price;
    const priceDiff = currentPrice - targetPrice;
    const priceDiffPercent = (priceDiff / currentPrice) * 100;

    // Calculate drop probability
    const dropProbability = this.calculateDropProbability(
      prediction,
      currentPrice,
      targetPrice
    );

    // Determine recommendation
    const { recommendation, alertType, suggestedWaitDays, suggestedTargetPrice, reasoning } =
      this.determineStrategy(deal, prediction, targetPrice, dropProbability);

    return {
      dealId,
      currentPrice,
      targetPrice,
      alertType,
      dropProbability,
      suggestedWaitDays,
      suggestedTargetPrice,
      recommendation,
      reasoning,
    };
  }

  /**
   * Calculate probability of price dropping to target
   */
  private static calculateDropProbability(
    prediction: any | null,
    currentPrice: number,
    targetPrice: number
  ): number {
    if (!prediction) return 30; // Default moderate probability

    let probability = 30; // Base probability

    // Factor 1: Current trend
    if (prediction.trend === 'down') {
      probability += 25;
    } else if (prediction.trend === 'up') {
      probability -= 20;
    }

    // Factor 2: Trend strength
    probability += (prediction.trendStrength || 0) * 0.2;

    // Factor 3: Flash sale pattern
    if (prediction.flashSalePattern) {
      probability += 20;
    }

    // Factor 4: Price volatility (higher volatility = higher chance of hitting target)
    probability += (prediction.priceVolatility || 0) * 0.15;

    // Factor 5: How close target is to historical low
    if (prediction.lowestPriceLast30Days) {
      const targetVsLowest = (targetPrice - prediction.lowestPriceLast30Days) / prediction.lowestPriceLast30Days;
      if (targetVsLowest >= 0) {
        // Target is at or above historical low - achievable
        probability += 15;
      } else if (targetVsLowest >= -0.1) {
        // Target is up to 10% below historical low - possible
        probability += 5;
      } else {
        // Target is way below historical low - unlikely
        probability -= 20;
      }
    }

    // Factor 6: How far target is from current price
    const dropRequired = ((currentPrice - targetPrice) / currentPrice) * 100;
    if (dropRequired > 50) {
      probability -= 30; // 50%+ drop is very unlikely
    } else if (dropRequired > 30) {
      probability -= 15;
    } else if (dropRequired > 20) {
      probability -= 5;
    } else if (dropRequired < 10) {
      probability += 10; // Small drop is likely
    }

    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  /**
   * Determine the best alert strategy
   */
  private static determineStrategy(
    deal: any,
    prediction: any | null,
    targetPrice: number,
    dropProbability: number
  ): {
    recommendation: 'set_alert' | 'buy_now' | 'wait';
    alertType: 'fixed' | 'smart' | 'flash_sale';
    suggestedWaitDays: number | null;
    suggestedTargetPrice: number | null;
    reasoning: string;
  } {
    const currentPrice = deal.price;
    const dropRequired = ((currentPrice - targetPrice) / currentPrice) * 100;

    // Case 1: Target already reached
    if (currentPrice <= targetPrice) {
      return {
        recommendation: 'buy_now',
        alertType: 'fixed',
        suggestedWaitDays: null,
        suggestedTargetPrice: null,
        reasoning: `Current price (₹${currentPrice}) is already at or below your target (₹${targetPrice}). Buy now!`,
      };
    }

    // Case 2: Very close to target (within 5%)
    if (dropRequired <= 5) {
      return {
        recommendation: 'buy_now',
        alertType: 'fixed',
        suggestedWaitDays: null,
        suggestedTargetPrice: null,
        reasoning: `Current price is only ${dropRequired.toFixed(1)}% above target. Consider buying now to avoid missing out.`,
      };
    }

    // Case 3: Flash sale pattern detected
    if (prediction?.flashSalePattern && prediction?.nextFlashSaleDate) {
      const daysUntilFlashSale = Math.round(
        (new Date(prediction.nextFlashSaleDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilFlashSale > 0 && daysUntilFlashSale <= 14) {
        return {
          recommendation: 'wait',
          alertType: 'flash_sale',
          suggestedWaitDays: daysUntilFlashSale,
          suggestedTargetPrice: Math.round(currentPrice * 0.85), // Expect ~15% drop
          reasoning: `Flash sale pattern detected. Next sale expected in ~${daysUntilFlashSale} days. Wait for better price.`,
        };
      }
    }

    // Case 4: Strong downward trend
    if (prediction?.trend === 'down' && prediction?.trendStrength >= 50) {
      const predictedPrice = prediction.predictedPrice || Math.round(currentPrice * 0.95);
      const daysToWait = 7;

      if (predictedPrice < currentPrice) {
        return {
          recommendation: 'wait',
          alertType: 'smart',
          suggestedWaitDays: daysToWait,
          suggestedTargetPrice: predictedPrice,
          reasoning: `Price is trending down (${prediction.trendStrength}% confidence). Expected to reach ₹${predictedPrice} in ~${daysToWait} days.`,
        };
      }
    }

    // Case 5: High drop probability
    if (dropProbability >= 70) {
      return {
        recommendation: 'wait',
        alertType: 'smart',
        suggestedWaitDays: 14,
        suggestedTargetPrice: targetPrice,
        reasoning: `High chance (${dropProbability}%) of price dropping to your target. Setting smart alert.`,
      };
    }

    // Case 6: Low drop probability but reasonable target
    if (dropProbability >= 30 && dropRequired <= 30) {
      return {
        recommendation: 'set_alert',
        alertType: 'fixed',
        suggestedWaitDays: null,
        suggestedTargetPrice: null,
        reasoning: `Moderate chance (${dropProbability}%) of reaching ₹${targetPrice}. Alert set - we'll notify you.`,
      };
    }

    // Case 7: Unrealistic target
    if (dropProbability < 20 || dropRequired > 50) {
      const realisticTarget = prediction?.lowestPriceLast30Days
        ? Math.round(prediction.lowestPriceLast30Days * 1.05)
        : Math.round(currentPrice * 0.85);

      return {
        recommendation: 'set_alert',
        alertType: 'fixed',
        suggestedWaitDays: null,
        suggestedTargetPrice: realisticTarget,
        reasoning: `Your target may be ambitious. Based on history, a more realistic target is ₹${realisticTarget}.`,
      };
    }

    // Default: Set standard alert
    return {
      recommendation: 'set_alert',
      alertType: 'fixed',
      suggestedWaitDays: null,
      suggestedTargetPrice: null,
      reasoning: `Alert set for ₹${targetPrice}. We'll notify you when the price drops.`,
    };
  }

  /**
   * Check if a deal should trigger a smart alert
   */
  static async checkSmartAlert(
    dealId: string,
    currentPrice: number
  ): Promise<AlertStrategyResult | null> {
    // Get prediction
    let prediction;
    try {
      prediction = await PricePredictionService.getCachedPrediction(dealId);
    } catch {
      return null;
    }

    if (!prediction) return null;

    // Check for lowest price ever
    if (prediction.lowestPriceLast30Days && currentPrice <= prediction.lowestPriceLast30Days) {
      return {
        shouldAlert: true,
        alertType: 'lowest_price',
        message: `Lowest price ever! Current: ₹${currentPrice} (was ₹${prediction.lowestPriceLast30Days})`,
        confidence: 95,
      };
    }

    // Check for trend reversal (was going up, now going down)
    if (prediction.trend === 'down' && prediction.trendStrength >= 60) {
      return {
        shouldAlert: true,
        alertType: 'trend_reversal',
        message: `Price started dropping! Down to ₹${currentPrice} (${prediction.trendStrength}% confidence)`,
        confidence: prediction.trendStrength,
      };
    }

    // Check for flash sale
    if (prediction.flashSalePattern && prediction.nextFlashSaleDate) {
      const now = new Date();
      const flashSaleDate = new Date(prediction.nextFlashSaleDate);
      const hoursDiff = (flashSaleDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDiff >= 0 && hoursDiff <= 24) {
        return {
          shouldAlert: true,
          alertType: 'flash_sale',
          message: `Flash sale expected today! Watch for price drops.`,
          confidence: 70,
        };
      }
    }

    return null;
  }

  /**
   * Create or update a smart price alert
   */
  static async createSmartAlert(
    userId: string,
    dealId: string,
    targetPrice: number
  ): Promise<{ alertId: string; suggestion: SmartAlertSuggestion }> {
    // Get smart suggestion
    const suggestion = await this.suggestAlertStrategy(dealId, targetPrice);

    // Create the alert
    const [alert] = await db
      .insert(priceAlerts)
      .values({
        userId,
        dealId,
        targetPrice,
        isActive: true,
        alertType: suggestion.alertType,
        dropProbability: suggestion.dropProbability,
        suggestedWaitDays: suggestion.suggestedWaitDays,
        predictedDropDate: suggestion.suggestedWaitDays
          ? new Date(Date.now() + suggestion.suggestedWaitDays * 24 * 60 * 60 * 1000)
          : null,
      } as any)
      .returning();

    return {
      alertId: alert.id,
      suggestion,
    };
  }

  /**
   * Get all smart alerts that should be sent (based on predictions)
   */
  static async getAlertsToSend(): Promise<any[]> {
    // Get active alerts
    const activeAlerts = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.isActive, true))
      .limit(1000);

    const alertsToSend: any[] = [];

    for (const alert of activeAlerts) {
      // Get current deal price
      const [deal] = await db
        .select({ price: deals.price })
        .from(deals)
        .where(eq(deals.id, alert.dealId))
        .limit(1);

      if (!deal) continue;

      // Check if target price reached
      if (deal.price <= alert.targetPrice) {
        alertsToSend.push({
          ...alert,
          currentPrice: deal.price,
          triggerType: 'price_drop',
        });
        continue;
      }

      // For smart alerts, check prediction-based triggers
      if (alert.alertType === 'smart' || alert.alertType === 'flash_sale') {
        const smartAlert = await this.checkSmartAlert(alert.dealId, deal.price);
        if (smartAlert?.shouldAlert) {
          alertsToSend.push({
            ...alert,
            currentPrice: deal.price,
            triggerType: smartAlert.alertType,
            message: smartAlert.message,
          });
        }
      }
    }

    return alertsToSend;
  }

  /**
   * Update alert predictions in bulk
   */
  static async updateAlertPredictions(): Promise<number> {
    // Get active alerts
    const activeAlerts = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.isActive, true))
      .limit(500);

    let updated = 0;

    for (const alert of activeAlerts) {
      try {
        // Get fresh prediction
        const prediction = await PricePredictionService.predictAndSave(alert.dealId);

        // Calculate new drop probability
        const [deal] = await db
          .select({ price: deals.price })
          .from(deals)
          .where(eq(deals.id, alert.dealId))
          .limit(1);

        if (!deal) continue;

        const dropProbability = this.calculateDropProbability(
          prediction,
          deal.price,
          alert.targetPrice
        );

        // Update alert with new prediction data
        await db
          .update(priceAlerts)
          .set({
            dropProbability,
            predictedDropDate: prediction.nextFlashSaleDate,
          } as any)
          .where(eq(priceAlerts.id, alert.id));

        updated++;
      } catch (error) {
        console.error(`Error updating prediction for alert ${alert.id}:`, error);
      }
    }

    return updated;
  }

  /**
   * Get deals with high drop probability
   */
  static async getDealsLikelyToDrop(
    minProbability: number = 70,
    limit: number = 20
  ): Promise<any[]> {
    const predictions = await db
      .select()
      .from(pricePredictions)
      .where(
        and(
          eq(pricePredictions.trend, 'down'),
          gte(pricePredictions.confidence, minProbability)
        )
      )
      .orderBy(desc(pricePredictions.confidence))
      .limit(limit);

    // Get deal details
    const dealIds = predictions.map(p => p.dealId);
    const dealsData = await db
      .select()
      .from(deals)
      .where(and(eq(deals.isExpired, false)));

    const dealsMap = new Map(dealsData.filter(d => dealIds.includes(d.id)).map(d => [d.id, d]));

    return predictions.map(p => ({
      ...p,
      deal: dealsMap.get(p.dealId),
    })).filter(p => p.deal);
  }
}

export const smartAlertsService = SmartAlertsService;
