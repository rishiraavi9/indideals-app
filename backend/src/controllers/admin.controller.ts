import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users, deals, comments, votes, affiliateClicks, alerts, priceHistory } from '../db/schema.js';
import { sql, eq, gte, and, desc, count } from 'drizzle-orm';
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
    const [activeDeals] = await db.select({ count: count() }).from(deals).where(eq(deals.status, 'active'));
    const [dealsToday] = await db.select({ count: count() }).from(deals).where(gte(deals.createdAt, today));
    const [dealsThisWeek] = await db.select({ count: count() }).from(deals).where(gte(deals.createdAt, weekAgo));

    // Engagement Stats
    const [totalComments] = await db.select({ count: count() }).from(comments);
    const [commentsToday] = await db.select({ count: count() }).from(comments).where(gte(comments.createdAt, today));
    const [totalVotes] = await db.select({ count: count() }).from(votes);
    const [votesToday] = await db.select({ count: count() }).from(votes).where(gte(votes.createdAt, today));

    // Affiliate Stats
    const [totalClicks] = await db.select({ count: count() }).from(affiliateClicks);
    const [clicksToday] = await db.select({ count: count() }).from(affiliateClicks).where(gte(affiliateClicks.clickedAt, today));
    const [totalConversions] = await db.select({ count: count() }).from(affiliateClicks).where(eq(affiliateClicks.converted, true));

    // Commission calculation
    const commissionResult = await db.select({
      total: sql<number>`COALESCE(SUM(${affiliateClicks.estimatedCommission}), 0)`
    }).from(affiliateClicks).where(eq(affiliateClicks.converted, true));
    const totalCommission = commissionResult[0]?.total || 0;

    // Alert Stats
    const [totalAlerts] = await db.select({ count: count() }).from(alerts);
    const [activeAlerts] = await db.select({ count: count() }).from(alerts).where(eq(alerts.isActive, true));

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
    .where(eq(deals.status, 'active'))
    .orderBy(desc(sql`${deals.upvotes} - ${deals.downvotes}`))
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

    // User growth (last 7 days)
    const userGrowth = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= ${weekAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Deal growth (last 7 days)
    const dealGrowth = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM deals
      WHERE created_at >= ${weekAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      users: {
        total: totalUsers.count,
        today: usersToday.count,
        thisWeek: usersThisWeek.count,
        thisMonth: usersThisMonth.count,
      },
      deals: {
        total: totalDeals.count,
        active: activeDeals.count,
        today: dealsToday.count,
        thisWeek: dealsThisWeek.count,
      },
      engagement: {
        totalComments: totalComments.count,
        commentsToday: commentsToday.count,
        totalVotes: totalVotes.count,
        votesToday: votesToday.count,
      },
      affiliate: {
        totalClicks: totalClicks.count,
        clicksToday: clicksToday.count,
        totalConversions: totalConversions.count,
        conversionRate: totalClicks.count > 0
          ? ((totalConversions.count / totalClicks.count) * 100).toFixed(2)
          : '0.00',
        totalCommission: totalCommission,
      },
      alerts: {
        total: totalAlerts.count,
        active: activeAlerts.count,
      },
      topDeals,
      recentDeals,
      dealsByMerchant,
      growth: {
        users: userGrowth.rows || [],
        deals: dealGrowth.rows || [],
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
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
