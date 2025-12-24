import { Request, Response } from 'express';
import { z } from 'zod';
import { db, deals, votes, users, userActivity, priceHistory } from '../db/index.js';
import { eq, desc, sql, and, or, ilike, gte, inArray, isNotNull } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';
import { indexDeal, updateDeal, deleteDeal } from '../services/elasticsearch.service.js';
import { isFeatureEnabled } from '../config/features.js';
import {
  cacheAside,
  CachePrefix,
  CacheTTL,
  invalidateDealCache,
  invalidateDealsCache,
} from '../services/cache.service.js';
import { DealQualityService } from '../services/ai/deal-quality.service.js';
import { MlDeduplicationService } from '../services/ml-deduplication.service.js';
import { FraudDetectionService } from '../services/ai/fraud-detection.service.js';

/**
 * Generate demo price history for a newly created deal
 * Creates 30 days of realistic price fluctuations
 */
async function generateDemoPriceHistory(dealId: string, currentPrice: number, originalPrice: number | null, merchant: string) {
  try {
    const historyEntries = [];
    const now = new Date();
    const effectiveOriginalPrice = originalPrice || Math.round(currentPrice * 1.3);

    for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 12) + 8);
      date.setMinutes(Math.floor(Math.random() * 60));

      let priceAtPoint: number;

      if (daysAgo >= 25) {
        // 25-30 days ago: Near original price
        const variation = 0.9 + Math.random() * 0.15;
        priceAtPoint = Math.round(effectiveOriginalPrice * variation);
      } else if (daysAgo >= 15) {
        // 15-24 days ago: Gradual decrease
        const progress = (25 - daysAgo) / 10;
        const targetPrice = effectiveOriginalPrice - (effectiveOriginalPrice - currentPrice) * (progress * 0.5);
        const variation = 0.95 + Math.random() * 0.1;
        priceAtPoint = Math.round(targetPrice * variation);
      } else if (daysAgo >= 7) {
        // 7-14 days ago: Getting closer to current
        const progress = (15 - daysAgo) / 8;
        const targetPrice = effectiveOriginalPrice - (effectiveOriginalPrice - currentPrice) * (0.5 + progress * 0.3);
        const variation = 0.97 + Math.random() * 0.06;
        priceAtPoint = Math.round(targetPrice * variation);
      } else {
        // 1-6 days ago: Near current price
        const variation = 0.98 + Math.random() * 0.05;
        priceAtPoint = Math.round(currentPrice * variation);
      }

      // Ensure price stays within bounds
      priceAtPoint = Math.max(currentPrice, Math.min(priceAtPoint, effectiveOriginalPrice));

      // Occasional flash sale dips (10% chance)
      if (Math.random() < 0.1 && daysAgo > 2) {
        priceAtPoint = Math.round(priceAtPoint * (0.85 + Math.random() * 0.1));
      }

      historyEntries.push({
        dealId,
        price: priceAtPoint,
        originalPrice: originalPrice ? Math.round(originalPrice) : null,
        merchant: merchant || 'Unknown',
        scrapedAt: date,
        source: 'demo',
      });
    }

    // Insert all history entries
    if (historyEntries.length > 0) {
      await db.insert(priceHistory).values(historyEntries as any);
    }

    console.log(`Generated ${historyEntries.length} demo price history entries for deal ${dealId}`);
  } catch (err) {
    console.error('Failed to generate demo price history:', err);
  }
}

const createDealSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  price: z.number().int().positive(),
  originalPrice: z.number().int().positive().optional(),
  merchant: z.string().min(2).max(100),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
  festiveTags: z.array(z.string()).optional(),
  seasonalTag: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const createDeal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const data = createDealSchema.parse(req.body);

    // Check for duplicate deals using ML deduplication
    const duplicateCheck = await MlDeduplicationService.checkForDuplicates({
      title: data.title,
      price: data.price,
      merchant: data.merchant,
      url: data.url || null,
    });

    let replacingDealId: string | null = null;
    let oldPriceHistory: any[] = [];

    if (duplicateCheck.isDuplicate && duplicateCheck.matchedDealId) {
      const existingPrice = duplicateCheck.matchedDealPrice || Infinity;

      if (data.price < existingPrice) {
        // Better price - replace the old deal
        console.log(`[Deals] 🔄 Better price found! Replacing deal ${duplicateCheck.matchedDealId}`);
        console.log(`[Deals]   Existing: ₹${existingPrice} → New: ₹${data.price}`);
        replacingDealId = duplicateCheck.matchedDealId;

        // Get old price history before deleting
        oldPriceHistory = await db
          .select()
          .from(priceHistory)
          .where(eq(priceHistory.dealId, replacingDealId));

        // Delete the old deal
        await db.delete(deals).where(eq(deals.id, replacingDealId));

        // Delete from Elasticsearch
        deleteDeal(replacingDealId).catch((err) => {
          console.error('Failed to delete old deal from Elasticsearch:', err);
        });

        console.log(`[Deals] ✅ Deleted old deal ${replacingDealId}`);
      } else {
        // Same or higher price - reject the duplicate
        res.status(409).json({
          error: 'Duplicate deal exists',
          message: `A similar deal already exists at ₹${existingPrice}. Your price (₹${data.price}) is not better.`,
          existingDealId: duplicateCheck.matchedDealId,
          similarityScore: duplicateCheck.similarityScore,
        });
        return;
      }
    }

    // Calculate discount percentage if original price provided
    let discountPercentage: number | undefined;
    if (data.originalPrice && data.originalPrice > data.price) {
      discountPercentage = Math.round(
        ((data.originalPrice - data.price) / data.originalPrice) * 100
      );
    }

    const [deal] = await db
      .insert(deals)
      .values({
        ...data,
        userId,
        discountPercentage,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      })
      .returning();

    // If we replaced a deal, restore the old price history
    if (oldPriceHistory.length > 0) {
      console.log(`[Deals] 📊 Restoring ${oldPriceHistory.length} price history entries...`);
      for (const entry of oldPriceHistory) {
        await db.insert(priceHistory).values({
          dealId: deal.id,
          price: entry.price,
          originalPrice: entry.originalPrice,
          merchant: entry.merchant,
          source: entry.source,
          scrapedAt: entry.scrapedAt,
        } as any).catch((err) => {
          console.error('Failed to restore price history entry:', err);
        });
      }
      console.log(`[Deals] ✅ Restored price history from previous deal`);
    }

    // Fetch with user info
    const dealWithUser = await db.query.deals.findFirst({
      where: eq(deals.id, deal.id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        category: true,
      },
    });

    // Create initial price history entry (today's price)
    await db.insert(priceHistory).values({
      dealId: deal.id,
      price: deal.price,
      merchant: deal.merchant,
      source: replacingDealId ? 'price_update' : 'manual',
    } as any).catch((err) => {
      console.error('Failed to create initial price history entry:', err);
    });

    // Generate demo price history (30 days of historical data) - only for new deals, not replacements
    if (!replacingDealId) {
      generateDemoPriceHistory(
        deal.id,
        deal.price,
        deal.originalPrice,
        deal.merchant
      ).catch((err) => {
        console.error('Failed to generate demo price history:', err);
      });
    }

    // Calculate and save AI quality score immediately
    try {
      const aiResult = await DealQualityService.calculateScore(deal.id);
      await db.update(deals).set({
        aiScore: aiResult.totalScore,
        aiScoreBreakdown: aiResult.breakdown,
      }).where(eq(deals.id, deal.id));

      // Update the response object with AI score
      if (dealWithUser) {
        (dealWithUser as any).aiScore = aiResult.totalScore;
        (dealWithUser as any).aiScoreBreakdown = aiResult.breakdown;
      }
    } catch (err) {
      console.error('Failed to calculate AI score for new deal:', err);
    }

    // Run fraud detection analysis (cost-free, local algorithms)
    try {
      const fraudResult = await FraudDetectionService.analyzeAndSave(deal.id);

      // Update the response object with fraud score
      if (dealWithUser) {
        (dealWithUser as any).fraudRiskScore = fraudResult.overallRiskScore;
      }

      // Log high-risk deals for monitoring
      if (fraudResult.overallRiskScore >= 60) {
        console.log(`[Fraud Detection] ⚠️ High-risk deal detected: ${deal.id}`);
        console.log(`[Fraud Detection]   Risk Score: ${fraudResult.overallRiskScore}`);
        console.log(`[Fraud Detection]   Flags: ${fraudResult.flags.join(', ')}`);
        console.log(`[Fraud Detection]   Action: ${fraudResult.autoAction}`);
      }
    } catch (err) {
      console.error('Failed to run fraud detection for new deal:', err);
    }

    // Index in Elasticsearch asynchronously (if enabled)
    if (dealWithUser && isFeatureEnabled('ELASTICSEARCH')) {
      indexDeal({
        id: dealWithUser.id,
        title: dealWithUser.title,
        description: dealWithUser.description,
        price: dealWithUser.price,
        originalPrice: dealWithUser.originalPrice,
        discountPercentage: dealWithUser.discountPercentage,
        merchant: dealWithUser.merchant,
        url: dealWithUser.url,
        imageUrl: dealWithUser.imageUrl,
        categoryId: dealWithUser.categoryId,
        categoryName: dealWithUser.category?.name || null,
        userId: dealWithUser.userId,
        username: dealWithUser.user?.username || 'Unknown',
        upvotes: dealWithUser.upvotes,
        downvotes: dealWithUser.downvotes,
        score: dealWithUser.upvotes - dealWithUser.downvotes,
        commentCount: dealWithUser.commentCount,
        viewCount: dealWithUser.viewCount,
        isExpired: dealWithUser.isExpired,
        festiveTags: dealWithUser.festiveTags,
        seasonalTag: dealWithUser.seasonalTag,
        createdAt: dealWithUser.createdAt,
        updatedAt: dealWithUser.updatedAt,
      }).catch((err) => {
        console.error('Failed to index deal in Elasticsearch:', err);
      });
    }

    if (dealWithUser) {
      // Invalidate deals cache
      invalidateDealsCache().catch((err) => {
        console.error('Failed to invalidate deals cache:', err);
      });

      // Process alerts for the new deal
      import('../services/alert-matcher.service.js')
        .then(({ processNewDeal }) => {
          processNewDeal(dealWithUser).catch((err) => {
            console.error('Failed to process alerts for new deal:', err);
          });
        })
        .catch((err) => {
          console.error('Failed to import alert matcher service:', err);
        });

      // Trigger automated deal verification
      import('../services/queue.service.js')
        .then(({ addJob, dealVerifierQueue }) => {
          addJob(dealVerifierQueue, 'verify-single-deal', {
            type: 'verify-single-deal',
            dealId: dealWithUser.id,
            verificationType: 'initial',
          }, {
            delay: 5000, // Wait 5 seconds before verification
            priority: 1, // High priority for new deals
          }).catch((err) => {
            console.error('Failed to queue deal verification:', err);
          });
        })
        .catch((err) => {
          console.error('Failed to import queue service:', err);
        });
    }

    res.status(201).json(dealWithUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDeals = async (req: AuthRequest, res: Response) => {
  try {
    const {
      tab = 'frontpage',
      category,
      search,
      merchant,
      festive,
      userId, // Filter by specific user
      limit = '20',
      offset = '0',
      preferredCategories, // Anonymous user's preferred categories
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string), 100);
    const offsetNum = parseInt(offset as string);

    // Handle personalized deals (both authenticated and anonymous users)
    if (tab === 'personalized') {
      let personalizedDeals: any[] = [];

      if (req.userId) {
        // Authenticated user - use server-side activity tracking
        personalizedDeals = await getPersonalizedDeals(req.userId, limitNum);
      } else if (preferredCategories) {
        // Anonymous user - use client-side preferred categories
        const categoryIds = (preferredCategories as string).split(',').filter(Boolean);
        if (categoryIds.length > 0) {
          personalizedDeals = await db.query.deals.findMany({
            where: and(
              eq(deals.isExpired, false),
              inArray(deals.categoryId, categoryIds),
              gte(deals.price, 100), // Filter out placeholder prices (₹1)
              sql`(${deals.upvotes} - ${deals.downvotes}) >= 0` // Only show deals with non-negative score
            ),
            orderBy: desc(sql`(${deals.upvotes} - ${deals.downvotes})`),
            limit: limitNum,
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  reputation: true,
                },
              },
              category: true,
            },
          });
        } else {
          personalizedDeals = [];
        }
      } else {
        personalizedDeals = [];
      }

      let userVotes: Record<string, number> = {};
      if (req.userId && personalizedDeals && personalizedDeals.length > 0) {
        const userVotesList = await db.query.votes.findMany({
          where: and(
            eq(votes.userId, req.userId),
            inArray(votes.dealId, personalizedDeals.map((d) => d.id))
          ),
        });
        userVotes = Object.fromEntries(
          userVotesList.map((v) => [v.dealId, v.voteType])
        );
      }

      const dealsWithVotes = (personalizedDeals || []).map((deal) => ({
        ...deal,
        score: deal.upvotes - deal.downvotes,
        userVote: userVotes[deal.id] || 0,
      }));

      res.json({
        deals: dealsWithVotes,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: false,
        },
      });
      return;
    }

    // Build WHERE conditions
    const conditions = [];

    // Filter out placeholder/invalid prices (deals with price <= 100 paise = ₹1)
    // These are deals where price extraction failed during scraping
    conditions.push(gte(deals.price, 100));

    // Filter expired deals (skip this filter if we're filtering by userId to show user's expired deals too)
    if (!userId) {
      conditions.push(eq(deals.isExpired, false));
    }

    // User filter (for profile pages)
    if (userId) {
      conditions.push(eq(deals.userId, userId as string));
    }

    // Festive deals filter
    if (festive === 'true') {
      conditions.push(isNotNull(deals.festiveTags));
    }

    // Category filter
    if (category) {
      conditions.push(eq(deals.categoryId, category as string));
    }

    // Merchant filter (case-insensitive contains match)
    if (merchant) {
      conditions.push(ilike(deals.merchant, `%${merchant}%`));
    }

    // Search filter
    if (search) {
      conditions.push(
        or(
          ilike(deals.title, `%${search}%`),
          ilike(deals.description, `%${search}%`)
        )!
      );
    }

    // Tab-based sorting (client-side filtering is now done in frontend)
    let orderBy;

    if (userId) {
      // Profile page: show ALL user's deals, sorted by creation date (newest first)
      orderBy = desc(deals.createdAt);
    } else if (tab === 'new') {
      // New tab: sort by creation date (newest first)
      orderBy = desc(deals.createdAt);
    } else if (festive === 'true') {
      // Festive deals: sort by score
      orderBy = desc(sql`(${deals.upvotes} - ${deals.downvotes})`);
    } else {
      // Default: sort by score first, then by creation date
      orderBy = [desc(sql`(${deals.upvotes} - ${deals.downvotes})`), desc(deals.createdAt)];
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const dealsList = await db.query.deals.findMany({
      where: whereClause,
      orderBy,
      limit: limitNum,
      offset: offsetNum,
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        category: true,
      },
    });

    // If user is authenticated, fetch their votes
    let userVotes: Record<string, number> = {};
    if (req.userId && dealsList.length > 0) {
      const userVotesList = await db.query.votes.findMany({
        where: and(
          eq(votes.userId, req.userId),
          inArray(votes.dealId, dealsList.map((d) => d.id))
        ),
      });
      userVotes = Object.fromEntries(
        userVotesList.map((v) => [v.dealId, v.voteType])
      );
    }

    const dealsWithVotes = dealsList.map((deal) => ({
      ...deal,
      score: deal.upvotes - deal.downvotes,
      userVote: userVotes[deal.id] || 0,
    }));

    res.json({
      deals: dealsWithVotes,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: dealsList.length === limitNum,
      },
    });
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to get personalized deals based on user activity
async function getPersonalizedDeals(userId: string, limit: number) {
  try {
    // Get user's recently viewed categories (last 30 days)
    const recentActivity = await db
      .select({
        categoryId: userActivity.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          isNotNull(userActivity.categoryId),
          sql`${userActivity.createdAt} >= NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(userActivity.categoryId)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    if (recentActivity.length === 0) {
      // If no activity, return trending deals (score >= 20)
      return db.query.deals.findMany({
        where: and(
          eq(deals.isExpired, false),
          gte(deals.price, 100), // Filter out placeholder prices (₹1)
          sql`(${deals.upvotes} - ${deals.downvotes}) >= 20`
        ),
        orderBy: desc(sql`(${deals.upvotes} - ${deals.downvotes})`),
        limit,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
      });
    }

    // Get deals from user's preferred categories
    const categoryIds = recentActivity
      .map((a) => a.categoryId)
      .filter((id): id is string => id !== null);

    return db.query.deals.findMany({
      where: and(
        eq(deals.isExpired, false),
        inArray(deals.categoryId, categoryIds),
        gte(deals.price, 100), // Filter out placeholder prices (₹1)
        sql`(${deals.upvotes} - ${deals.downvotes}) >= 0` // Only show deals with non-negative score
      ),
      orderBy: desc(sql`(${deals.upvotes} - ${deals.downvotes})`),
      limit,
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        category: true,
      },
    });
  } catch (error) {
    console.error('Error getting personalized deals:', error);
    return [];
  }
}

export const getDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, id),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            reputation: true,
          },
        },
        category: true,
      },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    let userVote = 0;
    if (req.userId) {
      const vote = await db.query.votes.findFirst({
        where: and(eq(votes.userId, req.userId), eq(votes.dealId, id)),
      });
      userVote = vote?.voteType || 0;
    }

    res.json({
      ...deal,
      score: deal.upvotes - deal.downvotes,
      userVote,
    });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const voteDeal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { voteType } = z
      .object({ voteType: z.number().int().min(-1).max(1) })
      .parse(req.body);

    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, id),
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Check existing vote
    const existingVote = await db.query.votes.findFirst({
      where: and(eq(votes.userId, userId), eq(votes.dealId, id)),
    });

    if (voteType === 0) {
      // Remove vote
      if (existingVote) {
        await db.delete(votes).where(eq(votes.id, existingVote.id));

        // Update deal counts
        if (existingVote.voteType === 1) {
          await db
            .update(deals)
            .set({ upvotes: sql`${deals.upvotes} - 1` })
            .where(eq(deals.id, id));
        } else {
          await db
            .update(deals)
            .set({ downvotes: sql`${deals.downvotes} - 1` })
            .where(eq(deals.id, id));
        }
      }
    } else {
      if (existingVote) {
        // Update existing vote
        if (existingVote.voteType !== voteType) {
          await db.update(votes).set({ voteType }).where(eq(votes.id, existingVote.id));

          // Update deal counts (swap)
          if (voteType === 1) {
            await db
              .update(deals)
              .set({
                upvotes: sql`${deals.upvotes} + 1`,
                downvotes: sql`${deals.downvotes} - 1`,
              })
              .where(eq(deals.id, id));
          } else {
            await db
              .update(deals)
              .set({
                upvotes: sql`${deals.upvotes} - 1`,
                downvotes: sql`${deals.downvotes} + 1`,
              })
              .where(eq(deals.id, id));
          }
        }
      } else {
        // Create new vote
        await db.insert(votes).values({ userId, dealId: id, voteType });

        // Update deal counts
        if (voteType === 1) {
          await db
            .update(deals)
            .set({ upvotes: sql`${deals.upvotes} + 1` })
            .where(eq(deals.id, id));
        } else {
          await db
            .update(deals)
            .set({ downvotes: sql`${deals.downvotes} + 1` })
            .where(eq(deals.id, id));
        }
      }
    }

    // Fetch updated deal
    const updatedDeal = await db.query.deals.findFirst({
      where: eq(deals.id, id),
    });

    // Update Elasticsearch asynchronously with new vote counts (if enabled)
    if (updatedDeal && isFeatureEnabled('ELASTICSEARCH')) {
      updateDeal(id, {
        upvotes: updatedDeal.upvotes,
        downvotes: updatedDeal.downvotes,
        score: updatedDeal.upvotes - updatedDeal.downvotes,
      }).catch((err) => {
        console.error('Failed to update deal votes in Elasticsearch:', err);
      });
    }

    if (updatedDeal) {
      // Invalidate cache for this deal and deals lists
      invalidateDealCache(id).catch((err) => {
        console.error('Failed to invalidate deal cache:', err);
      });
    }

    res.json({
      upvotes: updatedDeal!.upvotes,
      downvotes: updatedDeal!.downvotes,
      score: updatedDeal!.upvotes - updatedDeal!.downvotes,
      userVote: voteType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Vote deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const trackActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { activityType } = z
      .object({ activityType: z.enum(['view', 'click', 'vote', 'comment']) })
      .parse(req.body);

    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, id),
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    // Track the activity
    await db.insert(userActivity).values({
      userId,
      dealId: id,
      categoryId: deal.categoryId || null,
      activityType,
    });

    // Increment view count if it's a view
    if (activityType === 'view') {
      await db
        .update(deals)
        .set({ viewCount: sql`${deals.viewCount} + 1` })
        .where(eq(deals.id, id));

      // Update view count in Elasticsearch asynchronously (if enabled)
      if (isFeatureEnabled('ELASTICSEARCH')) {
        const updatedDeal = await db.query.deals.findFirst({
          where: eq(deals.id, id),
          columns: { viewCount: true },
        });

        if (updatedDeal) {
          updateDeal(id, {
            viewCount: updatedDeal.viewCount,
          }).catch((err) => {
            console.error('Failed to update view count in Elasticsearch:', err);
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Track activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get fallback image for a deal when the original image fails
 * Attempts to extract image from merchant URL (Amazon/Flipkart)
 */
export const getImageFallback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, id),
      columns: {
        url: true,
        imageUrl: true,
      },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    if (!deal.url) {
      res.status(400).json({ error: 'No merchant URL available' });
      return;
    }

    // Import dynamically to avoid loading cheerio unless needed
    const { getImageFallback: fetchImage } = await import(
      '../services/image-fallback.service.js'
    );
    const result = await fetchImage(deal.url);

    if (result.success && result.imageUrl) {
      // Optionally update the deal's imageUrl in database
      await db.update(deals).set({ imageUrl: result.imageUrl }).where(eq(deals.id, id));

      res.json({
        success: true,
        imageUrl: result.imageUrl,
        source: result.source,
      });
    } else {
      res.json({
        success: false,
        imageUrl: null,
        source: result.source,
      });
    }
  } catch (error) {
    console.error('Image fallback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
