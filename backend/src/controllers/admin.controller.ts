import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users, deals, comments, votes, affiliateClicks, alerts, priceHistory, telegramMessages } from '../db/schema.js';
import { sql, eq, gte, and, desc, count, isNotNull, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';

// Get comprehensive admin stats
export const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User Stats
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [usersToday] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, today));
    const [usersThisWeek] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, weekAgo));
    const [usersThisMonth] = await db.select({ count: count() }).from(users).where(gte(users.createdAt, monthAgo));

    // Deal Stats
    const [totalDeals] = await db.select({ count: count() }).from(deals);
    const [activeDeals] = await db.select({ count: count() }).from(deals).where(eq(deals.isExpired, false));
    const [dealsToday] = await db.select({ count: count() }).from(deals).where(gte(deals.createdAt, today));
    const [dealsThisWeek] = await db.select({ count: count() }).from(deals).where(gte(deals.createdAt, weekAgo));

    // Engagement Stats
    const [totalComments] = await db.select({ count: count() }).from(comments);
    const [commentsToday] = await db.select({ count: count() }).from(comments).where(gte(comments.createdAt, today));
    const [totalVotes] = await db.select({ count: count() }).from(votes);
    const [votesToday] = await db.select({ count: count() }).from(votes).where(gte(votes.createdAt, today));

    // Affiliate Stats (with error handling)
    let affiliateStats = { totalClicks: 0, clicksToday: 0, totalConversions: 0, totalCommission: 0 };
    try {
      const [totalClicks] = await db.select({ count: count() }).from(affiliateClicks);
      const [clicksToday] = await db.select({ count: count() }).from(affiliateClicks).where(gte(affiliateClicks.clickedAt, today));
      const [totalConversions] = await db.select({ count: count() }).from(affiliateClicks).where(eq(affiliateClicks.converted, true));

      const commissionResult = await db.select({
        total: sql<number>`COALESCE(SUM(${affiliateClicks.estimatedCommission}), 0)`
      }).from(affiliateClicks).where(eq(affiliateClicks.converted, true));

      affiliateStats = {
        totalClicks: totalClicks?.count || 0,
        clicksToday: clicksToday?.count || 0,
        totalConversions: totalConversions?.count || 0,
        totalCommission: commissionResult[0]?.total || 0,
      };
    } catch (e) {
      console.error('Error fetching affiliate stats:', e);
    }

    // Alert Stats (with error handling)
    let alertStats = { total: 0, active: 0 };
    try {
      const [totalAlerts] = await db.select({ count: count() }).from(alerts);
      const [activeAlerts] = await db.select({ count: count() }).from(alerts).where(eq(alerts.isActive, true));
      alertStats = {
        total: totalAlerts?.count || 0,
        active: activeAlerts?.count || 0,
      };
    } catch (e) {
      console.error('Error fetching alert stats:', e);
    }

    // Telegram Scraper Stats (with error handling)
    let telegramStats = {
      totalProcessed: 0,
      dealsCreated: 0,
      skipped: 0,
      processedToday: 0,
      processedThisWeek: 0,
      byChannel: [] as { channel: string; count: number }[],
      skipReasons: [] as { reason: string; count: number }[]
    };
    try {
      const [totalProcessed] = await db.select({ count: count() }).from(telegramMessages);
      const [dealsCreated] = await db.select({ count: count() }).from(telegramMessages).where(isNotNull(telegramMessages.dealId));
      const [skipped] = await db.select({ count: count() }).from(telegramMessages).where(isNotNull(telegramMessages.skippedReason));
      const [processedToday] = await db.select({ count: count() }).from(telegramMessages).where(gte(telegramMessages.createdAt, today));
      const [processedThisWeek] = await db.select({ count: count() }).from(telegramMessages).where(gte(telegramMessages.createdAt, weekAgo));

      // Messages by channel
      const byChannel = await db.select({
        channel: telegramMessages.channelUsername,
        count: count(),
      })
      .from(telegramMessages)
      .groupBy(telegramMessages.channelUsername)
      .orderBy(desc(count()))
      .limit(10);

      // Skip reasons breakdown
      const skipReasons = await db.select({
        reason: telegramMessages.skippedReason,
        count: count(),
      })
      .from(telegramMessages)
      .where(isNotNull(telegramMessages.skippedReason))
      .groupBy(telegramMessages.skippedReason)
      .orderBy(desc(count()));

      telegramStats = {
        totalProcessed: totalProcessed?.count || 0,
        dealsCreated: dealsCreated?.count || 0,
        skipped: skipped?.count || 0,
        processedToday: processedToday?.count || 0,
        processedThisWeek: processedThisWeek?.count || 0,
        byChannel: byChannel.map(c => ({ channel: c.channel, count: c.count })),
        skipReasons: skipReasons.map(r => ({ reason: r.reason || 'unknown', count: r.count })),
      };
    } catch (e) {
      console.error('Error fetching telegram stats:', e);
    }

    // Deal Source Stats (Telegram vs User-submitted)
    let dealSourceStats = { telegram: 0, userSubmitted: 0, expiredDeals: 0 };
    try {
      // Deals linked to telegram messages
      const [telegramDeals] = await db.select({ count: count() })
        .from(telegramMessages)
        .where(isNotNull(telegramMessages.dealId));

      // Expired deals count
      const [expiredDeals] = await db.select({ count: count() }).from(deals).where(eq(deals.isExpired, true));

      const totalDealCount = totalDeals?.count || 0;
      const telegramDealCount = telegramDeals?.count || 0;

      dealSourceStats = {
        telegram: telegramDealCount,
        userSubmitted: totalDealCount - telegramDealCount,
        expiredDeals: expiredDeals?.count || 0,
      };
    } catch (e) {
      console.error('Error fetching deal source stats:', e);
    }

    // Top Deals (by score)
    const topDeals = await db.select({
      id: deals.id,
      title: deals.title,
      merchant: deals.merchant,
      price: deals.price,
      upvotes: deals.upvotes,
      downvotes: deals.downvotes,
      commentCount: deals.commentCount,
      viewCount: deals.viewCount,
    })
    .from(deals)
    .where(eq(deals.isExpired, false))
    .orderBy(desc(sql`COALESCE(${deals.upvotes}, 0) - COALESCE(${deals.downvotes}, 0)`))
    .limit(10);

    // Recent Deals
    const recentDeals = await db.select({
      id: deals.id,
      title: deals.title,
      merchant: deals.merchant,
      price: deals.price,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .orderBy(desc(deals.createdAt))
    .limit(10);

    // Deals by merchant (top 10)
    const dealsByMerchant = await db.select({
      merchant: deals.merchant,
      count: count(),
    })
    .from(deals)
    .groupBy(deals.merchant)
    .orderBy(desc(count()))
    .limit(10);

    // Growth stats (simplified - skip if errors)
    let growthStats = { users: [], deals: [] };
    try {
      // Convert date to ISO string for raw SQL queries
      const weekAgoStr = weekAgo.toISOString();
      const userGrowthResult = await db.execute(sql`
        SELECT
          DATE(created_at) as date,
          COUNT(*)::int as count
        FROM users
        WHERE created_at >= ${weekAgoStr}::timestamp
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      const dealGrowthResult = await db.execute(sql`
        SELECT
          DATE(created_at) as date,
          COUNT(*)::int as count
        FROM deals
        WHERE created_at >= ${weekAgoStr}::timestamp
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
      growthStats = {
        users: (userGrowthResult.rows || []) as any,
        deals: (dealGrowthResult.rows || []) as any,
      };
    } catch (e) {
      console.error('Error fetching growth stats:', e);
    }

    res.json({
      users: {
        total: totalUsers?.count || 0,
        today: usersToday?.count || 0,
        thisWeek: usersThisWeek?.count || 0,
        thisMonth: usersThisMonth?.count || 0,
      },
      deals: {
        total: totalDeals?.count || 0,
        active: activeDeals?.count || 0,
        today: dealsToday?.count || 0,
        thisWeek: dealsThisWeek?.count || 0,
      },
      engagement: {
        totalComments: totalComments?.count || 0,
        commentsToday: commentsToday?.count || 0,
        totalVotes: totalVotes?.count || 0,
        votesToday: votesToday?.count || 0,
      },
      affiliate: {
        totalClicks: affiliateStats.totalClicks,
        clicksToday: affiliateStats.clicksToday,
        totalConversions: affiliateStats.totalConversions,
        conversionRate: affiliateStats.totalClicks > 0
          ? ((affiliateStats.totalConversions / affiliateStats.totalClicks) * 100).toFixed(2)
          : '0.00',
        totalCommission: affiliateStats.totalCommission,
      },
      alerts: alertStats,
      telegram: telegramStats,
      dealSources: dealSourceStats,
      topDeals,
      recentDeals,
      dealsByMerchant,
      growth: growthStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    next(error);
  }
};

// Admin authentication middleware
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // Check if admin password is configured
  if (!env.ADMIN_PASSWORD) {
    // In development, allow with warning
    if (env.NODE_ENV !== 'production') {
      console.warn('⚠️  Admin dashboard accessible without authentication (ADMIN_PASSWORD not set)');
      return next();
    }
    // In production without password, deny access
    return res.status(503).json({ error: 'Admin dashboard not configured. Set ADMIN_PASSWORD environment variable.' });
  }

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
  const [username, password] = credentials.split(':');

  if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
    next();
  } else {
    console.log(`Admin login failed for user: ${username}`);
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};
