import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { db } from '../db/index.js';
import { deals } from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

/**
 * AI-Powered Deal Deduplication Service
 * Uses Claude AI to detect duplicate deals based on semantic similarity
 */

interface DealSimilarityCheck {
  isDuplicate: boolean;
  similarityScore: number;
  reason: string;
  existingDealId?: string;
}

export class AiDeduplicationService {
  private static anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

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
  ): Promise<DealSimilarityCheck> {
    try {
      // Step 1: Get recent similar deals from database (last 7 days)
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
            eq(deals.merchant, newDeal.merchant) // Same merchant only
          )
        )
        .limit(20); // Check against last 20 deals from same merchant

      if (recentDeals.length === 0) {
        return {
          isDuplicate: false,
          similarityScore: 0,
          reason: 'No recent deals from this merchant to compare',
        };
      }

      // Step 2: Use AI to check semantic similarity
      const aiResponse = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a deal deduplication expert. Check if the NEW DEAL is a duplicate of any EXISTING DEALS.

NEW DEAL:
Title: ${newDeal.title}
Price: ₹${newDeal.price}
Merchant: ${newDeal.merchant}
URL: ${newDeal.url || 'N/A'}

EXISTING DEALS:
${recentDeals.map((d, i) => `${i + 1}. Title: ${d.title}\n   Price: ₹${d.price}\n   Merchant: ${d.merchant}\n   URL: ${d.url || 'N/A'}\n   Deal ID: ${d.id}`).join('\n\n')}

INSTRUCTIONS:
1. A deal is a DUPLICATE if:
   - Same product (e.g., "Havells Mixer" vs "Havells MIXWELL Mixer" = duplicate)
   - Same merchant
   - Similar price (within 10% difference)
   - OR same product URL (even if title differs)

2. A deal is NOT a duplicate if:
   - Different product variant (e.g., "Red T-Shirt" vs "Blue T-Shirt")
   - Significantly different price (>10% difference for same product)
   - Different product entirely

3. Respond in this EXACT JSON format (nothing else):
{
  "isDuplicate": true/false,
  "similarityScore": 0-100,
  "reason": "brief explanation",
  "existingDealId": "uuid-if-duplicate-else-null"
}`,
          },
        ],
      });

      const responseText = aiResponse.content[0].type === 'text'
        ? aiResponse.content[0].text
        : '';

      // Parse AI response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('[AI Dedup] Could not parse AI response');
        return {
          isDuplicate: false,
          similarityScore: 0,
          reason: 'AI response parsing failed',
        };
      }

      const result = JSON.parse(jsonMatch[0]);

      logger.info(`[AI Dedup] ${newDeal.title.substring(0, 40)}... -> ${result.isDuplicate ? 'DUPLICATE' : 'UNIQUE'} (score: ${result.similarityScore})`);

      return {
        isDuplicate: result.isDuplicate,
        similarityScore: result.similarityScore,
        reason: result.reason,
        existingDealId: result.existingDealId || undefined,
      };
    } catch (error: any) {
      logger.error('[AI Dedup] Error checking duplicates:', error.message);
      // On error, allow the deal (fail open)
      return {
        isDuplicate: false,
        similarityScore: 0,
        reason: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Find and remove duplicate deals in database
   */
  static async cleanupExistingDuplicates(): Promise<number> {
    try {
      logger.info('[AI Dedup] Starting cleanup of existing duplicates...');

      // Get all deals grouped by merchant, ordered by creation date
      const allDeals = await db
        .select({
          id: deals.id,
          title: deals.title,
          price: deals.price,
          merchant: deals.merchant,
          url: deals.url,
          createdAt: deals.createdAt,
        })
        .from(deals)
        .orderBy(deals.createdAt); // Keep oldest deals

      const dealsByMerchant = new Map<string, typeof allDeals>();
      allDeals.forEach(deal => {
        const merchant = deal.merchant || 'Unknown';
        if (!dealsByMerchant.has(merchant)) {
          dealsByMerchant.set(merchant, []);
        }
        dealsByMerchant.get(merchant)!.push(deal);
      });

      let removedCount = 0;
      const dealsToRemove: string[] = [];

      // Check each merchant's deals
      for (const [merchant, merchantDeals] of dealsByMerchant) {
        logger.info(`[AI Dedup] Checking ${merchantDeals.length} deals from ${merchant}...`);

        for (let i = 0; i < merchantDeals.length; i++) {
          const currentDeal = merchantDeals[i];

          // Skip if already marked for removal
          if (dealsToRemove.includes(currentDeal.id)) continue;

          // Compare with subsequent deals
          for (let j = i + 1; j < merchantDeals.length; j++) {
            const otherDeal = merchantDeals[j];

            // Skip if already marked for removal
            if (dealsToRemove.includes(otherDeal.id)) continue;

            // Quick checks before AI
            const priceDiff = Math.abs(currentDeal.price - otherDeal.price);
            const pricePercentDiff = (priceDiff / Math.max(currentDeal.price, otherDeal.price)) * 100;

            // If same URL, definitely duplicate
            if (currentDeal.url && otherDeal.url && currentDeal.url === otherDeal.url) {
              dealsToRemove.push(otherDeal.id);
              logger.info(`[AI Dedup] Found URL duplicate: ${otherDeal.title.substring(0, 40)}...`);
              continue;
            }

            // If price difference >20%, likely not duplicate - skip AI check
            if (pricePercentDiff > 20) {
              continue;
            }

            // Use AI for semantic comparison
            const similarity = await this.checkForDuplicates({
              title: otherDeal.title,
              price: otherDeal.price,
              merchant: otherDeal.merchant,
              url: otherDeal.url,
            });

            if (similarity.isDuplicate) {
              dealsToRemove.push(otherDeal.id);
              logger.info(`[AI Dedup] Found semantic duplicate: ${otherDeal.title.substring(0, 40)}... (score: ${similarity.similarityScore})`);
            }

            // Rate limiting - small delay between AI calls
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // Remove duplicates from database
      if (dealsToRemove.length > 0) {
        for (const dealId of dealsToRemove) {
          await db.delete(deals).where(eq(deals.id, dealId));
          removedCount++;
        }
        logger.info(`[AI Dedup] Removed ${removedCount} duplicate deals`);
      } else {
        logger.info('[AI Dedup] No duplicates found');
      }

      return removedCount;
    } catch (error: any) {
      logger.error('[AI Dedup] Cleanup failed:', error.message);
      return 0;
    }
  }
}
