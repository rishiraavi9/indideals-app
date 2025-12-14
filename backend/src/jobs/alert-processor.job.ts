import { Job } from 'bull';
import { db } from '../db/index.js';
import { alerts, users, deals, alertNotifications } from '../db/schema.js';
import { eq, and, sql, gte, lte, isNull, or } from 'drizzle-orm';
import { sendAlertEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';

export const processAlertProcessor = async (job: Job) => {
  const { type } = job.data;

  if (type === 'instant') {
    await processInstantAlert(job.data.dealId);
  } else if (type === 'daily-digest') {
    await processDailyDigests();
  } else if (type === 'weekly-digest') {
    await processWeeklyDigests();
  }
};

// Instant alert processing (called when a new deal is created)
const processInstantAlert = async (dealId: string) => {
  // Get the deal
  const [deal] = await db
    .select()
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) return;

  // Find matching instant alerts
  const matchingAlerts = await db
    .select({
      alert: alerts,
      user: users,
    })
    .from(alerts)
    .innerJoin(users, eq(alerts.userId, users.id))
    .where(
      and(
        eq(alerts.isActive, true),
        eq(alerts.frequency, 'instant'),
        or(
          // Keyword match
          sql`LOWER(${deals.title}) LIKE LOWER(${'%' + alerts.keyword + '%'})`,
          sql`LOWER(${deals.description}) LIKE LOWER(${'%' + alerts.keyword + '%'})`
        )
      )
    );

  // Send emails for matching alerts
  for (const { alert, user } of matchingAlerts) {
    // Check if already notified
    const [existing] = await db
      .select()
      .from(alertNotifications)
      .where(
        and(
          eq(alertNotifications.alertId, alert.id),
          eq(alertNotifications.dealId, deal.id)
        )
      )
      .limit(1);

    if (existing) continue;

    // Apply additional filters
    if (alert.categoryId && deal.categoryId !== alert.categoryId) continue;
    if (alert.minDiscount && (!deal.discountPercentage || deal.discountPercentage < alert.minDiscount)) continue;
    if (alert.maxPrice && deal.price > alert.maxPrice) continue;
    if (alert.merchant && deal.merchant.toLowerCase() !== alert.merchant.toLowerCase()) continue;

    // Send email
    try {
      await sendAlertEmail(
        user.email,
        { keyword: alert.keyword, id: alert.id },
        deal,
        'instant'
      );

      // Record notification
      await db.insert(alertNotifications).values({
        alertId: alert.id,
        dealId: deal.id,
        emailStatus: 'sent',
      });

      // Update alert stats
      await db
        .update(alerts)
        .set({
          lastNotified: new Date(),
          notificationCount: sql`${alerts.notificationCount} + 1`,
        })
        .where(eq(alerts.id, alert.id));

      logger.info(`Sent instant alert to ${user.email} for deal ${deal.id}`);
    } catch (error) {
      logger.error(`Failed to send alert to ${user.email}:`, error);

      // Record failure
      await db.insert(alertNotifications).values({
        alertId: alert.id,
        dealId: deal.id,
        emailStatus: 'failed',
      });
    }
  }
};

// Daily digest processing
const processDailyDigests = async () => {
  // Get all active daily alerts
  const dailyAlerts = await db
    .select({
      alert: alerts,
      user: users,
    })
    .from(alerts)
    .innerJoin(users, eq(alerts.userId, users.id))
    .where(
      and(
        eq(alerts.isActive, true),
        eq(alerts.frequency, 'daily')
      )
    );

  for (const { alert, user } of dailyAlerts) {
    // Get deals from last 24 hours matching the alert
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const matchingDeals = await db
      .select()
      .from(deals)
      .where(
        and(
          gte(deals.createdAt, oneDayAgo),
          or(
            sql`LOWER(${deals.title}) LIKE LOWER(${'%' + alert.keyword + '%'})`,
            sql`LOWER(${deals.description}) LIKE LOWER(${'%' + alert.keyword + '%'})`
          ),
          alert.categoryId ? eq(deals.categoryId, alert.categoryId) : sql`1=1`,
          alert.minDiscount ? gte(deals.discountPercentage, alert.minDiscount) : sql`1=1`,
          alert.maxPrice ? lte(deals.price, alert.maxPrice) : sql`1=1`,
          alert.merchant ? eq(deals.merchant, alert.merchant) : sql`1=1`
        )
      )
      .limit(20); // Max 20 deals per digest

    if (matchingDeals.length === 0) continue;

    // Filter out already notified deals
    const notNotifiedDeals = [];
    for (const deal of matchingDeals) {
      const [existing] = await db
        .select()
        .from(alertNotifications)
        .where(
          and(
            eq(alertNotifications.alertId, alert.id),
            eq(alertNotifications.dealId, deal.id)
          )
        )
        .limit(1);

      if (!existing) {
        notNotifiedDeals.push(deal);
      }
    }

    if (notNotifiedDeals.length === 0) continue;

    // Send digest email (one email per deal for now)
    try {
      for (const deal of notNotifiedDeals) {
        await sendAlertEmail(
          user.email,
          { keyword: alert.keyword, id: alert.id },
          deal,
          'daily'
        );

        // Record notification
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
          notificationCount: sql`${alerts.notificationCount} + ${notNotifiedDeals.length}`,
        })
        .where(eq(alerts.id, alert.id));

      logger.info(`Sent daily digest to ${user.email} with ${notNotifiedDeals.length} deals`);
    } catch (error) {
      logger.error(`Failed to send daily digest to ${user.email}:`, error);
    }
  }

  logger.info('Daily digest processing completed');
};

// Weekly digest processing (similar to daily but for 7 days)
const processWeeklyDigests = async () => {
  // Get all active weekly alerts
  const weeklyAlerts = await db
    .select({
      alert: alerts,
      user: users,
    })
    .from(alerts)
    .innerJoin(users, eq(alerts.userId, users.id))
    .where(
      and(
        eq(alerts.isActive, true),
        eq(alerts.frequency, 'weekly')
      )
    );

  for (const { alert, user } of weeklyAlerts) {
    // Get deals from last 7 days matching the alert
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const matchingDeals = await db
      .select()
      .from(deals)
      .where(
        and(
          gte(deals.createdAt, oneWeekAgo),
          or(
            sql`LOWER(${deals.title}) LIKE LOWER(${'%' + alert.keyword + '%'})`,
            sql`LOWER(${deals.description}) LIKE LOWER(${'%' + alert.keyword + '%'})`
          ),
          alert.categoryId ? eq(deals.categoryId, alert.categoryId) : sql`1=1`,
          alert.minDiscount ? gte(deals.discountPercentage, alert.minDiscount) : sql`1=1`,
          alert.maxPrice ? lte(deals.price, alert.maxPrice) : sql`1=1`,
          alert.merchant ? eq(deals.merchant, alert.merchant) : sql`1=1`
        )
      )
      .limit(50); // Max 50 deals per weekly digest

    if (matchingDeals.length === 0) continue;

    // Filter out already notified deals
    const notNotifiedDeals = [];
    for (const deal of matchingDeals) {
      const [existing] = await db
        .select()
        .from(alertNotifications)
        .where(
          and(
            eq(alertNotifications.alertId, alert.id),
            eq(alertNotifications.dealId, deal.id)
          )
        )
        .limit(1);

      if (!existing) {
        notNotifiedDeals.push(deal);
      }
    }

    if (notNotifiedDeals.length === 0) continue;

    // Send digest email (one email per deal for now)
    try {
      for (const deal of notNotifiedDeals) {
        await sendAlertEmail(
          user.email,
          { keyword: alert.keyword, id: alert.id },
          deal,
          'weekly'
        );

        // Record notification
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
          notificationCount: sql`${alerts.notificationCount} + ${notNotifiedDeals.length}`,
        })
        .where(eq(alerts.id, alert.id));

      logger.info(`Sent weekly digest to ${user.email} with ${notNotifiedDeals.length} deals`);
    } catch (error) {
      logger.error(`Failed to send weekly digest to ${user.email}:`, error);
    }
  }

  logger.info('Weekly digest processing completed');
};
