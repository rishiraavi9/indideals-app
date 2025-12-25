import express from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @route   POST /api/analytics/pageview
 * @desc    Track a page view
 * @access  Public
 */
router.post('/pageview', optionalAuth, async (req, res) => {
  try {
    const { sessionId, path, referrer } = req.body;
    const userId = (req as any).userId;

    if (!sessionId || !path) {
      return res.status(400).json({ error: 'sessionId and path are required' });
    }

    // Get client info
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      req.socket.remoteAddress ||
                      '';

    const pageViewId = await AnalyticsService.trackPageView({
      sessionId,
      userId,
      path,
      referrer,
      userAgent,
      ipAddress,
    });

    res.json({ success: true, pageViewId });
  } catch (error) {
    logger.error('Error tracking page view:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

/**
 * @route   POST /api/analytics/pageview/:id/duration
 * @desc    Update page view duration
 * @access  Public
 */
router.post('/pageview/:id/duration', async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;

    if (typeof duration !== 'number') {
      return res.status(400).json({ error: 'duration is required' });
    }

    await AnalyticsService.updatePageViewDuration(id, duration);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating page view duration:', error);
    res.status(500).json({ error: 'Failed to update duration' });
  }
});

/**
 * @route   POST /api/analytics/event
 * @desc    Track an event
 * @access  Public
 */
router.post('/event', optionalAuth, async (req, res) => {
  try {
    const { sessionId, eventType, eventName, dealId, metadata, path } = req.body;
    const userId = (req as any).userId;

    if (!sessionId || !eventType || !eventName) {
      return res.status(400).json({ error: 'sessionId, eventType, and eventName are required' });
    }

    const eventId = await AnalyticsService.trackEvent({
      sessionId,
      userId,
      eventType,
      eventName,
      dealId,
      metadata,
      path,
    });

    res.json({ success: true, eventId });
  } catch (error) {
    logger.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * @route   GET /api/analytics/session
 * @desc    Get a new session ID
 * @access  Public
 */
router.get('/session', (_req, res) => {
  const sessionId = AnalyticsService.generateSessionId();
  res.json({ sessionId });
});

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get analytics dashboard data (admin only)
 * @access  Private (admin)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Check admin auth (using basic auth header from admin dashboard)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { period = '7d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const stats = await AnalyticsService.getDashboardStats(startDate, endDate);
    const realtime = await AnalyticsService.getRealTimeStats();

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...stats,
      realtime,
    });
  } catch (error) {
    logger.error('Error getting analytics dashboard:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

/**
 * @route   GET /api/analytics/realtime
 * @desc    Get real-time analytics (admin only)
 * @access  Private (admin)
 */
router.get('/realtime', async (req, res) => {
  try {
    // Check admin auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const realtime = await AnalyticsService.getRealTimeStats();
    res.json(realtime);
  } catch (error) {
    logger.error('Error getting realtime analytics:', error);
    res.status(500).json({ error: 'Failed to get realtime data' });
  }
});

/**
 * @route   GET /api/analytics/deals/:dealId
 * @desc    Get analytics for a specific deal (admin only)
 * @access  Private (admin)
 */
router.get('/deals/:dealId', async (req, res) => {
  try {
    // Check admin auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { dealId } = req.params;
    const stats = await AnalyticsService.getDealAnalytics(dealId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting deal analytics:', error);
    res.status(500).json({ error: 'Failed to get deal analytics' });
  }
});

export default router;
