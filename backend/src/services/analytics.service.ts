import { db } from '../db/index.js';
import { pageViews, analyticsEvents, dailyAnalytics, sessions } from '../db/schema.js';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Analytics Service
 *
 * Tracks page views, user events, and sessions.
 * All data is stored in your own database for full control.
 */

interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
}

interface PageViewData {
  sessionId: string;
  userId?: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface EventData {
  sessionId: string;
  userId?: string;
  eventType: string;
  eventName: string;
  dealId?: string;
  metadata?: Record<string, any>;
  path?: string;
}

export class AnalyticsService {
  /**
   * Generate a session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Parse user agent to extract device info
   */
  static parseUserAgent(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      deviceType = 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
      deviceType = 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    return { deviceType, browser, os };
  }

  /**
   * Track a page view
   */
  static async trackPageView(data: PageViewData): Promise<string> {
    try {
      const deviceInfo = data.userAgent ? this.parseUserAgent(data.userAgent) : null;

      const [pageView] = await db.insert(pageViews).values({
        sessionId: data.sessionId,
        userId: data.userId || null,
        path: data.path,
        referrer: data.referrer || null,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        deviceType: deviceInfo?.deviceType || null,
        browser: deviceInfo?.browser || null,
        os: deviceInfo?.os || null,
      }).returning({ id: pageViews.id });

      // Update or create session
      await this.updateSession(data.sessionId, data.path, data.userId, deviceInfo, data.referrer, data.ipAddress, data.userAgent);

      return pageView.id;
    } catch (error) {
      logger.error('Error tracking page view:', error);
      throw error;
    }
  }

  /**
   * Update page view duration when user leaves
   */
  static async updatePageViewDuration(pageViewId: string, duration: number): Promise<void> {
    try {
      await db.update(pageViews)
        .set({ duration })
        .where(eq(pageViews.id, pageViewId));
    } catch (error) {
      logger.error('Error updating page view duration:', error);
    }
  }

  /**
   * Track an event
   */
  static async trackEvent(data: EventData): Promise<string> {
    try {
      const [event] = await db.insert(analyticsEvents).values({
        sessionId: data.sessionId,
        userId: data.userId || null,
        eventType: data.eventType,
        eventName: data.eventName,
        dealId: data.dealId || null,
        metadata: data.metadata || null,
        path: data.path || null,
      }).returning({ id: analyticsEvents.id });

      // Update session last activity
      await this.touchSession(data.sessionId);

      return event.id;
    } catch (error) {
      logger.error('Error tracking event:', error);
      throw error;
    }
  }

  /**
   * Update or create session
   */
  private static async updateSession(
    sessionId: string,
    path: string,
    userId?: string,
    deviceInfo?: DeviceInfo | null,
    referrer?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // Try to update existing session
      const existing = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

      if (existing.length > 0) {
        await db.update(sessions)
          .set({
            lastActivityAt: new Date(),
            pageViews: sql`${sessions.pageViews} + 1`,
            exitPage: path,
            userId: userId || existing[0].userId,
          })
          .where(eq(sessions.id, sessionId));
      } else {
        // Create new session
        await db.insert(sessions).values({
          id: sessionId,
          userId: userId || null,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          pageViews: 1,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          deviceType: deviceInfo?.deviceType || null,
          browser: deviceInfo?.browser || null,
          os: deviceInfo?.os || null,
          referrer: referrer || null,
          landingPage: path,
          exitPage: path,
        });
      }
    } catch (error) {
      logger.error('Error updating session:', error);
    }
  }

  /**
   * Update session last activity time
   */
  private static async touchSession(sessionId: string): Promise<void> {
    try {
      await db.update(sessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      logger.error('Error touching session:', error);
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  static async getDashboardStats(startDate: Date, endDate: Date): Promise<{
    uniqueVisitors: number;
    totalPageViews: number;
    totalSessions: number;
    avgSessionDuration: number;
    topPages: Array<{ path: string; views: number }>;
    topReferrers: Array<{ referrer: string; count: number }>;
    deviceBreakdown: { desktop: number; mobile: number; tablet: number };
    eventCounts: Record<string, number>;
    dailyStats: Array<{ date: string; visitors: number; pageViews: number }>;
  }> {
    try {
      // Unique visitors (by session)
      const [visitorsResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${sessions.id})` })
        .from(sessions)
        .where(and(
          gte(sessions.startedAt, startDate),
          lte(sessions.startedAt, endDate)
        ));

      // Total page views
      const [pageViewsResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, startDate),
          lte(pageViews.createdAt, endDate)
        ));

      // Total sessions
      const [sessionsResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sessions)
        .where(and(
          gte(sessions.startedAt, startDate),
          lte(sessions.startedAt, endDate)
        ));

      // Average session duration
      const [avgDurationResult] = await db
        .select({
          avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${sessions.lastActivityAt} - ${sessions.startedAt})))`
        })
        .from(sessions)
        .where(and(
          gte(sessions.startedAt, startDate),
          lte(sessions.startedAt, endDate)
        ));

      // Top pages
      const topPages = await db
        .select({
          path: pageViews.path,
          views: sql<number>`COUNT(*)`,
        })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, startDate),
          lte(pageViews.createdAt, endDate)
        ))
        .groupBy(pageViews.path)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // Top referrers
      const topReferrers = await db
        .select({
          referrer: sessions.referrer,
          count: sql<number>`COUNT(*)`,
        })
        .from(sessions)
        .where(and(
          gte(sessions.startedAt, startDate),
          lte(sessions.startedAt, endDate),
          sql`${sessions.referrer} IS NOT NULL AND ${sessions.referrer} != ''`
        ))
        .groupBy(sessions.referrer)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      // Device breakdown
      const deviceStats = await db
        .select({
          deviceType: sessions.deviceType,
          count: sql<number>`COUNT(*)`,
        })
        .from(sessions)
        .where(and(
          gte(sessions.startedAt, startDate),
          lte(sessions.startedAt, endDate)
        ))
        .groupBy(sessions.deviceType);

      const deviceBreakdown = {
        desktop: 0,
        mobile: 0,
        tablet: 0,
      };
      deviceStats.forEach(stat => {
        if (stat.deviceType === 'desktop') deviceBreakdown.desktop = Number(stat.count);
        else if (stat.deviceType === 'mobile') deviceBreakdown.mobile = Number(stat.count);
        else if (stat.deviceType === 'tablet') deviceBreakdown.tablet = Number(stat.count);
      });

      // Event counts by type
      const eventStats = await db
        .select({
          eventName: analyticsEvents.eventName,
          count: sql<number>`COUNT(*)`,
        })
        .from(analyticsEvents)
        .where(and(
          gte(analyticsEvents.createdAt, startDate),
          lte(analyticsEvents.createdAt, endDate)
        ))
        .groupBy(analyticsEvents.eventName);

      const eventCounts: Record<string, number> = {};
      eventStats.forEach(stat => {
        eventCounts[stat.eventName] = Number(stat.count);
      });

      // Daily stats
      const dailyStats = await db
        .select({
          date: sql<string>`DATE(${pageViews.createdAt})`,
          visitors: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
          pageViews: sql<number>`COUNT(*)`,
        })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, startDate),
          lte(pageViews.createdAt, endDate)
        ))
        .groupBy(sql`DATE(${pageViews.createdAt})`)
        .orderBy(sql`DATE(${pageViews.createdAt})`);

      return {
        uniqueVisitors: Number(visitorsResult?.count || 0),
        totalPageViews: Number(pageViewsResult?.count || 0),
        totalSessions: Number(sessionsResult?.count || 0),
        avgSessionDuration: Math.round(Number(avgDurationResult?.avg || 0)),
        topPages: topPages.map(p => ({ path: p.path, views: Number(p.views) })),
        topReferrers: topReferrers.map(r => ({ referrer: r.referrer || 'Direct', count: Number(r.count) })),
        deviceBreakdown,
        eventCounts,
        dailyStats: dailyStats.map(d => ({
          date: String(d.date),
          visitors: Number(d.visitors),
          pageViews: Number(d.pageViews),
        })),
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get real-time stats (last 30 minutes)
   */
  static async getRealTimeStats(): Promise<{
    activeVisitors: number;
    currentPages: Array<{ path: string; visitors: number }>;
  }> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      // Active visitors
      const [activeResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${sessions.id})` })
        .from(sessions)
        .where(gte(sessions.lastActivityAt, thirtyMinutesAgo));

      // Current pages being viewed
      const currentPages = await db
        .select({
          path: pageViews.path,
          visitors: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
        })
        .from(pageViews)
        .where(gte(pageViews.createdAt, thirtyMinutesAgo))
        .groupBy(pageViews.path)
        .orderBy(desc(sql`COUNT(DISTINCT ${pageViews.sessionId})`))
        .limit(5);

      return {
        activeVisitors: Number(activeResult?.count || 0),
        currentPages: currentPages.map(p => ({ path: p.path, visitors: Number(p.visitors) })),
      };
    } catch (error) {
      logger.error('Error getting real-time stats:', error);
      throw error;
    }
  }

  /**
   * Get deal analytics
   */
  static async getDealAnalytics(dealId: string): Promise<{
    totalViews: number;
    uniqueViewers: number;
    clicks: number;
    saves: number;
    alerts: number;
  }> {
    try {
      // Page views for this deal
      const dealPath = `/deal/${dealId}`;
      const [viewsResult] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          unique: sql<number>`COUNT(DISTINCT ${pageViews.sessionId})`,
        })
        .from(pageViews)
        .where(eq(pageViews.path, dealPath));

      // Events for this deal
      const events = await db
        .select({
          eventName: analyticsEvents.eventName,
          count: sql<number>`COUNT(*)`,
        })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.dealId, dealId))
        .groupBy(analyticsEvents.eventName);

      const eventCounts: Record<string, number> = {};
      events.forEach(e => {
        eventCounts[e.eventName] = Number(e.count);
      });

      return {
        totalViews: Number(viewsResult?.total || 0),
        uniqueViewers: Number(viewsResult?.unique || 0),
        clicks: eventCounts['get_deal_click'] || 0,
        saves: eventCounts['save_deal'] || 0,
        alerts: eventCounts['create_alert'] || 0,
      };
    } catch (error) {
      logger.error('Error getting deal analytics:', error);
      throw error;
    }
  }
}

export const analyticsService = AnalyticsService;
