import { Job } from 'bull';
import { db } from '../db/index.js';
import {
  priceHistory,
  alertNotifications,
  userActivity,
  refreshTokens,
  passwordResetTokens,
  emailVerificationTokens,
  deals,
} from '../db/schema.js';
import { lt, sql, eq, and, or, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

export const processCleanup = async (job: Job) => {
  logger.info('Starting database cleanup job');

  try {
    // Clean up old price history (keep last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await db
      .delete(priceHistory)
      .where(lt(priceHistory.scrapedAt, ninetyDaysAgo));

    logger.info('Deleted old price history records (>90 days)');

    // Clean up old alert notifications (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db
      .delete(alertNotifications)
      .where(lt(alertNotifications.sentAt, thirtyDaysAgo));

    logger.info('Deleted old alert notifications (>30 days)');

    // Clean up old user activity (keep last 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await db
      .delete(userActivity)
      .where(lt(userActivity.createdAt, sixtyDaysAgo));

    logger.info('Deleted old user activity (>60 days)');

    // Clean up expired refresh tokens
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()));

    logger.info('Deleted expired refresh tokens');

    // Clean up expired password reset tokens
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));

    logger.info('Deleted expired password reset tokens');

    // Clean up expired email verification tokens
    await db
      .delete(emailVerificationTokens)
      .where(lt(emailVerificationTokens.expiresAt, new Date()));

    logger.info('Deleted expired email verification tokens');

    // Mark deals as expired after 7 days (auto-expiration)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const expiredByAge = await db
      .update(deals)
      .set({ isExpired: true })
      .where(
        and(
          eq(deals.isExpired, false),
          lt(deals.createdAt, sevenDaysAgo)
        )
      )
      .returning({ id: deals.id });

    if (expiredByAge.length > 0) {
      logger.info(`Marked ${expiredByAge.length} deals as expired (older than 7 days)`);
    }

    // Also mark deals as expired if expiresAt date has passed
    const now = new Date();
    const expiredByDate = await db
      .update(deals)
      .set({ isExpired: true })
      .where(
        and(
          eq(deals.isExpired, false),
          lte(deals.expiresAt, now)
        )
      )
      .returning({ id: deals.id });

    if (expiredByDate.length > 0) {
      logger.info(`Marked ${expiredByDate.length} deals as expired (past expiresAt date)`);
    }

    logger.info('Database cleanup completed successfully');
  } catch (error) {
    logger.error('Error during database cleanup:', error);
    throw error;
  }
};
