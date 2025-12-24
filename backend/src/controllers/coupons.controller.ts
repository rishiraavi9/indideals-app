import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { coupons, couponUsage } from '../db/schema.js';
import { eq, and, gte, or, sql, desc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Search/filter coupons
 * GET /api/coupons
 */
export const getCoupons = async (req: Request, res: Response) => {
  try {
    const {
      merchant,
      verified = 'all',
      limit = '20',
      offset = '0',
      active = 'true',
    } = req.query;

    const whereConditions: any[] = [];

    // Filter by merchant
    if (merchant) {
      whereConditions.push(
        sql`LOWER(${coupons.merchant}) = LOWER(${merchant})`
      );
    }

    // Filter by verified status
    if (verified === 'true') {
      whereConditions.push(eq(coupons.isVerified, true));
    } else if (verified === 'false') {
      whereConditions.push(eq(coupons.isVerified, false));
    }

    // Filter active (not expired)
    if (active === 'true') {
      whereConditions.push(
        or(
          sql`${coupons.expiresAt} IS NULL`,
          gte(coupons.expiresAt, new Date())
        )
      );
    }

    const results = await db
      .select()
      .from(coupons)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(coupons.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(coupons)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.json({
      coupons: results,
      pagination: {
        total: count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    logger.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
};

/**
 * Get coupons for a specific merchant or deal
 * GET /api/coupons/search
 */
export const searchCoupons = async (req: Request, res: Response) => {
  try {
    const { merchant, dealMerchant } = req.query;

    if (!merchant && !dealMerchant) {
      return res.status(400).json({ error: 'Merchant name is required' });
    }

    const merchantName = (merchant || dealMerchant) as string;

    const results = await db
      .select()
      .from(coupons)
      .where(
        and(
          sql`LOWER(${coupons.merchant}) LIKE LOWER(${'%' + merchantName + '%'})`,
          or(
            sql`${coupons.expiresAt} IS NULL`,
            gte(coupons.expiresAt, new Date())
          )
        )
      )
      .orderBy(desc(coupons.isVerified), desc(coupons.usageCount));

    res.json({ coupons: results });
  } catch (error) {
    logger.error('Error searching coupons:', error);
    res.status(500).json({ error: 'Failed to search coupons' });
  }
};

/**
 * Submit new coupon
 * POST /api/coupons
 */
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const {
      code,
      merchant,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      expiresAt,
    } = req.body;

    // Validation
    if (!code || !merchant || !description || !discountType) {
      return res.status(400).json({
        error: 'Code, merchant, description, and discount type are required',
      });
    }

    if (!['percentage', 'fixed', 'freeShipping'].includes(discountType)) {
      return res.status(400).json({
        error: 'Invalid discount type. Must be: percentage, fixed, or freeShipping',
      });
    }

    // Check for duplicate coupon code for same merchant
    const existing = await db.query.coupons.findFirst({
      where: and(
        sql`LOWER(${coupons.code}) = LOWER(${code})`,
        sql`LOWER(${coupons.merchant}) = LOWER(${merchant})`
      ),
    });

    if (existing) {
      return res.status(409).json({
        error: 'This coupon code already exists for this merchant',
        coupon: existing,
      });
    }

    // Create coupon
    const [coupon] = await db.insert(coupons).values({
      code: code.toUpperCase(),
      merchant,
      description,
      discountType,
      discountValue: discountValue || null,
      minPurchase: minPurchase || null,
      maxDiscount: maxDiscount || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      userId: userId || null,
      isVerified: false,
      usageCount: 0,
    }).returning();

    logger.info(`New coupon created: ${code} for ${merchant}`);

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon,
    });
  } catch (error) {
    logger.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

/**
 * Verify coupon (mark as working/not working)
 * PUT /api/coupons/:couponId/verify
 */
export const verifyCoupon = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { couponId } = req.params;
    const { worked, feedback } = req.body;

    if (typeof worked !== 'boolean') {
      return res.status(400).json({ error: 'worked (boolean) is required' });
    }

    // Record usage
    if (userId) {
      await db.insert(couponUsage).values({
        couponId,
        userId,
        worked,
        feedback: feedback || null,
      });
    }

    // Update coupon verification status and usage count
    const [updated] = await db
      .update(coupons)
      .set({
        usageCount: sql`${coupons.usageCount} + 1`,
        isVerified: worked,
        verifiedAt: worked ? new Date() : sql`${coupons.verifiedAt}`,
      })
      .where(eq(coupons.id, couponId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    logger.info(`Coupon ${couponId} marked as ${worked ? 'working' : 'not working'}`);

    res.json({
      message: 'Coupon verification recorded',
      coupon: updated,
    });
  } catch (error) {
    logger.error('Error verifying coupon:', error);
    res.status(500).json({ error: 'Failed to verify coupon' });
  }
};

/**
 * Get coupon usage statistics
 * GET /api/coupons/:couponId/stats
 */
export const getCouponStats = async (req: Request, res: Response) => {
  try {
    const { couponId } = req.params;

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.id, couponId),
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Get usage feedback
    const usage = await db
      .select()
      .from(couponUsage)
      .where(eq(couponUsage.couponId, couponId))
      .orderBy(desc(couponUsage.usedAt));

    const totalUsage = usage.length;
    const workedCount = usage.filter(u => u.worked === true).length;
    const failedCount = usage.filter(u => u.worked === false).length;
    const successRate = totalUsage > 0 ? (workedCount / totalUsage) * 100 : 0;

    res.json({
      coupon,
      stats: {
        totalUsage,
        workedCount,
        failedCount,
        successRate: Math.round(successRate),
      },
      recentFeedback: usage.slice(0, 10),
    });
  } catch (error) {
    logger.error('Error fetching coupon stats:', error);
    res.status(500).json({ error: 'Failed to fetch coupon stats' });
  }
};

/**
 * Delete coupon (admin or creator only)
 * DELETE /api/coupons/:couponId
 */
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { couponId } = req.params;

    // Check if user is the creator (for now, allow anyone to delete their own)
    const result = await db
      .delete(coupons)
      .where(
        and(
          eq(coupons.id, couponId),
          userId ? eq(coupons.userId, userId) : sql`true`
        )
      )
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        error: 'Coupon not found or you do not have permission to delete it',
      });
    }

    logger.info(`Coupon ${couponId} deleted by user ${userId}`);

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    logger.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};
