import { db } from '../../db/index.js';
import { deals, fraudAnalysis, merchantRiskProfiles, users } from '../../db/schema.js';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';

/**
 * AI-Powered Fraud Detection Service (Cost-Free)
 *
 * Detects suspicious deals using local algorithms:
 * 1. Price Anomaly Detection - Z-score analysis against merchant/category averages
 * 2. Title Pattern Analysis - Regex matching for spam indicators
 * 3. Velocity Detection - Too many similar deals from same user/merchant
 * 4. Merchant Risk Profiling - Historical performance analysis
 *
 * All algorithms run locally - NO external API calls.
 */

export interface FraudAnalysisResult {
  overallRiskScore: number; // 0-100, higher = more risky
  priceAnomalyScore: number;
  titleSuspicionScore: number;
  velocityScore: number;
  merchantRiskScore: number;
  flags: string[];
  autoAction: 'none' | 'flag' | 'hide' | 'delete';
  recommendation: string;
}

// Suspicious patterns in titles
const SUSPICIOUS_PATTERNS: Record<string, RegExp> = {
  urgency_spam: /\b(hurry|limited|only \d+ left|fast|quick|rush|grab now|last chance|ending soon)\b/gi,
  fake_discount: /\b(99%|98%|97%|96%|95%)\s*(off|discount)\b/i,
  suspicious_claims: /\b(guaranteed|100% free|free gift|bonus|prize|winner|won|lottery)\b/gi,
  spam_formatting: /[!]{3,}|[🔥]{3,}|[⚡]{3,}|[💰]{3,}|[🎁]{3,}/g,
  placeholder_price: /₹\s*[01]\b|price\s*:\s*[01]\b/gi,
  excessive_emoji: /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, // Emoji range (ES5 compatible)
  all_caps_abuse: /[A-Z]{10,}/g, // 10+ consecutive capitals
  repetitive_text: /(.)\1{5,}/g, // Same character 5+ times
};

// Trusted merchants with lower base risk
const TRUSTED_MERCHANTS: Record<string, number> = {
  'amazon': 10,
  'flipkart': 10,
  'myntra': 15,
  'ajio': 15,
  'nykaa': 15,
  'tata cliq': 15,
  'croma': 15,
  'reliance digital': 15,
  'vijay sales': 20,
  'snapdeal': 25,
  'meesho': 30,
};

export class FraudDetectionService {
  /**
   * Analyze a deal for potential fraud
   */
  static async analyzeDeal(dealId: string): Promise<FraudAnalysisResult> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      throw new Error('Deal not found');
    }

    // Run all fraud checks in parallel
    const [priceAnomalyScore, titleSuspicionScore, velocityScore, merchantRiskScore] = await Promise.all([
      this.detectPriceAnomaly(deal),
      this.analyzeTitlePatterns(deal.title, deal.description),
      this.detectVelocityAnomaly(deal),
      this.analyzeMerchantRisk(deal.merchant),
    ]);

    // Collect all flags
    const flags: string[] = [];

    if (priceAnomalyScore >= 70) flags.push('price_anomaly');
    if (priceAnomalyScore >= 50) flags.push('suspicious_price');
    if (titleSuspicionScore >= 60) flags.push('spam_title');
    if (titleSuspicionScore >= 40) flags.push('suspicious_title');
    if (velocityScore >= 70) flags.push('high_volume_spam');
    if (velocityScore >= 50) flags.push('velocity_warning');
    if (merchantRiskScore >= 70) flags.push('risky_merchant');
    if (merchantRiskScore >= 50) flags.push('unknown_merchant');

    // Calculate weighted overall risk score
    const overallRiskScore = Math.round(
      priceAnomalyScore * 0.30 +
      titleSuspicionScore * 0.25 +
      velocityScore * 0.25 +
      merchantRiskScore * 0.20
    );

    // Determine auto action
    let autoAction: 'none' | 'flag' | 'hide' | 'delete' = 'none';
    if (overallRiskScore >= 80) {
      autoAction = 'hide';
    } else if (overallRiskScore >= 60) {
      autoAction = 'flag';
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(overallRiskScore, flags);

    return {
      overallRiskScore,
      priceAnomalyScore,
      titleSuspicionScore,
      velocityScore,
      merchantRiskScore,
      flags,
      autoAction,
      recommendation,
    };
  }

  /**
   * Price Anomaly Detection using Z-score analysis
   * Compares deal price against merchant/category averages
   */
  private static async detectPriceAnomaly(deal: any): Promise<number> {
    let score = 0;
    const flags: string[] = [];

    // Check 1: Suspiciously high discount
    if (deal.discountPercentage) {
      if (deal.discountPercentage >= 95) {
        score += 50; // Very suspicious
        flags.push('extreme_discount');
      } else if (deal.discountPercentage >= 90) {
        score += 35;
        flags.push('very_high_discount');
      } else if (deal.discountPercentage >= 85) {
        score += 20;
      }
    }

    // Check 2: Price ratio anomaly
    if (deal.originalPrice && deal.price > 0) {
      const ratio = deal.originalPrice / deal.price;
      if (ratio > 50) {
        score += 40; // 50x price difference is suspicious
        flags.push('extreme_ratio');
      } else if (ratio > 20) {
        score += 25;
      } else if (ratio > 10) {
        score += 10;
      }
    }

    // Check 3: Unrealistic original price
    if (deal.originalPrice && deal.originalPrice > 5000000) { // > ₹50,000
      if (deal.price < 100000) { // < ₹1,000
        score += 30; // ₹50k+ item for < ₹1k is suspicious
        flags.push('unrealistic_original');
      }
    }

    // Check 4: Z-score analysis against category average
    try {
      const categoryDeals = await db
        .select({ price: deals.price })
        .from(deals)
        .where(
          and(
            eq(deals.categoryId, deal.categoryId),
            eq(deals.isExpired, false)
          )
        )
        .limit(100);

      if (categoryDeals.length >= 10) {
        const prices = categoryDeals.map(d => d.price);
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const stdDev = Math.sqrt(
          prices.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / prices.length
        );

        if (stdDev > 0) {
          const zScore = (deal.price - mean) / stdDev;

          // Price is suspicious if too far below mean (too good to be true)
          if (zScore < -3) {
            score += 25;
            flags.push('statistical_anomaly');
          } else if (zScore < -2.5) {
            score += 15;
          } else if (zScore < -2) {
            score += 8;
          }
        }
      }
    } catch (error) {
      // Skip Z-score on error
    }

    // Check 5: Very low absolute price for typically expensive items
    if (deal.price < 10000 && deal.originalPrice > 1000000) { // < ₹100 with original > ₹10k
      score += 20;
      flags.push('low_price_high_original');
    }

    return Math.min(100, score);
  }

  /**
   * Title Pattern Analysis
   * Detects spam-like patterns in deal titles
   */
  private static async analyzeTitlePatterns(title: string, description?: string | null): Promise<number> {
    let score = 0;
    const text = `${title} ${description || ''}`;

    // Check each suspicious pattern
    for (const [patternName, regex] of Object.entries(SUSPICIOUS_PATTERNS)) {
      const matches = text.match(regex);
      if (matches) {
        const matchCount = matches.length;

        switch (patternName) {
          case 'fake_discount':
            score += 30; // Strong indicator
            break;
          case 'suspicious_claims':
            score += matchCount * 8;
            break;
          case 'spam_formatting':
            score += matchCount * 5;
            break;
          case 'urgency_spam':
            score += matchCount * 4;
            break;
          case 'placeholder_price':
            score += 25;
            break;
          case 'all_caps_abuse':
            score += matchCount * 6;
            break;
          case 'repetitive_text':
            score += matchCount * 8;
            break;
          case 'excessive_emoji':
            // Allow some emojis, penalize excessive use
            if (matchCount > 10) {
              score += (matchCount - 10) * 2;
            }
            break;
        }
      }
    }

    // Check for ALL CAPS abuse (more than 50% caps in title)
    const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
    if (capsRatio > 0.6 && title.length > 20) {
      score += 15;
    } else if (capsRatio > 0.4 && title.length > 30) {
      score += 8;
    }

    // Check for very short titles (potential spam)
    if (title.length < 15) {
      score += 10;
    }

    // Check for very long titles (potential keyword stuffing)
    if (title.length > 200) {
      score += 15;
    }

    // Check for URL-like content in title (spam indicator)
    if (/https?:\/\/|www\.|\.com|\.in/gi.test(title)) {
      score += 20;
    }

    // Check for phone numbers or contact info
    if (/(\+91|91)?[\s-]?\d{10}|whatsapp|telegram|call/gi.test(text)) {
      score += 25;
    }

    return Math.min(100, score);
  }

  /**
   * Velocity Detection
   * Detects users posting too many similar deals
   */
  private static async detectVelocityAnomaly(deal: any): Promise<number> {
    let score = 0;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Check deals from same user in last hour
      const recentUserDeals = await db
        .select({ id: deals.id, title: deals.title })
        .from(deals)
        .where(
          and(
            eq(deals.userId, deal.userId),
            gte(deals.createdAt, oneHourAgo)
          )
        )
        .limit(50);

      // More than 10 deals in an hour is suspicious
      if (recentUserDeals.length > 20) {
        score += 50;
      } else if (recentUserDeals.length > 10) {
        score += 30;
      } else if (recentUserDeals.length > 5) {
        score += 10;
      }

      // Check for similar titles from same user (potential spam)
      const similarDeals = recentUserDeals.filter(d =>
        this.calculateTitleSimilarity(deal.title, d.title) > 0.7
      );

      if (similarDeals.length > 5) {
        score += 40;
      } else if (similarDeals.length > 3) {
        score += 25;
      } else if (similarDeals.length > 1) {
        score += 10;
      }

      // Check deals from same merchant in last day
      const recentMerchantDeals = await db
        .select({ id: deals.id })
        .from(deals)
        .where(
          and(
            eq(deals.merchant, deal.merchant),
            gte(deals.createdAt, oneDayAgo)
          )
        )
        .limit(200);

      // Many deals from same merchant from different users could indicate coordinated spam
      // But also could be legitimate (e.g., Amazon sale)
      // Only flag if it's from untrusted merchant
      const merchantLower = deal.merchant?.toLowerCase() || '';
      const isTrustedMerchant = Object.keys(TRUSTED_MERCHANTS).some(m => merchantLower.includes(m));

      if (!isTrustedMerchant && recentMerchantDeals.length > 50) {
        score += 15;
      }

    } catch (error) {
      console.error('Error in velocity detection:', error);
    }

    // Check user account age (new accounts with high activity are suspicious)
    try {
      const [user] = await db
        .select({ createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, deal.userId))
        .limit(1);

      if (user) {
        const accountAgeHours = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60);

        // New account (< 24 hours) posting multiple deals
        if (accountAgeHours < 24 && score > 0) {
          score = Math.round(score * 1.5); // 50% penalty multiplier
        } else if (accountAgeHours < 168) { // < 1 week
          score = Math.round(score * 1.2); // 20% penalty
        }
      }
    } catch (error) {
      // Skip user age check on error
    }

    return Math.min(100, score);
  }

  /**
   * Merchant Risk Analysis
   * Analyzes merchant's historical performance
   */
  private static async analyzeMerchantRisk(merchantName: string): Promise<number> {
    if (!merchantName) return 70; // No merchant = high risk

    const merchantLower = merchantName.toLowerCase();

    // Check trusted merchants first
    for (const [trustedName, baseRisk] of Object.entries(TRUSTED_MERCHANTS)) {
      if (merchantLower.includes(trustedName)) {
        return baseRisk; // Return low risk for trusted merchants
      }
    }

    try {
      // Check if we have a risk profile for this merchant
      const [existingProfile] = await db
        .select()
        .from(merchantRiskProfiles)
        .where(eq(merchantRiskProfiles.merchantName, merchantName))
        .limit(1);

      if (existingProfile) {
        return existingProfile.riskScore;
      }

      // Calculate risk from merchant's deal history
      const merchantDeals = await db
        .select({
          verified: deals.verified,
          isExpired: deals.isExpired,
          autoFlagged: deals.autoFlagged,
          upvotes: deals.upvotes,
          downvotes: deals.downvotes,
          createdAt: deals.createdAt,
        })
        .from(deals)
        .where(eq(deals.merchant, merchantName))
        .orderBy(desc(deals.createdAt))
        .limit(100);

      if (merchantDeals.length === 0) {
        return 50; // New merchant - moderate risk
      }

      let riskScore = 50; // Base risk for unknown merchants

      // Calculate metrics
      const flaggedCount = merchantDeals.filter(d => d.autoFlagged).length;
      const expiredQuickly = merchantDeals.filter(d => {
        const ageHours = (Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
        return d.isExpired && ageHours < 24;
      }).length;
      const verifiedCount = merchantDeals.filter(d => d.verified).length;

      // Adjust risk based on metrics
      const flagRate = flaggedCount / merchantDeals.length;
      const quickExpireRate = expiredQuickly / merchantDeals.length;
      const verificationRate = verifiedCount / merchantDeals.length;

      // High flag rate increases risk
      if (flagRate > 0.3) riskScore += 25;
      else if (flagRate > 0.1) riskScore += 10;

      // Quick expiration increases risk
      if (quickExpireRate > 0.5) riskScore += 20;
      else if (quickExpireRate > 0.2) riskScore += 10;

      // Good verification rate decreases risk
      if (verificationRate > 0.7) riskScore -= 20;
      else if (verificationRate > 0.5) riskScore -= 10;

      // Check voting patterns
      const totalUpvotes = merchantDeals.reduce((sum, d) => sum + (d.upvotes || 0), 0);
      const totalDownvotes = merchantDeals.reduce((sum, d) => sum + (d.downvotes || 0), 0);
      const totalVotes = totalUpvotes + totalDownvotes;

      if (totalVotes > 10) {
        const positiveRatio = totalUpvotes / totalVotes;
        if (positiveRatio < 0.3) riskScore += 15; // Mostly downvoted
        else if (positiveRatio > 0.7) riskScore -= 10; // Mostly upvoted
      }

      // Save profile for future use
      await this.updateMerchantProfile(merchantName, merchantDeals, Math.max(0, Math.min(100, riskScore)));

      return Math.max(0, Math.min(100, riskScore));

    } catch (error) {
      console.error('Error analyzing merchant risk:', error);
      return 50; // Moderate risk on error
    }
  }

  /**
   * Update or create merchant risk profile
   */
  private static async updateMerchantProfile(
    merchantName: string,
    merchantDeals: any[],
    riskScore: number
  ): Promise<void> {
    try {
      const flaggedCount = merchantDeals.filter(d => d.autoFlagged).length;
      const expiredQuickly = merchantDeals.filter(d => {
        const ageHours = (Date.now() - new Date(d.createdAt).getTime()) / (1000 * 60 * 60);
        return d.isExpired && ageHours < 24;
      }).length;
      const verifiedCount = merchantDeals.filter(d => d.verified).length;

      await db
        .insert(merchantRiskProfiles)
        .values({
          merchantName,
          riskScore,
          totalDeals: merchantDeals.length,
          flaggedDeals: flaggedCount,
          expiredQuickly,
          verificationSuccessRate: Math.round((verifiedCount / merchantDeals.length) * 100),
          lastDealAt: merchantDeals[0]?.createdAt || new Date(),
        } as any)
        .onConflictDoUpdate({
          target: merchantRiskProfiles.merchantName,
          set: {
            riskScore,
            totalDeals: merchantDeals.length,
            flaggedDeals: flaggedCount,
            expiredQuickly,
            verificationSuccessRate: Math.round((verifiedCount / merchantDeals.length) * 100),
            lastDealAt: merchantDeals[0]?.createdAt || new Date(),
            updatedAt: new Date(),
          } as any,
        });
    } catch (error) {
      console.error('Error updating merchant profile:', error);
    }
  }

  /**
   * Calculate title similarity using Jaccard similarity
   */
  private static calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = title2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    let intersectionCount = 0;
    words1.forEach(w => {
      if (set2.has(w)) intersectionCount++;
    });

    const unionCount = new Set([...words1, ...words2]).size;

    return intersectionCount / unionCount;
  }

  /**
   * Generate human-readable recommendation
   */
  private static generateRecommendation(riskScore: number, flags: string[]): string {
    if (riskScore >= 80) {
      return 'High fraud risk detected. Deal should be hidden and reviewed manually.';
    } else if (riskScore >= 60) {
      return 'Moderate fraud risk. Deal flagged for review. Flags: ' + flags.join(', ');
    } else if (riskScore >= 40) {
      return 'Low-moderate risk. Some suspicious patterns detected but likely legitimate.';
    } else if (riskScore >= 20) {
      return 'Low risk. Deal appears legitimate with minor concerns.';
    }
    return 'Very low risk. Deal appears legitimate.';
  }

  /**
   * Save fraud analysis to database
   */
  static async saveFraudAnalysis(dealId: string, analysis: FraudAnalysisResult): Promise<void> {
    await db
      .insert(fraudAnalysis)
      .values({
        dealId,
        overallRiskScore: analysis.overallRiskScore,
        priceAnomalyScore: analysis.priceAnomalyScore,
        titleSuspicionScore: analysis.titleSuspicionScore,
        velocityScore: analysis.velocityScore,
        merchantRiskScore: analysis.merchantRiskScore,
        flags: analysis.flags,
        autoAction: analysis.autoAction,
      } as any)
      .onConflictDoUpdate({
        target: fraudAnalysis.dealId,
        set: {
          overallRiskScore: analysis.overallRiskScore,
          priceAnomalyScore: analysis.priceAnomalyScore,
          titleSuspicionScore: analysis.titleSuspicionScore,
          velocityScore: analysis.velocityScore,
          merchantRiskScore: analysis.merchantRiskScore,
          flags: analysis.flags,
          autoAction: analysis.autoAction,
          updatedAt: new Date(),
        } as any,
      });

    // Also update the deal's fraud risk score
    await db
      .update(deals)
      .set({
        fraudRiskScore: analysis.overallRiskScore,
        autoFlagged: analysis.autoAction !== 'none',
        flagReason: analysis.flags.length > 0 ? analysis.flags.join(', ') : null,
        updatedAt: new Date(),
      } as any)
      .where(eq(deals.id, dealId));
  }

  /**
   * Analyze and save fraud analysis for a deal
   */
  static async analyzeAndSave(dealId: string): Promise<FraudAnalysisResult> {
    const analysis = await this.analyzeDeal(dealId);
    await this.saveFraudAnalysis(dealId, analysis);
    return analysis;
  }

  /**
   * Get fraud analysis for a deal
   */
  static async getFraudAnalysis(dealId: string): Promise<FraudAnalysisResult | null> {
    const [existing] = await db
      .select()
      .from(fraudAnalysis)
      .where(eq(fraudAnalysis.dealId, dealId))
      .limit(1);

    if (!existing) return null;

    return {
      overallRiskScore: existing.overallRiskScore,
      priceAnomalyScore: existing.priceAnomalyScore || 0,
      titleSuspicionScore: existing.titleSuspicionScore || 0,
      velocityScore: existing.velocityScore || 0,
      merchantRiskScore: existing.merchantRiskScore || 0,
      flags: (existing.flags as string[]) || [],
      autoAction: (existing.autoAction as 'none' | 'flag' | 'hide' | 'delete') || 'none',
      recommendation: this.generateRecommendation(
        existing.overallRiskScore,
        (existing.flags as string[]) || []
      ),
    };
  }

  /**
   * Batch analyze multiple deals
   */
  static async batchAnalyze(dealIds: string[]): Promise<Map<string, FraudAnalysisResult>> {
    const results = new Map<string, FraudAnalysisResult>();

    for (const dealId of dealIds) {
      try {
        const analysis = await this.analyzeAndSave(dealId);
        results.set(dealId, analysis);
      } catch (error) {
        console.error(`Error analyzing deal ${dealId}:`, error);
      }
    }

    return results;
  }

  /**
   * Get high-risk deals for review
   */
  static async getHighRiskDeals(limit: number = 50): Promise<any[]> {
    return db
      .select()
      .from(fraudAnalysis)
      .where(gte(fraudAnalysis.overallRiskScore, 60))
      .orderBy(desc(fraudAnalysis.overallRiskScore))
      .limit(limit);
  }
}

export const fraudDetectionService = FraudDetectionService;
