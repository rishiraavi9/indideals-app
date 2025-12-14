import { db } from '../db/index.js';
import { alerts, deals, alertNotifications, users } from '../db/schema.js';
import { eq, and, gte, lte, desc, sql, notInArray } from 'drizzle-orm';
import { sendAlertEmail } from './email.service.js';
import { logger } from '../utils/logger.js';

interface Alert {
  id: string;
  userId: string;
  keyword: string;
  categoryId: string | null;
  minDiscount: number | null;
  maxPrice: number | null;
  merchant: string | null;
  isActive: boolean;
  frequency: string;
  lastNotified: Date | null;
  notificationCount: number;
}

interface Deal {
  id: string;
  title: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  merchant: string;
  url: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  userId: string;
  createdAt: Date;
}

/**
 * Find deals matching alert criteria
 */
export async function findMatchingDeals(alert: Alert): Promise<Deal[]> {
  try {
    // Build query conditions
    const conditions = [];

    // Keyword match in title or description (case-insensitive)
    const keywordCondition = sql`(
      LOWER(${deals.title}) LIKE ${`%${alert.keyword.toLowerCase()}%`} OR
      LOWER(${deals.description}) LIKE ${`%${alert.keyword.toLowerCase()}%`}
    )`;
    conditions.push(keywordCondition);

    // Category filter
    if (alert.categoryId) {
      conditions.push(eq(deals.categoryId, alert.categoryId));
    }

    // Minimum discount filter
    if (alert.minDiscount !== null && alert.minDiscount > 0) {
      conditions.push(gte(deals.discountPercentage, alert.minDiscount));
    }

    // Maximum price filter
    if (alert.maxPrice !== null && alert.maxPrice > 0) {
      conditions.push(lte(deals.price, alert.maxPrice));
    }

    // Merchant filter
    if (alert.merchant) {
      conditions.push(eq(deals.merchant, alert.merchant));
    }

    // Get already notified deal IDs for this alert
    const notifiedDeals = await db.query.alertNotifications.findMany({
      where: eq(alertNotifications.alertId, alert.id),
      columns: { dealId: true },
    });

    const notifiedDealIds = notifiedDeals.map((n) => n.dealId);

    // Exclude already notified deals
    if (notifiedDealIds.length > 0) {
      conditions.push(notInArray(deals.id, notifiedDealIds));
    }

    // Only active deals (not expired)
    conditions.push(eq(deals.isExpired, false));

    // Query matching deals
    const matchingDeals = await db.query.deals.findMany({
      where: and(...conditions),
      orderBy: [desc(deals.createdAt)],
      limit: 20, // Limit to prevent overwhelming users
    });

    return matchingDeals as Deal[];
  } catch (error) {
    logger.error('Error finding matching deals', { error, alertId: alert.id });
    return [];
  }
}

/**
 * Process a new deal - check all active alerts and send notifications
 */
export async function processNewDeal(deal: Deal): Promise<void> {
  try {
    // Get all active instant alerts
    const activeAlerts = await db.query.alerts.findMany({
      where: and(eq(alerts.isActive, true), eq(alerts.frequency, 'instant')),
    });

    if (activeAlerts.length === 0) {
      return;
    }

    logger.info('Processing new deal for alerts', {
      dealId: deal.id,
      title: deal.title,
      alertCount: activeAlerts.length,
    });

    // Check each alert for matches
    for (const alert of activeAlerts) {
      await checkAlertForDeal(alert as Alert, deal);
    }
  } catch (error) {
    logger.error('Error processing new deal for alerts', { error, dealId: deal.id });
  }
}

/**
 * Check if a deal matches an alert and send notification
 */
async function checkAlertForDeal(alert: Alert, deal: Deal): Promise<void> {
  try {
    // Check if deal matches alert criteria
    const keywordMatch =
      deal.title.toLowerCase().includes(alert.keyword.toLowerCase()) ||
      (deal.description?.toLowerCase().includes(alert.keyword.toLowerCase()) ?? false);

    if (!keywordMatch) {
      return;
    }

    // Category filter
    if (alert.categoryId && deal.categoryId !== alert.categoryId) {
      return;
    }

    // Minimum discount filter
    if (
      alert.minDiscount !== null &&
      alert.minDiscount > 0 &&
      (deal.discountPercentage === null || deal.discountPercentage < alert.minDiscount)
    ) {
      return;
    }

    // Maximum price filter
    if (alert.maxPrice !== null && alert.maxPrice > 0 && deal.price > alert.maxPrice) {
      return;
    }

    // Merchant filter
    if (alert.merchant && deal.merchant !== alert.merchant) {
      return;
    }

    // Check if we've already sent this deal for this alert
    const alreadySent = await db.query.alertNotifications.findFirst({
      where: and(
        eq(alertNotifications.alertId, alert.id),
        eq(alertNotifications.dealId, deal.id)
      ),
    });

    if (alreadySent) {
      return;
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, alert.userId),
    });

    if (!user) {
      logger.warn('User not found for alert', { alertId: alert.id, userId: alert.userId });
      return;
    }

    // Send email notification
    const emailSent = await sendAlertEmail(
      user.email,
      { keyword: alert.keyword, id: alert.id },
      deal,
      'instant'
    );

    // Record notification
    await db.insert(alertNotifications).values({
      alertId: alert.id,
      dealId: deal.id,
      emailStatus: emailSent ? 'sent' : 'failed',
    });

    // Update alert stats
    await db
      .update(alerts)
      .set({
        lastNotified: new Date(),
        notificationCount: sql`${alerts.notificationCount} + 1`,
      })
      .where(eq(alerts.id, alert.id));

    logger.info('Alert notification sent', {
      alertId: alert.id,
      dealId: deal.id,
      userId: user.id,
      emailSent,
    });
  } catch (error) {
    logger.error('Error checking alert for deal', { error, alertId: alert.id, dealId: deal.id });
  }
}

/**
 * Process daily digest - send summary of deals from last 24 hours
 */
export async function processDailyDigest(): Promise<void> {
  try {
    const dailyAlerts = await db.query.alerts.findMany({
      where: and(eq(alerts.isActive, true), eq(alerts.frequency, 'daily')),
    });

    logger.info('Processing daily digest', { alertCount: dailyAlerts.length });

    for (const alert of dailyAlerts) {
      const matchingDeals = await findMatchingDeals(alert as Alert);

      if (matchingDeals.length === 0) {
        continue;
      }

      // Get user details
      const user = await db.query.users.findFirst({
        where: eq(users.id, alert.userId),
      });

      if (!user) {
        continue;
      }

      // Send digest email with all matching deals
      // TODO: Implement sendAlertDigestEmail
      logger.info('Daily digest would be sent', {
        alertId: alert.id,
        userId: user.id,
        dealCount: matchingDeals.length,
      });

      // Mark deals as notified
      for (const deal of matchingDeals) {
        await db.insert(alertNotifications).values({
          alertId: alert.id,
          dealId: deal.id,
          emailStatus: 'sent',
        });
      }

      // Update alert stats
      await db
        .update(alerts)
        .set({
          lastNotified: new Date(),
          notificationCount: sql`${alerts.notificationCount} + ${matchingDeals.length}`,
        })
        .where(eq(alerts.id, alert.id));
    }
  } catch (error) {
    logger.error('Error processing daily digest', { error });
  }
}

/**
 * Process weekly digest - send summary of deals from last 7 days
 */
export async function processWeeklyDigest(): Promise<void> {
  try {
    const weeklyAlerts = await db.query.alerts.findMany({
      where: and(eq(alerts.isActive, true), eq(alerts.frequency, 'weekly')),
    });

    logger.info('Processing weekly digest', { alertCount: weeklyAlerts.length });

    // Similar to daily digest but for weekly
    // Implementation would be similar to processDailyDigest
  } catch (error) {
    logger.error('Error processing weekly digest', { error });
  }
}
