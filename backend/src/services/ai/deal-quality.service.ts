import { db } from '../../db';
import { deals, priceHistory, votes, comments, users } from '../../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * AI Quality Scoring Service
 *
 * Calculates intelligent quality scores for deals based on multiple factors:
 * - Discount percentage (30%)
 * - Price history (25%)
 * - Merchant reputation (20%)
 * - User engagement (15%)
 * - Deal freshness (10%)
 */
export class DealQualityService {
  /**
   * Calculate comprehensive quality score for a deal
   */
  static async calculateScore(dealId: string): Promise<{
    totalScore: number;
    breakdown: {
      discount: number;
      priceHistory: number;
      merchant: number;
      engagement: number;
      freshness: number;
    };
    badges: string[];
  }> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      throw new Error('Deal not found');
    }

    const breakdown = {
      discount: await this.calculateDiscountScore(deal),
      priceHistory: await this.calculatePriceHistoryScore(dealId, deal.price),
      merchant: await this.calculateMerchantScore(deal.merchant),
      engagement: await this.calculateEngagementScore(dealId, deal),
      freshness: this.calculateFreshnessScore(deal.createdAt),
    };

    // Weighted total (out of 100)
    const totalScore = Math.round(
      breakdown.discount * 0.3 +
      breakdown.priceHistory * 0.25 +
      breakdown.merchant * 0.2 +
      breakdown.engagement * 0.15 +
      breakdown.freshness * 0.1
    );

    // Generate badges based on scores
    const badges = this.generateBadges(totalScore, breakdown, deal);

    return {
      totalScore: Math.min(100, totalScore), // Cap at 100
      breakdown,
      badges,
    };
  }

  /**
   * Discount Score (0-100)
   * Higher discount = higher score
   */
  private static async calculateDiscountScore(deal: any): Promise<number> {
    if (!deal.discountPercentage || deal.discountPercentage <= 0) {
      return 0;
    }

    // Scoring tiers:
    // 0-10%: 0-20 points
    // 10-25%: 20-40 points
    // 25-50%: 40-70 points
    // 50-75%: 70-90 points
    // 75%+: 90-100 points

    const discount = deal.discountPercentage;

    if (discount >= 75) return 100;
    if (discount >= 50) return 70 + ((discount - 50) / 25) * 30; // 70-100
    if (discount >= 25) return 40 + ((discount - 25) / 25) * 30; // 40-70
    if (discount >= 10) return 20 + ((discount - 10) / 15) * 20; // 20-40
    return (discount / 10) * 20; // 0-20
  }

  /**
   * Price History Score (0-100)
   * Historical low price = high score
   */
  private static async calculatePriceHistoryScore(dealId: string, currentPrice: number): Promise<number> {
    try {
      // Get price history for this deal
      const history = await db
        .select()
        .from(priceHistory)
        .where(eq(priceHistory.dealId, dealId))
        .orderBy(desc(priceHistory.scrapedAt))
        .limit(30); // Last 30 price points

      if (history.length === 0) {
        return 50; // Neutral score for new deals
      }

      const prices = history.map((h) => h.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      // Score based on how current price compares to history
      if (currentPrice === minPrice) {
        return 100; // Historical low
      }

      if (maxPrice === minPrice) {
        return 50; // No variation in price
      }

      // Linear interpolation between min and max
      const scoreFromRange = 100 - ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;

      // Bonus if significantly below average
      const belowAvgPercent = ((avgPrice - currentPrice) / avgPrice) * 100;
      const avgBonus = Math.max(0, Math.min(20, belowAvgPercent * 2)); // Up to 20 bonus points

      return Math.min(100, scoreFromRange + avgBonus);
    } catch (error) {
      console.error('Error calculating price history score:', error);
      return 50; // Neutral score on error
    }
  }

  /**
   * Merchant Reputation Score (0-100)
   * Based on overall merchant performance
   */
  private static async calculateMerchantScore(merchantName: string): Promise<number> {
    try {
      // Get all deals from this merchant
      const merchantDeals = await db
        .select({
          upvotes: deals.upvotes,
          downvotes: deals.downvotes,
          verified: deals.verified,
        })
        .from(deals)
        .where(eq(deals.merchant, merchantName))
        .limit(100); // Sample last 100 deals

      if (merchantDeals.length === 0) {
        return 50; // Neutral score for new merchant
      }

      // Calculate metrics
      const totalVotes = merchantDeals.reduce((sum, d) => sum + d.upvotes + d.downvotes, 0);
      const totalUpvotes = merchantDeals.reduce((sum, d) => sum + d.upvotes, 0);
      const verifiedCount = merchantDeals.filter((d) => d.verified).length;

      // Positive vote ratio
      const voteRatio = totalVotes > 0 ? (totalUpvotes / totalVotes) * 100 : 50;

      // Verification rate
      const verificationRate = (verifiedCount / merchantDeals.length) * 100;

      // Weighted score
      const score = voteRatio * 0.6 + verificationRate * 0.4;

      return Math.round(Math.min(100, score));
    } catch (error) {
      console.error('Error calculating merchant score:', error);
      return 50;
    }
  }

  /**
   * User Engagement Score (0-100)
   * Based on votes, comments, views
   */
  private static async calculateEngagementScore(dealId: string, deal: any): Promise<number> {
    try {
      // Get engagement metrics
      const upvotes = deal.upvotes || 0;
      const downvotes = deal.downvotes || 0;
      const commentCount = deal.commentCount || 0;
      const viewCount = deal.viewCount || 0;

      const totalVotes = upvotes + downvotes;

      // Vote ratio (0-40 points)
      let voteScore = 0;
      if (totalVotes > 0) {
        const voteRatio = upvotes / totalVotes;
        voteScore = voteRatio * 40;
      }

      // Comment engagement (0-30 points)
      const commentScore = Math.min(30, commentCount * 3); // 3 points per comment, max 30

      // View engagement (0-30 points)
      const viewScore = Math.min(30, (viewCount / 100) * 30); // Scale to 30 points

      return Math.round(voteScore + commentScore + viewScore);
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return 0;
    }
  }

  /**
   * Freshness Score (0-100)
   * Newer deals score higher
   */
  private static calculateFreshnessScore(createdAt: Date): number {
    const now = new Date();
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Scoring tiers:
    // 0-6 hours: 100 points
    // 6-24 hours: 80-100 points
    // 1-3 days: 50-80 points
    // 3-7 days: 20-50 points
    // 7+ days: 0-20 points

    if (ageHours <= 6) return 100;
    if (ageHours <= 24) return 80 + ((24 - ageHours) / 18) * 20; // 80-100
    if (ageHours <= 72) return 50 + ((72 - ageHours) / 48) * 30; // 50-80
    if (ageHours <= 168) return 20 + ((168 - ageHours) / 96) * 30; // 20-50

    const ageDays = ageHours / 24;
    return Math.max(0, 20 - ageDays); // Decreases after 7 days
  }

  /**
   * Generate badge labels based on scores
   */
  private static generateBadges(totalScore: number, breakdown: any, deal: any): string[] {
    const badges: string[] = [];

    // Overall quality badges
    if (totalScore >= 90) badges.push('⭐ Exceptional Deal');
    else if (totalScore >= 75) badges.push('🔥 Hot Deal');
    else if (totalScore >= 60) badges.push('👍 Good Deal');

    // Specific attribute badges
    if (breakdown.discount >= 80) badges.push('💰 Massive Discount');
    if (breakdown.priceHistory >= 90) badges.push('📉 Historical Low');
    if (breakdown.merchant >= 80) badges.push('✅ Trusted Merchant');
    if (breakdown.engagement >= 70) badges.push('❤️ Community Favorite');
    if (breakdown.freshness >= 90) badges.push('🆕 Just Posted');

    // Special deal characteristics
    if (deal.verified) badges.push('🤖 AI Verified');
    if (deal.discountPercentage && deal.discountPercentage >= 70) badges.push('🎯 Steal Deal');
    if (deal.isFeatured) badges.push('⭐ Featured');

    return badges;
  }

  /**
   * Batch calculate scores for multiple deals
   */
  static async calculateBatchScores(dealIds: string[]): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    for (const dealId of dealIds) {
      try {
        const { totalScore } = await this.calculateScore(dealId);
        scores.set(dealId, totalScore);
      } catch (error) {
        console.error(`Error calculating score for deal ${dealId}:`, error);
        scores.set(dealId, 50); // Default neutral score
      }
    }

    return scores;
  }

  /**
   * Get recommended deals based on quality scores
   */
  static async getTopQualityDeals(limit: number = 20): Promise<any[]> {
    try {
      // Get recent deals with good discounts
      const candidateDeals = await db
        .select()
        .from(deals)
        .where(
          and(
            eq(deals.isExpired, false),
            sql`${deals.discountPercentage} >= 20`
          )
        )
        .orderBy(desc(deals.createdAt))
        .limit(100); // Get larger sample to score

      // Calculate scores for candidates
      const scoredDeals = await Promise.all(
        candidateDeals.map(async (deal) => {
          const { totalScore, badges } = await this.calculateScore(deal.id);
          return { ...deal, aiQualityScore: totalScore, aiBadges: badges };
        })
      );

      // Sort by score and return top deals
      return scoredDeals
        .sort((a, b) => b.aiQualityScore - a.aiQualityScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top quality deals:', error);
      return [];
    }
  }

  /**
   * Recalculate score for existing deal (e.g., after new price update)
   */
  static async recalculateScore(dealId: string): Promise<void> {
    try {
      const { totalScore } = await this.calculateScore(dealId);

      // Store score in database (if you add aiQualityScore field to deals table)
      // await db.update(deals).set({ aiQualityScore: totalScore }).where(eq(deals.id, dealId));

      console.log(`[DealQuality] Recalculated score for deal ${dealId}: ${totalScore}/100`);
    } catch (error) {
      console.error(`[DealQuality] Error recalculating score for deal ${dealId}:`, error);
    }
  }
}

export const dealQualityService = DealQualityService;
