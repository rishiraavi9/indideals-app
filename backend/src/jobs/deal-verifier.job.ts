import { Job } from 'bull';
import { db } from '../db/index.js';
import { deals, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendDealExpiredEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';
import { DealVerifierService } from '../services/deal-verifier.service.js';

export const processDealVerifier = async (job: Job) => {
  const { type, dealId, verificationType } = job.data;

  if (type === 'verify-all-deals') {
    logger.info('[Job] Starting verify-all-deals job');
    await DealVerifierService.verifyAllDeals();
  } else if (type === 'verify-single-deal' && dealId) {
    logger.info(`[Job] Starting verify-single-deal job for deal ${dealId}`);
    const result = await DealVerifierService.verifyDeal(dealId, verificationType || 'periodic');

    // If deal should be expired, notify the user
    if (result.shouldExpire) {
      await notifyUserOfExpiration(dealId, result.flagReason || 'Deal URL is no longer accessible');
    }
  }
};

// Helper function to notify user when deal expires
const notifyUserOfExpiration = async (dealId: string, reason: string) => {
  try {
    // Get deal and user info
    const [result] = await db
      .select({
        deal: deals,
        user: users,
      })
      .from(deals)
      .innerJoin(users, eq(deals.userId, users.id))
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!result) return;

    const { user } = result;

    // Send email notification
    await sendDealExpiredEmail(user.email, dealId, reason);
    logger.info(`[Job] Sent expiration notification to ${user.email} for deal ${dealId}`);
  } catch (error) {
    logger.error(`[Job] Failed to send expiration notification for deal ${dealId}:`, error);
  }
};
