import { db } from '../../db';
import { deals, priceHistory, votes, comments, users } from '../../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * AI-Powered Deal Quality Scoring Service
 *
 * Smart scoring algorithm that mimics how savvy shoppers evaluate deals:
 * 1. Value Proposition (40%) - Is this actually a good price?
 * 2. Deal Authenticity (25%) - Can I trust this deal?
 * 3. Urgency & Scarcity (20%) - Should I act now?
 * 4. Social Proof (15%) - Do others trust this?
 */
export class DealQualityService {
  /**
   * Calculate AI quality score for a deal
   */
  static async calculateScore(dealId: string): Promise<{
    totalScore: number;
    breakdown: {
      valueProp: number;
      authenticity: number;
      urgency: number;
      socialProof: number;
    };
    badges: string[];
    reasoning: string;
  }> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      throw new Error('Deal not found');
    }

    const breakdown = {
      valueProp: await this.calculateValueProposition(dealId, deal),
      authenticity: await this.calculateAuthenticity(deal),
      urgency: await this.calculateUrgency(dealId, deal),
      socialProof: await this.calculateSocialProof(dealId, deal),
    };

    // Weighted total (out of 100)
    const totalScore = Math.round(
      breakdown.valueProp * 0.40 +
      breakdown.authenticity * 0.25 +
      breakdown.urgency * 0.20 +
      breakdown.socialProof * 0.15
    );

    // Generate badges and reasoning
    const badges = this.generateBadges(totalScore, breakdown, deal);
    const reasoning = this.generateReasoning(totalScore, breakdown, deal);

    return {
      totalScore: Math.min(100, totalScore),
      breakdown,
      badges,
      reasoning,
    };
  }

  /**
   * Value Proposition Score (0-100)
   * Assesses if this is genuinely a good deal based on:
   * - Price discount depth
   * - Historical price comparison
   * - Price-to-value ratio for category
   */
  private static async calculateValueProposition(dealId: string, deal: any): Promise<number> {
    let score = 0;

    // 1. Discount Quality (0-40 points)
    const discountScore = this.scoreDiscount(deal.discountPercentage, deal.price);
    score += discountScore;

    // 2. Historical Price Analysis (0-40 points)
    const priceHistoryScore = await this.scorePriceHistory(dealId, deal.price);
    score += priceHistoryScore;

    // 3. Absolute Value Check (0-20 points)
    // Higher-value items get bonus if heavily discounted
    const valueBonus = this.scoreAbsoluteValue(deal.price, deal.originalPrice, deal.discountPercentage);
    score += valueBonus;

    return Math.min(100, score);
  }

  /**
   * Smart discount scoring - not all discounts are equal
   */
  private static scoreDiscount(discountPct: number | null, currentPrice: number): number {
    if (!discountPct || discountPct <= 0) return 0;

    // Base scoring by discount tier
    let score = 0;

    if (discountPct >= 80) {
      score = 40; // Exceptional (but verify authenticity)
    } else if (discountPct >= 60) {
      score = 35; // Excellent
    } else if (discountPct >= 40) {
      score = 28; // Very good
    } else if (discountPct >= 25) {
      score = 20; // Good
    } else if (discountPct >= 15) {
      score = 12; // Decent
    } else {
      score = Math.max(0, discountPct * 0.5); // 0-7.5 points
    }

    // Penalty for suspiciously high discounts on cheap items
    // (e.g., 90% off ₹100 item is less impressive than 50% off ₹50,000)
    if (discountPct > 70 && currentPrice < 1000) {
      score *= 0.7; // 30% penalty
    }

    return Math.round(score);
  }

  /**
   * Score based on price history - is this actually the best price?
   */
  private static async scorePriceHistory(dealId: string, currentPrice: number): Promise<number> {
    try {
      const history = await db
        .select()
        .from(priceHistory)
        .where(eq(priceHistory.dealId, dealId))
        .orderBy(desc(priceHistory.scrapedAt))
        .limit(90); // 3 months of data

      if (history.length < 3) {
        return 20; // New deal, neutral score
      }

      const prices = history.map(h => h.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const medianPrice = this.calculateMedian(prices);

      // Is this the all-time low?
      if (currentPrice === minPrice) {
        return 40; // Maximum score
      }

      // How does it compare to typical price?
      const percentBelowMedian = ((medianPrice - currentPrice) / medianPrice) * 100;

      if (percentBelowMedian >= 30) return 38; // Exceptional vs typical price
      if (percentBelowMedian >= 20) return 32; // Well below typical
      if (percentBelowMedian >= 10) return 25; // Below typical
      if (percentBelowMedian >= 0) return 18;  // At or slightly below typical

      // Above typical price - penalize
      if (percentBelowMedian >= -10) return 10; // Slightly above typical
      return 5; // Well above typical - not a real deal

    } catch (error) {
      console.error('Error scoring price history:', error);
      return 20; // Neutral on error
    }
  }

  /**
   * Bonus for high-value items with good discounts
   */
  private static scoreAbsoluteValue(price: number, originalPrice: number | null, discountPct: number | null): number {
    if (!originalPrice || !discountPct) return 0;

    const savings = originalPrice - price;

    // Bonus scale based on absolute savings
    if (savings >= 50000) return 20;      // ₹50k+ savings
    if (savings >= 20000) return 15;      // ₹20k+ savings
    if (savings >= 10000) return 12;      // ₹10k+ savings
    if (savings >= 5000) return 8;        // ₹5k+ savings
    if (savings >= 2000) return 5;        // ₹2k+ savings
    if (savings >= 1000) return 3;        // ₹1k+ savings

    return 0;
  }

  /**
   * Authenticity Score (0-100)
   * Can we trust this deal is real and accurate?
   */
  private static async calculateAuthenticity(deal: any): Promise<number> {
    let score = 0;

    // 1. Merchant trust (0-40 points)
    const merchantScore = await this.scoreMerchantTrust(deal.merchant);
    score += merchantScore;

    // 2. Deal verification (0-30 points)
    if (deal.verified) {
      score += 30;
    } else if (deal.verificationAttempts > 0 && deal.urlAccessible) {
      score += 20; // Attempted verification, URL works
    } else if (deal.verificationAttempts > 0) {
      score += 5; // Verification attempted but failed
    } else {
      score += 10; // Unverified but not flagged
    }

    // 3. Deal completeness (0-15 points)
    let completeness = 0;
    if (deal.url) completeness += 5;
    if (deal.imageUrl) completeness += 5;
    if (deal.description && deal.description.length > 50) completeness += 5;
    score += completeness;

    // 4. Red flags check (0-15 points)
    let flagPenalty = 0;
    if (deal.autoFlagged) flagPenalty += 10;
    if (!deal.url) flagPenalty += 5;
    if (deal.discountPercentage > 85) flagPenalty += 5; // Suspicious discount

    score -= flagPenalty;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score merchant trustworthiness based on historical performance
   */
  private static async scoreMerchantTrust(merchantName: string): Promise<number> {
    try {
      // Get merchant's deal history
      const merchantDeals = await db
        .select({
          upvotes: deals.upvotes,
          downvotes: deals.downvotes,
          verified: deals.verified,
          isExpired: deals.isExpired,
        })
        .from(deals)
        .where(eq(deals.merchant, merchantName))
        .limit(50); // Last 50 deals

      if (merchantDeals.length === 0) {
        return 20; // New merchant, neutral-low score
      }

      // Calculate metrics
      const totalVotes = merchantDeals.reduce((sum, d) => sum + d.upvotes + d.downvotes, 0);
      const positiveVotes = merchantDeals.reduce((sum, d) => sum + d.upvotes, 0);
      const verifiedCount = merchantDeals.filter(d => d.verified).length;
      const expiredCount = merchantDeals.filter(d => d.isExpired).length;

      // Positive rating percentage
      const positiveRate = totalVotes > 0 ? (positiveVotes / totalVotes) * 100 : 50;

      // Verification rate
      const verificationRate = (verifiedCount / merchantDeals.length) * 100;

      // Deal longevity (lower expiry rate is better)
      const longevityScore = 100 - ((expiredCount / merchantDeals.length) * 100);

      // Weighted combination
      const score = (
        positiveRate * 0.50 +        // 50% weight on user satisfaction
        verificationRate * 0.30 +    // 30% weight on verification
        longevityScore * 0.20         // 20% weight on deal longevity
      );

      return Math.round(Math.min(40, score * 0.4)); // Cap at 40 points

    } catch (error) {
      console.error('Error scoring merchant trust:', error);
      return 20;
    }
  }

  /**
   * Urgency Score (0-100)
   * Should the user act on this deal now?
   */
  private static async calculateUrgency(dealId: string, deal: any): Promise<number> {
    let score = 0;

    // 1. Time sensitivity (0-40 points)
    const freshnessScore = this.scoreFreshness(deal.createdAt);
    score += freshnessScore;

    // 2. Price trend (0-30 points)
    const trendScore = await this.scorePriceTrend(dealId);
    score += trendScore;

    // 3. Expiration urgency (0-30 points)
    if (deal.expiresAt) {
      const expiryScore = this.scoreExpiration(deal.expiresAt);
      score += expiryScore;
    } else {
      score += 15; // No expiry = moderate urgency
    }

    return Math.min(100, score);
  }

  /**
   * Freshness scoring - newer deals create urgency
   */
  private static scoreFreshness(createdAt: Date): number {
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

    if (ageHours <= 2) return 40;        // Just posted
    if (ageHours <= 6) return 35;        // Very fresh
    if (ageHours <= 24) return 28;       // Fresh
    if (ageHours <= 48) return 20;       // Recent
    if (ageHours <= 168) return 12;      // This week

    // Decay after 1 week
    const ageDays = ageHours / 24;
    return Math.max(0, 12 - ageDays);
  }

  /**
   * Price trend analysis - is price dropping or rising?
   */
  private static async scorePriceTrend(dealId: string): Promise<number> {
    try {
      const recent = await db
        .select()
        .from(priceHistory)
        .where(eq(priceHistory.dealId, dealId))
        .orderBy(desc(priceHistory.scrapedAt))
        .limit(10);

      if (recent.length < 3) return 15; // Not enough data

      const prices = recent.map(h => h.price);
      const trend = this.calculateTrend(prices);

      if (trend < -5) return 30;    // Dropping fast - high urgency
      if (trend < -2) return 25;    // Dropping - good urgency
      if (trend < 0) return 20;     // Slight drop
      if (trend === 0) return 15;   // Stable
      if (trend < 2) return 10;     // Rising slightly
      return 5;                     // Rising fast - low urgency

    } catch (error) {
      return 15;
    }
  }

  /**
   * Expiration urgency
   */
  private static scoreExpiration(expiresAt: Date): number {
    const hoursUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilExpiry <= 0) return 0;     // Already expired
    if (hoursUntilExpiry <= 6) return 30;    // Expires very soon
    if (hoursUntilExpiry <= 24) return 25;   // Expires today
    if (hoursUntilExpiry <= 48) return 20;   // Expires in 2 days
    if (hoursUntilExpiry <= 168) return 15;  // Expires this week
    return 10;                               // Expires later
  }

  /**
   * Social Proof Score (0-100)
   * What does the community think?
   */
  private static async calculateSocialProof(dealId: string, deal: any): Promise<number> {
    const upvotes = deal.upvotes || 0;
    const downvotes = deal.downvotes || 0;
    const comments = deal.commentCount || 0;
    const views = deal.viewCount || 0;

    let score = 0;

    // 1. Vote quality (0-50 points)
    const totalVotes = upvotes + downvotes;
    if (totalVotes > 0) {
      const positiveRatio = upvotes / totalVotes;
      const voteScore = positiveRatio * 50;

      // Bonus for high engagement
      if (totalVotes >= 100) score += voteScore * 1.2;
      else if (totalVotes >= 50) score += voteScore * 1.1;
      else if (totalVotes >= 10) score += voteScore;
      else score += voteScore * 0.8; // Penalty for low engagement
    } else {
      score += 25; // Neutral for new deals
    }

    // 2. Discussion quality (0-30 points)
    const commentScore = Math.min(30, comments * 5); // 5 points per comment
    score += commentScore;

    // 3. Interest level (0-20 points)
    const viewScore = Math.min(20, Math.log10(views + 1) * 5);
    score += viewScore;

    return Math.min(100, Math.round(score));
  }

  /**
   * Generate smart badges
   */
  private static generateBadges(totalScore: number, breakdown: any, deal: any): string[] {
    const badges: string[] = [];

    // Overall quality
    if (totalScore >= 90) badges.push('💎 Exceptional Deal');
    else if (totalScore >= 80) badges.push('🔥 Hot Deal');
    else if (totalScore >= 70) badges.push('⭐ Great Deal');
    else if (totalScore >= 60) badges.push('👍 Good Deal');

    // Value-based
    if (breakdown.valueProp >= 85) badges.push('💰 Best Price');
    if (deal.discountPercentage >= 70) badges.push('📉 Huge Discount');

    // Trust-based
    if (breakdown.authenticity >= 85) badges.push('✅ Verified');
    if (deal.verified) badges.push('🤖 AI Verified');

    // Urgency-based
    if (breakdown.urgency >= 85) badges.push('⚡ Act Fast');
    if (breakdown.urgency >= 70) badges.push('⏰ Limited Time');

    // Social proof
    if (breakdown.socialProof >= 80) badges.push('❤️ Community Favorite');
    if ((deal.upvotes || 0) >= 100) badges.push('🌟 Trending');

    return badges.slice(0, 5); // Limit to top 5 badges
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(totalScore: number, breakdown: any, deal: any): string {
    const reasons: string[] = [];

    // Value proposition
    if (breakdown.valueProp >= 80) {
      reasons.push('Excellent price point with strong savings');
    } else if (breakdown.valueProp >= 60) {
      reasons.push('Good value compared to typical pricing');
    } else if (breakdown.valueProp < 40) {
      reasons.push('Price could be better - consider waiting');
    }

    // Authenticity
    if (breakdown.authenticity >= 75) {
      reasons.push('High confidence in deal accuracy');
    } else if (breakdown.authenticity < 50) {
      reasons.push('Limited verification - proceed with caution');
    }

    // Urgency
    if (breakdown.urgency >= 75) {
      reasons.push('Time-sensitive - act quickly');
    } else if (breakdown.urgency < 40) {
      reasons.push('No rush - deal likely to remain available');
    }

    // Social proof
    if (breakdown.socialProof >= 75) {
      reasons.push('Well-received by community');
    } else if (breakdown.socialProof < 35) {
      reasons.push('Limited community feedback available');
    }

    return reasons.join('. ') + '.';
  }

  // Helper methods
  private static calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private static calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    const first = prices[prices.length - 1];
    const last = prices[0];
    return ((last - first) / first) * 100;
  }

  /**
   * Batch calculate scores
   */
  static async calculateBatchScores(dealIds: string[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>();
    for (const dealId of dealIds) {
      try {
        const { totalScore } = await this.calculateScore(dealId);
        scores.set(dealId, totalScore);
      } catch (error) {
        scores.set(dealId, 50);
      }
    }
    return scores;
  }

  /**
   * Get top quality deals
   */
  static async getTopQualityDeals(limit: number = 20): Promise<any[]> {
    try {
      const candidateDeals = await db
        .select()
        .from(deals)
        .where(
          and(
            eq(deals.isExpired, false),
            sql`${deals.discountPercentage} >= 15`
          )
        )
        .orderBy(desc(deals.createdAt))
        .limit(100);

      const scoredDeals = await Promise.all(
        candidateDeals.map(async (deal) => {
          const result = await this.calculateScore(deal.id);
          return {
            ...deal,
            aiQualityScore: result.totalScore,
            aiBadges: result.badges,
            aiReasoning: result.reasoning
          };
        })
      );

      return scoredDeals
        .sort((a, b) => b.aiQualityScore - a.aiQualityScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting top quality deals:', error);
      return [];
    }
  }
}

export const dealQualityService = DealQualityService;
