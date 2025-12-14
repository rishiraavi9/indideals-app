import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { affiliateClicks, affiliatePrograms, deals } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const trackClickSchema = z.object({
  dealId: z.string().uuid(),
});

export const trackClick = async (req: Request, res: Response) => {
  try {
    const { dealId } = trackClickSchema.parse(req.body);

    // Get the deal details
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Get affiliate program for this merchant
    const [program] = await db
      .select()
      .from(affiliatePrograms)
      .where(eq(affiliatePrograms.merchant, deal.merchant))
      .limit(1);

    // Extract user info from the authenticated request (if available)
    const userId = (req.user as any)?.id || null;

    // Generate anonymous ID for non-logged-in users (from cookie or generate new)
    const anonymousId = req.cookies?.anonymousId || `anon_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Get client info
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      req.socket.remoteAddress ||
                      null;
    const userAgent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || null;

    // Build affiliate URL
    let affiliateUrl = deal.url || '';

    // If there's an active affiliate program, append tracking parameters
    if (program && program.isActive && program.affiliateId) {
      const url = new URL(affiliateUrl);

      // Add affiliate ID as a query parameter
      // Format depends on the merchant - this is a generic approach
      url.searchParams.set('tag', program.affiliateId);
      url.searchParams.set('ref', 'deals-app');

      affiliateUrl = url.toString();
    }

    // Calculate estimated commission if we have the program data
    let estimatedCommission = null;
    if (program?.commissionRate && deal.price) {
      // Commission rate is in basis points (1 bp = 0.01%)
      // Price is in paise, result should be in paise
      estimatedCommission = Math.floor((deal.price * program.commissionRate) / 10000);
    }

    // Track the click
    const [click] = await db.insert(affiliateClicks).values({
      dealId,
      userId,
      anonymousId: userId ? null : anonymousId,
      ipAddress,
      userAgent,
      referrer,
      merchant: deal.merchant,
      affiliateUrl,
      estimatedCommission,
    }).returning();

    // Set anonymous ID cookie if not logged in
    if (!userId) {
      res.cookie('anonymousId', anonymousId, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    }

    res.json({
      success: true,
      url: affiliateUrl,
      clickId: click.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Track click error:', error);
    res.status(500).json({ error: 'Failed to track affiliate click' });
  }
};

const markConversionSchema = z.object({
  clickId: z.string().uuid(),
  commissionAmount: z.number().optional(),
});

export const markConversion = async (req: Request, res: Response) => {
  try {
    const { clickId, commissionAmount } = markConversionSchema.parse(req.body);

    // Update the click record
    const [updatedClick] = await db
      .update(affiliateClicks)
      .set({
        converted: true,
        convertedAt: new Date(),
        estimatedCommission: commissionAmount || undefined,
      })
      .where(eq(affiliateClicks.id, clickId))
      .returning();

    if (!updatedClick) {
      res.status(404).json({ error: 'Click not found' });
      return;
    }

    res.json({
      success: true,
      click: updatedClick,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Mark conversion error:', error);
    res.status(500).json({ error: 'Failed to mark conversion' });
  }
};

const getAffiliateStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  merchant: z.string().optional(),
});

export const getAffiliateStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, merchant } = getAffiliateStatsSchema.parse(req.query);

    // Build query conditions
    const conditions = [];
    if (startDate) {
      conditions.push(`clicked_at >= '${startDate}'`);
    }
    if (endDate) {
      conditions.push(`clicked_at <= '${endDate}'`);
    }
    if (merchant) {
      conditions.push(`merchant = '${merchant}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get overall stats using raw SQL for aggregation
    const overallQuery = `
      SELECT
        COUNT(*)::int as total_clicks,
        COUNT(CASE WHEN converted = true THEN 1 END)::int as total_conversions,
        COALESCE(SUM(estimated_commission), 0)::int as total_commission
      FROM affiliate_clicks
      ${whereClause}
    `;

    const [overallStats] = await db.execute(overallQuery as any);

    const totalClicks = (overallStats as any).total_clicks || 0;
    const totalConversions = (overallStats as any).total_conversions || 0;
    const totalCommission = (overallStats as any).total_commission || 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get stats by merchant
    const merchantQuery = `
      SELECT
        merchant,
        COUNT(*)::int as clicks,
        COUNT(CASE WHEN converted = true THEN 1 END)::int as conversions,
        COALESCE(SUM(estimated_commission), 0)::int as commission
      FROM affiliate_clicks
      ${whereClause}
      GROUP BY merchant
      ORDER BY commission DESC
    `;

    const merchantStats = await db.execute(merchantQuery as any);

    const stats = {
      totalClicks,
      totalConversions,
      conversionRate,
      totalCommission,
      byMerchant: (merchantStats as any[]).map((row: any) => ({
        merchant: row.merchant,
        clicks: row.clicks,
        conversions: row.conversions,
        commission: row.commission,
      })),
    };

    res.json(stats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors });
      return;
    }
    console.error('Get affiliate stats error:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate stats' });
  }
};
