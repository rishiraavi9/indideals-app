import { db } from '../db/index.js';
import { deals } from '../db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Lightweight ML-based Deal Deduplication Service
 * Uses text similarity algorithms (no external APIs needed)
 */

interface SimilarityResult {
  isDuplicate: boolean;
  similarityScore: number;
  matchedDealId?: string;
  matchedDealPrice?: number;
  reason: string;
}

export class MlDeduplicationService {
  /**
   * Calculate Levenshtein distance between two strings
   * (measures minimum edits needed to transform one string to another)
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate Jaccard similarity between two strings (word-level)
   * Returns score between 0 and 1
   */
  private static jaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Normalize text for comparison (remove emojis, special chars, extra spaces)
   */
  private static normalizeText(text: string): string {
    return text
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Remove emojis
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/🔥|🎁|🔴|⚡/g, '')               // Remove common deal emojis
      .replace(/[^\w\s]/g, ' ')                 // Remove special chars
      .replace(/\s+/g, ' ')                     // Normalize spaces
      .trim()
      .toLowerCase();
  }

  /**
   * Extract key product features from title
   */
  private static extractFeatures(title: string): string[] {
    const normalized = this.normalizeText(title);
    const words = normalized.split(/\s+/);

    // Remove common filler words
    const stopWords = new Set([
      'deal', 'price', 'buy', 'here', 'flat', 'off', 'save', 'now',
      'get', 'offer', 'sale', 'discount', 'limited', 'time', 'only',
      'use', 'code', 'coupon', 'order', 'value', 'min', 'max'
    ]);

    return words.filter(word =>
      word.length > 2 && !stopWords.has(word)
    );
  }

  /**
   * Calculate comprehensive similarity score between two deals
   */
  private static calculateSimilarity(
    newDeal: { title: string; price: number; merchant: string; url?: string | null },
    existingDeal: { title: string; price: number; merchant: string; url?: string | null }
  ): number {
    // 1. URL match (if both have URLs)
    if (newDeal.url && existingDeal.url && newDeal.url === existingDeal.url) {
      return 100; // Exact match
    }

    // 2. Different merchants = not duplicate (unless URL match)
    if (newDeal.merchant !== existingDeal.merchant) {
      return 0;
    }

    // 3. Normalize titles
    const normalizedNew = this.normalizeText(newDeal.title);
    const normalizedExisting = this.normalizeText(existingDeal.title);

    // 4. Extract features
    const featuresNew = this.extractFeatures(newDeal.title);
    const featuresExisting = this.extractFeatures(existingDeal.title);

    // 5. Calculate Jaccard similarity on features
    const jaccardScore = this.jaccardSimilarity(
      featuresNew.join(' '),
      featuresExisting.join(' ')
    );

    // 6. Calculate Levenshtein similarity on normalized titles
    const maxLength = Math.max(normalizedNew.length, normalizedExisting.length);
    const levDistance = this.levenshteinDistance(normalizedNew, normalizedExisting);
    const levSimilarity = 1 - (levDistance / maxLength);

    // 7. Price similarity
    const priceDiff = Math.abs(newDeal.price - existingDeal.price);
    const avgPrice = (newDeal.price + existingDeal.price) / 2;
    const pricePercentDiff = (priceDiff / avgPrice) * 100;
    const priceSimilarity = pricePercentDiff <= 10 ? 1 : (pricePercentDiff <= 20 ? 0.5 : 0);

    // 8. Weighted combination
    const titleWeight = 0.6;
    const featureWeight = 0.3;
    const priceWeight = 0.1;

    const finalScore = (
      (levSimilarity * titleWeight) +
      (jaccardScore * featureWeight) +
      (priceSimilarity * priceWeight)
    ) * 100;

    return Math.round(finalScore);
  }

  /**
   * Check if a new deal is a duplicate of existing deals
   */
  static async checkForDuplicates(
    newDeal: {
      title: string;
      price: number;
      merchant: string;
      url?: string | null;
    }
  ): Promise<SimilarityResult> {
    try {
      // Get recent deals from same merchant (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentDeals = await db
        .select({
          id: deals.id,
          title: deals.title,
          price: deals.price,
          merchant: deals.merchant,
          url: deals.url,
        })
        .from(deals)
        .where(
          and(
            gte(deals.createdAt, sevenDaysAgo),
            eq(deals.merchant, newDeal.merchant)
          )
        )
        .orderBy(desc(deals.createdAt)) // Get most recent deals first
        .limit(100); // Check last 100 deals from same merchant

      if (recentDeals.length === 0) {
        return {
          isDuplicate: false,
          similarityScore: 0,
          reason: 'No recent deals from this merchant',
        };
      }

      // Find most similar deal
      let maxSimilarity = 0;
      let mostSimilarDeal: typeof recentDeals[0] | null = null;

      for (const existingDeal of recentDeals) {
        const similarity = this.calculateSimilarity(newDeal, existingDeal);

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostSimilarDeal = existingDeal;
        }

        // Early exit if exact match
        if (similarity === 100) break;
      }

      // Threshold: 75% or higher = duplicate
      const isDuplicate = maxSimilarity >= 75;

      let reason = '';
      if (isDuplicate && mostSimilarDeal) {
        reason = `Similar to: "${mostSimilarDeal.title.substring(0, 50)}..." (${maxSimilarity}% match)`;
      } else {
        reason = `Unique deal (highest similarity: ${maxSimilarity}%)`;
      }

      logger.info(
        `[ML Dedup] ${newDeal.title.substring(0, 40)}... -> ${isDuplicate ? 'DUPLICATE' : 'UNIQUE'} (${maxSimilarity}%)`
      );

      return {
        isDuplicate,
        similarityScore: maxSimilarity,
        matchedDealId: isDuplicate ? mostSimilarDeal?.id : undefined,
        matchedDealPrice: isDuplicate ? mostSimilarDeal?.price : undefined,
        reason,
      };
    } catch (error: any) {
      logger.error('[ML Dedup] Error checking duplicates:', error.message);
      // Fail open - allow the deal if error
      return {
        isDuplicate: false,
        similarityScore: 0,
        reason: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Batch check multiple deals at once (more efficient)
   */
  static async checkBatchForDuplicates(
    newDeals: Array<{
      title: string;
      price: number;
      merchant: string;
      url?: string | null;
    }>
  ): Promise<Map<number, SimilarityResult>> {
    const results = new Map<number, SimilarityResult>();

    for (let i = 0; i < newDeals.length; i++) {
      const result = await this.checkForDuplicates(newDeals[i]);
      results.set(i, result);
    }

    return results;
  }
}
