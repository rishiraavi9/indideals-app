import { db } from '../../db/index.js';
import { deals, priceHistory } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';

/**
 * Deal Summarizer Service (Cost-Free)
 *
 * Generates concise deal summaries using template-based text generation:
 * 1. Product Name Extraction - Clean title parsing
 * 2. Value Point Detection - Free shipping, EMI, bank offers
 * 3. Price Analysis - Historical comparison
 * 4. Buy Recommendation - Algorithmic decision
 *
 * All algorithms run locally - NO external API calls.
 */

export interface DealSummary {
  headline: string;
  shortDescription: string;
  valuePoints: string[];
  priceAnalysis: {
    status: 'lowest_ever' | 'below_average' | 'at_average' | 'above_average' | 'unknown';
    message: string;
  };
  buyRecommendation: 'buy_now' | 'wait' | 'skip';
  recommendationReason: string;
  highlights: string[];
}

// Keywords for value point extraction
const VALUE_INDICATORS = {
  freeShipping: [
    'free shipping', 'free delivery', 'no delivery charge', 'delivery free',
    'shipping free', 'free express', 'free standard delivery'
  ],
  noCostEmi: [
    'no cost emi', 'no-cost emi', '0% emi', 'zero cost emi', 'interest free emi',
    'emi at 0%', 'no extra cost emi'
  ],
  bankOffers: [
    'bank offer', 'card discount', 'cashback', 'instant discount',
    'hdfc offer', 'icici offer', 'sbi offer', 'axis offer', 'kotak offer',
    'credit card offer', 'debit card offer', 'upi offer'
  ],
  exchangeOffer: [
    'exchange offer', 'exchange bonus', 'exchange value', 'trade in',
    'exchange discount', 'old device exchange'
  ],
  bundleOffer: [
    'combo offer', 'bundle deal', 'buy 1 get 1', 'buy one get one', 'b1g1',
    'free accessory', 'free gift', 'complimentary'
  ],
  limitedTime: [
    'limited time', 'today only', 'flash sale', 'lightning deal', 'deal of the day',
    'ends today', 'last few hours', 'hurry'
  ],
  warranty: [
    'extended warranty', 'warranty included', '1 year warranty', '2 year warranty',
    'manufacturer warranty', 'brand warranty'
  ],
  primeExclusive: [
    'prime exclusive', 'prime members', 'prime deal', 'plus member',
    'supercoins', 'member exclusive'
  ],
};

// Templates for different deal quality tiers
const HEADLINE_TEMPLATES = {
  excellent: [
    '{product} at {discount}% off - Lowest price ever!',
    'Best deal: {product} for just ₹{price}!',
    '{product} drops to ₹{price} ({discount}% off)',
  ],
  good: [
    '{product} at {discount}% off - Great value',
    'Save ₹{savings} on {product}',
    '{product} now ₹{price} (was ₹{originalPrice})',
  ],
  average: [
    '{product} at ₹{price} ({discount}% off)',
    '{discount}% off on {product}',
    '{product} available at ₹{price}',
  ],
  poor: [
    '{product} at ₹{price}',
    '{product} - Check current price',
  ],
};

export class DealSummarizerService {
  /**
   * Generate a complete summary for a deal
   */
  static async generateSummary(dealId: string): Promise<DealSummary> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Get price history for analysis
    const history = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.dealId, dealId))
      .orderBy(desc(priceHistory.scrapedAt))
      .limit(30);

    // Extract components
    const productName = this.extractProductName(deal.title);
    const valuePoints = this.extractValuePoints(deal.title, deal.description);
    const priceAnalysis = this.analyzePricePosition(deal.price, history);
    const dealTier = this.classifyDealTier(deal, priceAnalysis);
    const headline = this.generateHeadline(deal, productName, dealTier);
    const shortDescription = this.generateShortDescription(deal, productName, valuePoints);
    const { recommendation, reason } = this.generateRecommendation(deal, priceAnalysis, dealTier);
    const highlights = this.generateHighlights(deal, valuePoints, priceAnalysis);

    return {
      headline,
      shortDescription,
      valuePoints,
      priceAnalysis,
      buyRecommendation: recommendation,
      recommendationReason: reason,
      highlights,
    };
  }

  /**
   * Extract clean product name from title
   */
  static extractProductName(title: string): string {
    let clean = title;

    // Remove discount mentions
    clean = clean.replace(/\d+%\s*(off|discount|save)/gi, '');

    // Remove price mentions
    clean = clean.replace(/₹[\d,]+/g, '');
    clean = clean.replace(/Rs\.?\s*[\d,]+/gi, '');
    clean = clean.replace(/INR\s*[\d,]+/gi, '');

    // Remove common noise words
    clean = clean.replace(/\[(.*?)\]/g, ''); // [content in brackets]
    clean = clean.replace(/\((.*?)\)/g, ''); // (content in parens) - if short
    clean = clean.replace(/\b(deal|offer|sale|discount|lowest|best|hot|new)\b/gi, '');
    clean = clean.replace(/\b(price|mrp|was|now|only|just|grab|hurry)\b/gi, '');

    // Remove excessive punctuation and emojis
    clean = clean.replace(/[!]{2,}/g, '');
    clean = clean.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '');

    // Clean up whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Truncate if too long (keep first 80 chars of meaningful content)
    if (clean.length > 80) {
      const words = clean.split(' ');
      clean = '';
      for (const word of words) {
        if (clean.length + word.length + 1 <= 80) {
          clean += (clean ? ' ' : '') + word;
        } else break;
      }
    }

    return clean || title.slice(0, 60);
  }

  /**
   * Extract value points from title and description
   */
  static extractValuePoints(title: string, description?: string | null): string[] {
    const text = `${title} ${description || ''}`.toLowerCase();
    const points: string[] = [];

    for (const [category, keywords] of Object.entries(VALUE_INDICATORS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          switch (category) {
            case 'freeShipping':
              if (!points.includes('Free Shipping')) points.push('Free Shipping');
              break;
            case 'noCostEmi':
              if (!points.includes('No-Cost EMI')) points.push('No-Cost EMI');
              break;
            case 'bankOffers':
              if (!points.includes('Bank Offers Available')) points.push('Bank Offers Available');
              break;
            case 'exchangeOffer':
              if (!points.includes('Exchange Offer')) points.push('Exchange Offer');
              break;
            case 'bundleOffer':
              if (!points.includes('Bundle Deal')) points.push('Bundle Deal');
              break;
            case 'limitedTime':
              if (!points.includes('Limited Time')) points.push('Limited Time');
              break;
            case 'warranty':
              if (!points.includes('Warranty Included')) points.push('Warranty Included');
              break;
            case 'primeExclusive':
              if (!points.includes('Member Exclusive')) points.push('Member Exclusive');
              break;
          }
          break; // Only add once per category
        }
      }
    }

    return points.slice(0, 5); // Max 5 value points
  }

  /**
   * Analyze price position relative to history
   */
  private static analyzePricePosition(
    currentPrice: number,
    history: any[]
  ): DealSummary['priceAnalysis'] {
    if (history.length < 3) {
      return {
        status: 'unknown',
        message: 'Not enough price history available',
      };
    }

    const prices = history.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    if (currentPrice <= minPrice) {
      return {
        status: 'lowest_ever',
        message: 'This is the lowest price we have tracked!',
      };
    }

    const percentBelowAvg = ((avgPrice - currentPrice) / avgPrice) * 100;

    if (percentBelowAvg >= 15) {
      return {
        status: 'below_average',
        message: `${Math.round(percentBelowAvg)}% below the average price of ₹${Math.round(avgPrice)}`,
      };
    }

    if (percentBelowAvg >= -5) {
      return {
        status: 'at_average',
        message: 'Price is around the typical range',
      };
    }

    return {
      status: 'above_average',
      message: `Currently ${Math.round(-percentBelowAvg)}% above average - consider waiting`,
    };
  }

  /**
   * Classify deal into quality tier
   */
  private static classifyDealTier(
    deal: any,
    priceAnalysis: DealSummary['priceAnalysis']
  ): 'excellent' | 'good' | 'average' | 'poor' {
    let score = 0;

    // Discount factor
    if (deal.discountPercentage) {
      if (deal.discountPercentage >= 60) score += 40;
      else if (deal.discountPercentage >= 40) score += 30;
      else if (deal.discountPercentage >= 25) score += 20;
      else if (deal.discountPercentage >= 15) score += 10;
    }

    // Price position factor
    if (priceAnalysis.status === 'lowest_ever') score += 35;
    else if (priceAnalysis.status === 'below_average') score += 20;
    else if (priceAnalysis.status === 'above_average') score -= 15;

    // AI score factor (if available)
    if (deal.aiScore) {
      score += (deal.aiScore / 100) * 25;
    }

    // Verification factor
    if (deal.verified) score += 10;

    if (score >= 70) return 'excellent';
    if (score >= 45) return 'good';
    if (score >= 20) return 'average';
    return 'poor';
  }

  /**
   * Generate headline based on tier and deal data
   */
  private static generateHeadline(
    deal: any,
    productName: string,
    tier: 'excellent' | 'good' | 'average' | 'poor'
  ): string {
    const templates = HEADLINE_TEMPLATES[tier];
    const template = templates[Math.floor(Math.random() * templates.length)];

    return template
      .replace('{product}', productName)
      .replace('{price}', deal.price.toLocaleString('en-IN'))
      .replace('{originalPrice}', (deal.originalPrice || deal.price).toLocaleString('en-IN'))
      .replace('{discount}', String(deal.discountPercentage || 0))
      .replace('{savings}', ((deal.originalPrice || deal.price) - deal.price).toLocaleString('en-IN'));
  }

  /**
   * Generate short description
   */
  private static generateShortDescription(
    deal: any,
    productName: string,
    valuePoints: string[]
  ): string {
    let desc = `Get the ${productName} for ₹${deal.price.toLocaleString('en-IN')}`;

    if (deal.originalPrice && deal.discountPercentage) {
      desc += ` (${deal.discountPercentage}% off MRP ₹${deal.originalPrice.toLocaleString('en-IN')})`;
    }

    if (valuePoints.length > 0) {
      desc += `. ${valuePoints.slice(0, 2).join(', ')}`;
    }

    desc += ` from ${deal.merchant}.`;

    return desc;
  }

  /**
   * Generate buy recommendation
   */
  private static generateRecommendation(
    deal: any,
    priceAnalysis: DealSummary['priceAnalysis'],
    tier: 'excellent' | 'good' | 'average' | 'poor'
  ): { recommendation: 'buy_now' | 'wait' | 'skip'; reason: string } {
    // Excellent deal at lowest price
    if (tier === 'excellent' && priceAnalysis.status === 'lowest_ever') {
      return {
        recommendation: 'buy_now',
        reason: 'Excellent deal at the lowest price recorded. Buy now before it goes up!',
      };
    }

    // Good deal below average
    if ((tier === 'excellent' || tier === 'good') && priceAnalysis.status !== 'above_average') {
      return {
        recommendation: 'buy_now',
        reason: 'Good value at current price. Worth buying if you need it.',
      };
    }

    // Average deal at average price
    if (tier === 'average' && priceAnalysis.status === 'at_average') {
      return {
        recommendation: 'wait',
        reason: 'Price is typical. Consider waiting for a better deal.',
      };
    }

    // Above average price
    if (priceAnalysis.status === 'above_average') {
      return {
        recommendation: 'wait',
        reason: 'Price is higher than usual. Wait for a price drop.',
      };
    }

    // Poor deal
    if (tier === 'poor') {
      return {
        recommendation: 'skip',
        reason: 'Limited value. Look for better deals elsewhere.',
      };
    }

    // Default
    return {
      recommendation: 'buy_now',
      reason: 'Decent deal if you need the product.',
    };
  }

  /**
   * Generate highlight bullets
   */
  private static generateHighlights(
    deal: any,
    valuePoints: string[],
    priceAnalysis: DealSummary['priceAnalysis']
  ): string[] {
    const highlights: string[] = [];

    // Price highlight
    if (priceAnalysis.status === 'lowest_ever') {
      highlights.push('🏷️ Lowest price recorded');
    } else if (priceAnalysis.status === 'below_average') {
      highlights.push('📉 Below average price');
    }

    // Discount highlight
    if (deal.discountPercentage >= 50) {
      highlights.push(`💰 ${deal.discountPercentage}% discount`);
    }

    // Savings highlight
    if (deal.originalPrice && deal.originalPrice - deal.price >= 5000) {
      highlights.push(`💵 Save ₹${(deal.originalPrice - deal.price).toLocaleString('en-IN')}`);
    }

    // Verification highlight
    if (deal.verified) {
      highlights.push('✅ Price verified');
    }

    // AI score highlight
    if (deal.aiScore >= 80) {
      highlights.push('⭐ Highly rated deal');
    }

    // Value points as highlights
    for (const point of valuePoints.slice(0, 2)) {
      if (point === 'Free Shipping') highlights.push('🚚 Free shipping');
      else if (point === 'No-Cost EMI') highlights.push('💳 No-cost EMI available');
      else if (point === 'Bank Offers Available') highlights.push('🏦 Bank offers available');
    }

    return highlights.slice(0, 5);
  }

  /**
   * Save summary to deal
   */
  static async saveSummary(dealId: string, summary: DealSummary): Promise<void> {
    await db
      .update(deals)
      .set({
        aiSummary: summary,
        aiSummaryUpdatedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(deals.id, dealId));
  }

  /**
   * Generate and save summary
   */
  static async generateAndSave(dealId: string): Promise<DealSummary> {
    const summary = await this.generateSummary(dealId);
    await this.saveSummary(dealId, summary);
    return summary;
  }

  /**
   * Get cached summary from deal
   */
  static async getCachedSummary(dealId: string): Promise<DealSummary | null> {
    const [deal] = await db
      .select({ aiSummary: deals.aiSummary, aiSummaryUpdatedAt: deals.aiSummaryUpdatedAt })
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal || !deal.aiSummary) return null;

    // Check if summary is stale (older than 6 hours)
    if (deal.aiSummaryUpdatedAt) {
      const ageHours = (Date.now() - new Date(deal.aiSummaryUpdatedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours > 6) {
        // Refresh summary
        return this.generateAndSave(dealId);
      }
    }

    return deal.aiSummary as DealSummary;
  }

  /**
   * Batch generate summaries
   */
  static async batchGenerateSummaries(dealIds: string[]): Promise<Map<string, DealSummary>> {
    const results = new Map<string, DealSummary>();

    for (const dealId of dealIds) {
      try {
        const summary = await this.generateAndSave(dealId);
        results.set(dealId, summary);
      } catch (error) {
        console.error(`Error generating summary for deal ${dealId}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate quick headline only (for list views)
   */
  static async generateQuickHeadline(dealId: string): Promise<string> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) return '';

    const productName = this.extractProductName(deal.title);
    const tier = deal.aiScore && deal.aiScore >= 70 ? 'good' : 'average';

    return this.generateHeadline(deal, productName, tier);
  }
}

export const dealSummarizerService = DealSummarizerService;
