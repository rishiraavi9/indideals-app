import { Job } from 'bull';
import { db } from '../db/index.js';
import { deals, users } from '../db/schema.js';
import { eq, and, or, lt } from 'drizzle-orm';
import { sendDealExpiredEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

export const processDealVerifier = async (job: Job) => {
  const { type, dealId } = job.data;

  if (type === 'verify-all-deals') {
    await verifyAllDeals();
  } else if (type === 'verify-single-deal' && dealId) {
    await verifySingleDeal(dealId);
  }
};

// Verify all active deals
const verifyAllDeals = async () => {
  // Get all active deals
  const activeDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.isExpired, false))
    .limit(500); // Process in batches

  logger.info(`Verifying ${activeDeals.length} active deals`);

  let expiredCount = 0;

  for (const deal of activeDeals) {
    try {
      const isExpired = await verifySingleDeal(deal.id);
      if (isExpired) expiredCount++;

      // Add delay to avoid overwhelming servers
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error(`Failed to verify deal ${deal.id}:`, error);
    }
  }

  logger.info(`Verified ${activeDeals.length} deals, marked ${expiredCount} as expired`);
};

// Verify a single deal
const verifySingleDeal = async (dealId: string): Promise<boolean> => {
  // Get the deal with user info
  const [result] = await db
    .select({
      deal: deals,
      user: users,
    })
    .from(deals)
    .innerJoin(users, eq(deals.userId, users.id))
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!result) return false;

  const { deal, user } = result;

  // Check if already expired
  if (deal.isExpired) return true;

  // Check expiration date
  if (deal.expiresAt && deal.expiresAt < new Date()) {
    await markDealAsExpired(deal.id, 'Expiration date reached', user.email);
    return true;
  }

  // Check URL availability if URL exists
  if (deal.url) {
    const isAvailable = await checkURLAvailability(deal.url);

    if (!isAvailable) {
      await markDealAsExpired(deal.id, 'Product URL is no longer available', user.email);
      return true;
    }
  }

  return false;
};

// Check if URL is still available (not 404)
const checkURLAvailability = async (url: string): Promise<boolean> => {
  try {
    const response = await axios.head(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 404
    });

    // Consider 404, 410 (Gone) as unavailable
    if (response.status === 404 || response.status === 410) {
      return false;
    }

    return true;
  } catch (error: any) {
    // Network errors, timeouts, etc.
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return false;
    }

    // For other errors, assume it's available (don't want false positives)
    logger.warn(`Could not verify URL ${url}:`, error.message);
    return true;
  }
};

// Mark deal as expired
const markDealAsExpired = async (dealId: string, reason: string, userEmail: string) => {
  await db
    .update(deals)
    .set({
      isExpired: true,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));

  logger.info(`Marked deal ${dealId} as expired: ${reason}`);

  // Notify user
  try {
    await sendDealExpiredEmail(userEmail, dealId, reason);
  } catch (error) {
    logger.error(`Failed to send expiration email to ${userEmail}:`, error);
  }
};
