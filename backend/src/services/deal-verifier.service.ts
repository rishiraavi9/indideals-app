import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../db/index.js';
import { deals, dealVerificationLogs, priceHistory, users } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Deal Verification Service
 * Automated verification of deals without manual intervention
 */

export interface VerificationResult {
  success: boolean;
  urlAccessible: boolean;
  statusCode?: number;
  priceMatch?: boolean;
  scrapedPrice?: number;
  scrapedOriginalPrice?: number;
  priceDifference?: number;
  errorMessage?: string;
  shouldFlag: boolean;
  shouldExpire: boolean;
  flagReason?: string;
}

export class DealVerifierService {
  /**
   * Main verification method - orchestrates all checks
   */
  static async verifyDeal(dealId: string, verificationType: 'initial' | 'periodic' | 'manual'): Promise<VerificationResult> {
    try {
      // Get deal from database
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, dealId))
        .limit(1);

      if (!deal) {
        logger.error(`[Verifier] Deal ${dealId} not found`);
        return {
          success: false,
          urlAccessible: false,
          errorMessage: 'Deal not found',
          shouldFlag: false,
          shouldExpire: true,
        };
      }

      logger.info(`[Verifier] Starting verification for deal ${dealId} (${deal.title})`);

      // Step 1: URL accessibility check
      const urlCheck = await this.checkUrlAccessibility(deal.url);

      // Step 2: Price scraping (if URL is accessible)
      let priceCheck: Partial<VerificationResult> = {};
      if (urlCheck.urlAccessible && deal.url) {
        priceCheck = await this.scrapePriceFromUrl(deal.url, deal.price, deal.originalPrice);
      }

      // Step 3: Community signal check
      const communityCheck = await this.checkCommunitySignals(dealId);

      // Step 4: User trust score
      const trustScore = await this.getUserTrustScore(deal.userId);

      // Combine all checks to make verification decision
      const result = this.makeVerificationDecision({
        ...urlCheck,
        ...priceCheck,
        ...communityCheck,
        trustScore,
        verificationType,
      });

      // Step 5: Update deal in database
      await this.updateDealVerificationStatus(dealId, result);

      // Step 6: Log verification attempt
      await this.logVerification(dealId, verificationType, result);

      // Step 7: Update price history if price was scraped
      if (result.scrapedPrice) {
        await this.updatePriceHistory(dealId, result.scrapedPrice, result.scrapedOriginalPrice, deal.merchant);
      }

      logger.info(`[Verifier] Verification complete for deal ${dealId}: ${result.success ? 'PASSED' : 'FAILED'}`);

      return result;
    } catch (error: any) {
      logger.error(`[Verifier] Error verifying deal ${dealId}:`, error);

      await this.logVerification(dealId, verificationType, {
        success: false,
        urlAccessible: false,
        errorMessage: error.message,
        shouldFlag: false,
        shouldExpire: false,
      });

      return {
        success: false,
        urlAccessible: false,
        errorMessage: error.message,
        shouldFlag: false,
        shouldExpire: false,
      };
    }
  }

  /**
   * Check if URL is accessible (returns 200)
   */
  private static async checkUrlAccessibility(url: string | null): Promise<Partial<VerificationResult>> {
    if (!url) {
      return {
        urlAccessible: false,
        statusCode: 0,
        errorMessage: 'No URL provided',
      };
    }

    try {
      const response = await axios.head(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      return {
        urlAccessible: response.status === 200,
        statusCode: response.status,
      };
    } catch (error: any) {
      // If HEAD fails, try GET
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        return {
          urlAccessible: response.status === 200,
          statusCode: response.status,
        };
      } catch (getError: any) {
        logger.warn(`[Verifier] URL not accessible: ${url} - ${getError.message}`);
        return {
          urlAccessible: false,
          statusCode: getError.response?.status || 0,
          errorMessage: getError.message,
        };
      }
    }
  }

  /**
   * Scrape price from product page
   * This is a basic implementation - can be enhanced with merchant-specific selectors
   */
  private static async scrapePriceFromUrl(
    url: string,
    expectedPrice: number,
    expectedOriginalPrice: number | null
  ): Promise<Partial<VerificationResult>> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Common price selectors (add more as needed)
      const priceSelectors = [
        '.price',
        '[class*="price"]',
        '[id*="price"]',
        '[data-price]',
        '.product-price',
        '.sale-price',
        '.offer-price',
        'span[itemprop="price"]',
      ];

      let scrapedPrice: number | undefined;

      for (const selector of priceSelectors) {
        const priceText = $(selector).first().text();
        const price = this.extractPriceFromText(priceText);

        if (price && price > 0) {
          scrapedPrice = price;
          break;
        }
      }

      if (!scrapedPrice) {
        logger.warn(`[Verifier] Could not scrape price from ${url}`);
        return {
          errorMessage: 'Could not extract price from page',
        };
      }

      // Calculate price difference (in percentage)
      const priceDifference = Math.abs(scrapedPrice - expectedPrice);
      const differencePercentage = (priceDifference / expectedPrice) * 100;

      // Price match if within 5% tolerance
      const priceMatch = differencePercentage <= 5;

      return {
        scrapedPrice,
        priceMatch,
        priceDifference,
      };
    } catch (error: any) {
      logger.warn(`[Verifier] Error scraping price from ${url}:`, error.message);
      return {
        errorMessage: `Price scraping failed: ${error.message}`,
      };
    }
  }

  /**
   * Extract price from text (handles ¹, INR, commas, etc.)
   */
  private static extractPriceFromText(text: string): number | null {
    if (!text) return null;

    // Remove currency symbols and extract numbers
    const cleaned = text
      .replace(/[¹,INR\s]/gi, '')
      .replace(/[^\d.]/g, '');

    const price = parseFloat(cleaned);

    return isNaN(price) ? null : Math.round(price);
  }

  /**
   * Check community signals (high downvotes, reports)
   */
  private static async checkCommunitySignals(dealId: string): Promise<Partial<VerificationResult>> {
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) return {};

    const totalVotes = deal.upvotes + deal.downvotes;
    const downvoteRatio = totalVotes > 0 ? deal.downvotes / totalVotes : 0;

    // Flag if > 60% downvotes and at least 10 votes
    if (downvoteRatio > 0.6 && totalVotes >= 10) {
      return {
        shouldFlag: true,
        flagReason: `High downvote ratio: ${Math.round(downvoteRatio * 100)}%`,
      };
    }

    return {};
  }

  /**
   * Get user trust score based on reputation
   */
  private static async getUserTrustScore(userId: string): Promise<number> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return 0;

    // Trust score: 0-100
    // Users with 100+ reputation are fully trusted
    return Math.min(100, user.reputation || 0);
  }

  /**
   * Make final verification decision based on all checks
   */
  private static makeVerificationDecision(data: any): VerificationResult {
    const {
      urlAccessible,
      statusCode,
      priceMatch,
      scrapedPrice,
      scrapedOriginalPrice,
      priceDifference,
      shouldFlag,
      flagReason,
      errorMessage,
      trustScore,
      verificationType,
    } = data;

    // Auto-expire if URL is dead (404, 410)
    const shouldExpire = !urlAccessible && (statusCode === 404 || statusCode === 410);

    // Auto-flag conditions:
    // 1. URL not accessible (but not expired)
    // 2. Price mismatch > 20%
    // 3. Community signals (already in shouldFlag)
    // 4. Low trust user + suspicious price
    let finalFlag = shouldFlag || false;
    let finalFlagReason = flagReason || '';

    if (!urlAccessible && !shouldExpire) {
      finalFlag = true;
      finalFlagReason = `URL not accessible (Status: ${statusCode})`;
    }

    if (priceMatch === false && priceDifference && priceDifference > expectedPrice * 0.2) {
      finalFlag = true;
      finalFlagReason = `Price mismatch: Expected ¹${data.expectedPrice}, Found ¹${scrapedPrice}`;
    }

    // Trusted users (score > 80) bypass some flags
    if (trustScore > 80 && !shouldExpire && urlAccessible) {
      finalFlag = false;
    }

    // Success criteria:
    // - URL accessible OR
    // - Trusted user (even if URL check failed)
    const success = urlAccessible || trustScore > 80;

    return {
      success,
      urlAccessible,
      statusCode,
      priceMatch,
      scrapedPrice,
      scrapedOriginalPrice,
      priceDifference,
      errorMessage,
      shouldFlag: finalFlag,
      shouldExpire,
      flagReason: finalFlagReason || undefined,
    };
  }

  /**
   * Update deal verification status in database
   */
  private static async updateDealVerificationStatus(dealId: string, result: VerificationResult) {
    let verificationStatus: 'pending' | 'verified' | 'failed' | 'flagged' = 'pending';

    if (result.shouldExpire) {
      verificationStatus = 'failed';
    } else if (result.shouldFlag) {
      verificationStatus = 'flagged';
    } else if (result.success) {
      verificationStatus = 'verified';
    }

    await db
      .update(deals)
      .set({
        verificationStatus,
        verified: result.success && !result.shouldFlag,
        verifiedAt: result.success ? new Date() : undefined,
        lastVerifiedAt: new Date(),
        verificationAttempts: sql`${deals.verificationAttempts} + 1`,
        urlAccessible: result.urlAccessible,
        priceMatch: result.priceMatch,
        autoFlagged: result.shouldFlag,
        flagReason: result.flagReason,
        isExpired: result.shouldExpire,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId));

    logger.info(`[Verifier] Updated deal ${dealId} status to: ${verificationStatus}`);
  }

  /**
   * Log verification attempt
   */
  private static async logVerification(
    dealId: string,
    verificationType: 'initial' | 'periodic' | 'manual',
    result: VerificationResult
  ) {
    await db.insert(dealVerificationLogs).values({
      dealId,
      verificationType,
      status: result.success ? 'success' : 'failed',
      urlAccessible: result.urlAccessible,
      statusCode: result.statusCode,
      scrapedPrice: result.scrapedPrice,
      scrapedOriginalPrice: result.scrapedOriginalPrice,
      priceMatch: result.priceMatch,
      priceDifference: result.priceDifference,
      errorMessage: result.errorMessage,
      metadata: {
        shouldFlag: result.shouldFlag,
        shouldExpire: result.shouldExpire,
        flagReason: result.flagReason,
      },
    });
  }

  /**
   * Update price history
   */
  private static async updatePriceHistory(
    dealId: string,
    price: number,
    originalPrice: number | undefined,
    merchant: string
  ) {
    await db.insert(priceHistory).values({
      dealId,
      price,
      originalPrice: originalPrice || null,
      merchant,
      source: 'scraper',
    });

    logger.info(`[Verifier] Price history updated for deal ${dealId}: ¹${price}`);
  }

  /**
   * Bulk verify all active deals (for periodic checks)
   */
  static async verifyAllDeals() {
    const activeDeals = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.isExpired, false))
      .limit(100); // Process in batches

    logger.info(`[Verifier] Starting bulk verification for ${activeDeals.length} deals`);

    for (const deal of activeDeals) {
      await this.verifyDeal(deal.id, 'periodic');
      // Small delay to avoid overwhelming servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`[Verifier] Bulk verification complete`);
  }
}
