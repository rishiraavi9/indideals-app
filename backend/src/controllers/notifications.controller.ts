import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Get user's notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread === 'true';

    const whereClause = unreadOnly
      ? and(eq(notifications.userId, userId), eq(notifications.read, false))
      : eq(notifications.userId, userId);

    const userNotifications = await db.query.notifications.findMany({
      where: whereClause,
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
      with: {
        deal: {
          columns: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            imageUrl: true,
            merchant: true,
          },
        },
      },
    });

    res.json({ notifications: userNotifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ count: result[0]?.count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { notificationId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const [updated] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ notification: updated });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { notificationId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const deleted = await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a notification (internal use or admin)
 */
const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['price_drop', 'deal_alert', 'wishlist', 'system']),
  title: z.string().max(255),
  message: z.string(),
  dealId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
});

export const createNotification = async (data: z.infer<typeof createNotificationSchema>) => {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      dealId: data.dealId,
      imageUrl: data.imageUrl,
    })
    .returning();

  return notification;
};
