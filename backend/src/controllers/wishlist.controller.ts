import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { savedDeals, deals } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Save a deal to wishlist
 * POST /api/wishlist
 */
export const saveDeal = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { dealId, notes } = req.body;

    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }

    // Check if deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Check if already saved
    const existing = await db.query.savedDeals.findFirst({
      where: and(
        eq(savedDeals.userId, userId),
        eq(savedDeals.dealId, dealId)
      ),
    });

    if (existing) {
      return res.status(409).json({ error: 'Deal already in wishlist' });
    }

    // Save to wishlist
    const [saved] = await db.insert(savedDeals).values({
      userId,
      dealId,
      notes: notes || null,
    }).returning();

    logger.info(`User ${userId} saved deal ${dealId} to wishlist`);

    res.status(201).json({
      message: 'Deal saved to wishlist',
      saved,
    });
  } catch (error) {
    logger.error('Error saving deal to wishlist:', error);
    res.status(500).json({ error: 'Failed to save deal to wishlist' });
  }
};

/**
 * Get user's wishlist
 * GET /api/wishlist
 */
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { limit = '20', offset = '0' } = req.query;

    const wishlist = await db
      .select({
        id: savedDeals.id,
        dealId: savedDeals.dealId,
        notes: savedDeals.notes,
        savedAt: savedDeals.createdAt,
        deal: deals,
      })
      .from(savedDeals)
      .innerJoin(deals, eq(savedDeals.dealId, deals.id))
      .where(eq(savedDeals.userId, userId))
      .orderBy(desc(savedDeals.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [{ count }] = await db
      .select({ count: savedDeals.id })
      .from(savedDeals)
      .where(eq(savedDeals.userId, userId));

    res.json({
      wishlist,
      pagination: {
        total: count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    logger.error('Error fetching wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
};

/**
 * Remove deal from wishlist
 * DELETE /api/wishlist/:dealId
 */
export const removeDeal = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { dealId } = req.params;

    const result = await db
      .delete(savedDeals)
      .where(
        and(
          eq(savedDeals.userId, userId),
          eq(savedDeals.dealId, dealId)
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Deal not found in wishlist' });
    }

    logger.info(`User ${userId} removed deal ${dealId} from wishlist`);

    res.json({ message: 'Deal removed from wishlist' });
  } catch (error) {
    logger.error('Error removing deal from wishlist:', error);
    res.status(500).json({ error: 'Failed to remove deal from wishlist' });
  }
};

/**
 * Update wishlist notes
 * PATCH /api/wishlist/:dealId
 */
export const updateNotes = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { dealId } = req.params;
    const { notes } = req.body;

    const [updated] = await db
      .update(savedDeals)
      .set({ notes })
      .where(
        and(
          eq(savedDeals.userId, userId),
          eq(savedDeals.dealId, dealId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Deal not found in wishlist' });
    }

    res.json({
      message: 'Notes updated successfully',
      saved: updated,
    });
  } catch (error) {
    logger.error('Error updating wishlist notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
};

/**
 * Check if deal is in wishlist
 * GET /api/wishlist/check/:dealId
 */
export const checkWishlist = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { dealId } = req.params;

    const saved = await db.query.savedDeals.findFirst({
      where: and(
        eq(savedDeals.userId, userId),
        eq(savedDeals.dealId, dealId)
      ),
    });

    res.json({
      inWishlist: !!saved,
      saved: saved || null,
    });
  } catch (error) {
    logger.error('Error checking wishlist:', error);
    res.status(500).json({ error: 'Failed to check wishlist' });
  }
};
