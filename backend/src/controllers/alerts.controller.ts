import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { alerts, alertNotifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { logSecurityEvent } from '../utils/logger.js';

/**
 * Create alert subscription
 */
const createAlertSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters').max(255),
  categoryId: z.string().uuid().optional(),
  minDiscount: z.number().min(0).max(100).optional(),
  maxPrice: z.number().min(0).optional(),
  merchant: z.string().max(100).optional(),
  frequency: z.enum(['instant', 'daily', 'weekly']).default('instant'),
});

export const createAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = createAlertSchema.parse(req.body);

    // Check if user already has an alert for this keyword
    const existing = await db.query.alerts.findFirst({
      where: and(
        eq(alerts.userId, userId),
        eq(alerts.keyword, data.keyword.toLowerCase())
      ),
    });

    if (existing) {
      res.status(400).json({
        error: 'You already have an alert for this keyword',
        existingAlert: existing,
      });
      return;
    }

    // Create alert
    const [alert] = await db
      .insert(alerts)
      .values({
        userId,
        keyword: data.keyword.toLowerCase(),
        categoryId: data.categoryId,
        minDiscount: data.minDiscount,
        maxPrice: data.maxPrice,
        merchant: data.merchant,
        frequency: data.frequency,
      })
      .returning();

    logSecurityEvent('alert_created', { userId, alertId: alert.id, keyword: data.keyword });

    res.status(201).json({
      alert,
      message: `Alert created! You'll receive ${data.frequency} notifications for "${data.keyword}"`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's alerts
 */
export const getMyAlerts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userAlerts = await db.query.alerts.findMany({
      where: eq(alerts.userId, userId),
      orderBy: [desc(alerts.createdAt)],
    });

    res.json({ alerts: userAlerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update alert
 */
const updateAlertSchema = z.object({
  isActive: z.boolean().optional(),
  frequency: z.enum(['instant', 'daily', 'weekly']).optional(),
  minDiscount: z.number().min(0).max(100).optional(),
  maxPrice: z.number().min(0).optional(),
  merchant: z.string().max(100).optional(),
});

export const updateAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { alertId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const data = updateAlertSchema.parse(req.body);

    // Check if alert exists and belongs to user
    const alert = await db.query.alerts.findFirst({
      where: and(eq(alerts.id, alertId), eq(alerts.userId, userId)),
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    // Update alert
    const [updatedAlert] = await db
      .update(alerts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId))
      .returning();

    logSecurityEvent('alert_updated', { userId, alertId, changes: Object.keys(data) });

    res.json({ alert: updatedAlert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete alert
 */
export const deleteAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { alertId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if alert exists and belongs to user
    const alert = await db.query.alerts.findFirst({
      where: and(eq(alerts.id, alertId), eq(alerts.userId, userId)),
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    // Delete alert (cascade will delete notifications)
    await db.delete(alerts).where(eq(alerts.id, alertId));

    logSecurityEvent('alert_deleted', { userId, alertId, keyword: alert.keyword });

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get alert notification history
 */
export const getAlertNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { alertId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if alert exists and belongs to user
    const alert = await db.query.alerts.findFirst({
      where: and(eq(alerts.id, alertId), eq(alerts.userId, userId)),
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    // Get notification history with deal details
    const notifications = await db.query.alertNotifications.findMany({
      where: eq(alertNotifications.alertId, alertId),
      orderBy: [desc(alertNotifications.sentAt)],
      with: {
        deal: true,
      },
      limit: 50,
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get alert notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Test alert (preview matching deals without sending email)
 */
export const testAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { alertId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if alert exists and belongs to user
    const alert = await db.query.alerts.findFirst({
      where: and(eq(alerts.id, alertId), eq(alerts.userId, userId)),
    });

    if (!alert) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    // Use the alert matching service to find matching deals
    const { findMatchingDeals } = await import('../services/alert-matcher.service.js');
    const matchingDeals = await findMatchingDeals(alert);

    res.json({
      alert,
      matchingDeals,
      message: `Found ${matchingDeals.length} matching deals`,
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
