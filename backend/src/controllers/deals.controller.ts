import { Request, Response } from 'express';
import { z } from 'zod';
import { db, deals, votes, users, userActivity } from '../db/index.js';
import { eq, desc, sql, and, or, ilike, gte, inArray, isNotNull } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';
import { indexDeal, updateDeal, deleteDeal } from '../services/elasticsearch.service.js';
import {
  cacheAside,
  CachePrefix,
  CacheTTL,
  invalidateDealCache,
  invalidateDealsCache,
} from '../services/cache.service.js';

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

    // Index in Elasticsearch asynchronously
    if (dealWithUser) {
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

    // Merchant filter
    if (merchant) {
      conditions.push(ilike(deals.merchant, merchant as string));
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

    // Tab-based filtering and sorting (skip if filtering by userId for profile pages)
    let orderBy;

    if (userId) {
      // Profile page: show ALL user's deals, sorted by creation date (newest first)
      orderBy = desc(deals.createdAt);
    } else if (tab === 'frontpage') {
      // Frontpage: score >= 120
      conditions.push(sql`(${deals.upvotes} - ${deals.downvotes}) >= 120`);
      orderBy = desc(sql`(${deals.upvotes} - ${deals.downvotes})`);
    } else if (tab === 'popular') {
      // Popular: score between 50 and 119 (exclusive ranges)
      conditions.push(
        sql`(${deals.upvotes} - ${deals.downvotes}) >= 50 AND (${deals.upvotes} - ${deals.downvotes}) < 120`
      );
      orderBy = desc(sql`(${deals.upvotes} - ${deals.downvotes})`);
    } else if (festive === 'true') {
      // Festive deals: sort by score regardless of tab
      orderBy = desc(sql`(${deals.upvotes} - ${deals.downvotes})`);
    } else {
      // New tab: score < 50, sorted by creation date (newest first)
      conditions.push(sql`(${deals.upvotes} - ${deals.downvotes}) < 50`);
      orderBy = desc(deals.createdAt);
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

    // Update Elasticsearch asynchronously with new vote counts
    if (updatedDeal) {
      updateDeal(id, {
        upvotes: updatedDeal.upvotes,
        downvotes: updatedDeal.downvotes,
        score: updatedDeal.upvotes - updatedDeal.downvotes,
      }).catch((err) => {
        console.error('Failed to update deal votes in Elasticsearch:', err);
      });

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

      // Update view count in Elasticsearch asynchronously
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
