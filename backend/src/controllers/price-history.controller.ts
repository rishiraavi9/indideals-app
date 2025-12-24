import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { priceHistory, priceAlerts, deals, users } from '../db/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Get price history for a deal
 * GET /api/deals/:dealId/price-history
 */
export const getPriceHistory = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const { days = '30' } = req.query;

    // Calculate date threshold
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    const history = await db
      .select()
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.dealId, dealId),
          gte(priceHistory.scrapedAt, daysAgo)
        )
      )
      .orderBy(priceHistory.scrapedAt);

    // Calculate statistics
    const prices = history.map(h => h.price);
    const stats = {
      current: prices[prices.length - 1] || 0,
      lowest: prices.length > 0 ? Math.min(...prices) : 0,
      highest: prices.length > 0 ? Math.max(...prices) : 0,
      average: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      dataPoints: history.length,
    };

    res.json({
      history,
      stats,
      period: `${days} days`,
    });
  } catch (error) {
    logger.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
};

/**
 * Create price alert
 * POST /api/deals/:dealId/price-alerts
 */
export const createPriceAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { dealId } = req.params;
    const { targetPrice } = req.body;

    if (!targetPrice || targetPrice <= 0) {
      return res.status(400).json({ error: 'Valid target price is required' });
    }

    // Check if deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if user already has an active alert for this deal
    const existing = await db.query.priceAlerts.findFirst({
      where: and(
        eq(priceAlerts.userId, userId),
        eq(priceAlerts.dealId, dealId),
        eq(priceAlerts.isActive, true)
      ),
    });

    if (existing) {
      return res.status(409).json({
        error: 'You already have an active price alert for this deal',
        alert: existing,
      });
    }

    // Create price alert
    const [alert] = await db.insert(priceAlerts).values({
      userId,
      dealId,
      targetPrice,
      isActive: true,
    }).returning();

    logger.info(`User ${userId} created price alert for deal ${dealId} at ₹${targetPrice / 100}`);

    res.status(201).json({
      message: 'Price alert created successfully',
      alert,
    });
  } catch (error) {
    logger.error('Error creating price alert:', error);
    res.status(500).json({ error: 'Failed to create price alert' });
  }
};

/**
 * Get user's price alerts
 * GET /api/price-alerts
 */
export const getPriceAlerts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { active = 'true' } = req.query;

    const whereConditions = [eq(priceAlerts.userId, userId)];

    if (active === 'true') {
      whereConditions.push(eq(priceAlerts.isActive, true));
    }

    const alerts = await db
      .select({
        id: priceAlerts.id,
        targetPrice: priceAlerts.targetPrice,
        isActive: priceAlerts.isActive,
        createdAt: priceAlerts.createdAt,
        notifiedAt: priceAlerts.notifiedAt,
        deal: deals,
      })
      .from(priceAlerts)
      .innerJoin(deals, eq(priceAlerts.dealId, deals.id))
      .where(and(...whereConditions))
      .orderBy(desc(priceAlerts.createdAt));

    res.json({ alerts });
  } catch (error) {
    logger.error('Error fetching price alerts:', error);
    res.status(500).json({ error: 'Failed to fetch price alerts' });
  }
};

/**
 * Delete price alert
 * DELETE /api/price-alerts/:alertId
 */
export const deletePriceAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { alertId } = req.params;

    const result = await db
      .delete(priceAlerts)
      .where(
        and(
          eq(priceAlerts.id, alertId),
          eq(priceAlerts.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Price alert not found' });
    }

    logger.info(`User ${userId} deleted price alert ${alertId}`);

    res.json({ message: 'Price alert deleted successfully' });
  } catch (error) {
    logger.error('Error deleting price alert:', error);
    res.status(500).json({ error: 'Failed to delete price alert' });
  }
};

/**
 * Update price alert
 * PATCH /api/price-alerts/:alertId
 */
export const updatePriceAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { alertId } = req.params;
    const { targetPrice, isActive } = req.body;

    const updates: any = {};
    if (targetPrice !== undefined) updates.targetPrice = targetPrice;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const [updated] = await db
      .update(priceAlerts)
      .set(updates)
      .where(
        and(
          eq(priceAlerts.id, alertId),
          eq(priceAlerts.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Price alert not found' });
    }

    res.json({
      message: 'Price alert updated successfully',
      alert: updated,
    });
  } catch (error) {
    logger.error('Error updating price alert:', error);
    res.status(500).json({ error: 'Failed to update price alert' });
  }
};

/**
 * Manually record price (admin/system use)
 * POST /api/deals/:dealId/price-history
 */
export const recordPrice = async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const { price, originalPrice, merchant, source = 'manual' } = req.body;

    if (!price || !merchant) {
      return res.status(400).json({ error: 'Price and merchant are required' });
    }

    const [record] = await db.insert(priceHistory).values({
      dealId,
      price,
      originalPrice: originalPrice || null,
      merchant,
      source,
      scrapedAt: new Date(),
    }).returning();

    logger.info(`Recorded price for deal ${dealId}: ₹${price / 100} from ${merchant}`);

    res.status(201).json({
      message: 'Price recorded successfully',
      record,
    });
  } catch (error) {
    logger.error('Error recording price:', error);
    res.status(500).json({ error: 'Failed to record price' });
  }
};
