import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { deals, users, categories } from '../db/schema.js';
import { eq, desc, asc, sql, and, or, ilike, gte, lte, inArray } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';
import { cacheAside, CachePrefix, CacheTTL } from '../services/cache.service.js';

const searchDealsSchema = z.object({
  q: z.string().optional(),
  categoryIds: z.string().optional(), // Comma-separated
  merchants: z.string().optional(), // Comma-separated
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minScore: z.string().optional(),
  minDiscount: z.string().optional(),
  festiveTags: z.string().optional(), // Comma-separated
  seasonalTag: z.string().optional(),
  from: z.string().optional(),
  size: z.string().optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'score', 'date']).optional(),
  showExpired: z.string().optional(),
});

/**
 * PostgreSQL-based search with full filtering support
 */
export const search = async (req: Request, res: Response) => {
  try {
    const params = searchDealsSchema.parse(req.query);

    const query = params.q?.trim();
    const categoryIds = params.categoryIds?.split(',').filter(Boolean);
    const merchants = params.merchants?.split(',').filter(Boolean);
    const minPrice = params.minPrice ? parseInt(params.minPrice) : undefined;
    const maxPrice = params.maxPrice ? parseInt(params.maxPrice) : undefined;
    const minScore = params.minScore ? parseInt(params.minScore) : undefined;
    const minDiscount = params.minDiscount ? parseInt(params.minDiscount) : undefined;
    const from = params.from ? parseInt(params.from) : 0;
    const size = params.size ? Math.min(parseInt(params.size), 100) : 20;
    const sortBy = params.sortBy || 'relevance';
    const showExpired = params.showExpired === 'true';

    // Build conditions
    const conditions: any[] = [];

    // Expired filter
    if (!showExpired) {
      conditions.push(eq(deals.isExpired, false));
    }

    // Text search (title and description)
    if (query) {
      conditions.push(
        or(
          ilike(deals.title, `%${query}%`),
          ilike(deals.description, `%${query}%`),
          ilike(deals.merchant, `%${query}%`)
        )
      );
    }

    // Category filter
    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(deals.categoryId, categoryIds));
    }

    // Merchant filter
    if (merchants && merchants.length > 0) {
      const merchantConditions = merchants.map(m => ilike(deals.merchant, `%${m}%`));
      conditions.push(or(...merchantConditions));
    }

    // Price range filter
    if (minPrice !== undefined) {
      conditions.push(gte(deals.price, minPrice));
    }
    if (maxPrice !== undefined) {
      conditions.push(lte(deals.price, maxPrice));
    }

    // Score filter
    if (minScore !== undefined) {
      conditions.push(sql`(${deals.upvotes} - ${deals.downvotes}) >= ${minScore}`);
    }

    // Discount filter
    if (minDiscount !== undefined) {
      conditions.push(gte(deals.discountPercentage, minDiscount));
    }

    // Build order by
    let orderBy: any[];
    switch (sortBy) {
      case 'price_asc':
        orderBy = [asc(deals.price)];
        break;
      case 'price_desc':
        orderBy = [desc(deals.price)];
        break;
      case 'score':
        orderBy = [desc(sql`(${deals.upvotes} - ${deals.downvotes})`), desc(deals.createdAt)];
        break;
      case 'date':
        orderBy = [desc(deals.createdAt)];
        break;
      case 'relevance':
      default:
        // For relevance, prioritize: exact title match > title contains > description contains
        // Also factor in score and recency
        orderBy = [
          desc(sql`(${deals.upvotes} - ${deals.downvotes})`),
          desc(deals.createdAt)
        ];
        break;
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute search query
    const dealsList = await db.query.deals.findMany({
      where: whereClause,
      orderBy,
      limit: size,
      offset: from,
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            reputation: true,
          },
        },
        category: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Transform results to match expected format
    const transformedDeals = dealsList.map(deal => ({
      ...deal,
      _score: 1, // PostgreSQL doesn't provide relevance scores like ES
      score: deal.upvotes - deal.downvotes,
      categoryName: deal.category?.name || null,
      username: deal.user?.username || 'unknown',
    }));

    res.json({
      deals: transformedDeals,
      total,
      took: 0, // PostgreSQL doesn't provide timing like ES
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
      return;
    }
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * Simple autocomplete using PostgreSQL
 */
export const autocomplete = async (req: Request, res: Response) => {
  try {
    const { q, size } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({ suggestions: [] });
      return;
    }

    const sizeNum = size ? Math.min(parseInt(size as string), 20) : 10;
    const query = q.trim();

    // Search for matching deals
    const matchingDeals = await db.query.deals.findMany({
      where: and(
        eq(deals.isExpired, false),
        or(
          ilike(deals.title, `%${query}%`),
          ilike(deals.merchant, `%${query}%`)
        )
      ),
      columns: {
        title: true,
        merchant: true,
        categoryId: true,
      },
      limit: sizeNum,
      orderBy: [desc(sql`(${deals.upvotes} - ${deals.downvotes})`)],
    });

    // Get category names
    const categoryIds = [...new Set(matchingDeals.map(d => d.categoryId).filter(Boolean))] as string[];
    let categoryMap: Record<string, string> = {};

    if (categoryIds.length > 0) {
      const cats = await db.query.categories.findMany({
        where: inArray(categories.id, categoryIds),
        columns: { id: true, name: true },
      });
      categoryMap = Object.fromEntries(cats.map(c => [c.id, c.name]));
    }

    const suggestions = matchingDeals.map(deal => ({
      title: deal.title,
      merchant: deal.merchant,
      categoryName: deal.categoryId ? categoryMap[deal.categoryId] || null : null,
    }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.json({ suggestions: [] }); // Return empty instead of error for better UX
  }
};

/**
 * Get aggregations (facets) for filtering using PostgreSQL
 */
export const aggregations = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const query = q ? String(q).trim() : undefined;

    // Base condition: non-expired deals
    const baseCondition = eq(deals.isExpired, false);

    // Add search condition if query provided
    const whereClause = query
      ? and(baseCondition, or(
          ilike(deals.title, `%${query}%`),
          ilike(deals.description, `%${query}%`)
        ))
      : baseCondition;

    // Get category aggregations
    const categoryAggs = await db
      .select({
        categoryId: deals.categoryId,
        count: sql<number>`count(*)`,
      })
      .from(deals)
      .where(whereClause)
      .groupBy(deals.categoryId);

    // Get category names
    const categoryIds = categoryAggs
      .map(c => c.categoryId)
      .filter((id): id is string => id !== null);

    let categoryNames: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const cats = await db.query.categories.findMany({
        where: inArray(categories.id, categoryIds),
        columns: { id: true, name: true },
      });
      categoryNames = Object.fromEntries(cats.map(c => [c.id, c.name]));
    }

    // Get merchant aggregations
    const merchantAggs = await db
      .select({
        merchant: deals.merchant,
        count: sql<number>`count(*)`,
      })
      .from(deals)
      .where(whereClause)
      .groupBy(deals.merchant)
      .orderBy(desc(sql`count(*)`))
      .limit(50);

    // Get price range stats
    const priceStats = await db
      .select({
        minPrice: sql<number>`min(${deals.price})`,
        maxPrice: sql<number>`max(${deals.price})`,
      })
      .from(deals)
      .where(whereClause);

    // Build price range buckets
    const priceRanges = [
      { key: 'Under ₹500', to: 500 },
      { key: '₹500-₹1000', from: 500, to: 1000 },
      { key: '₹1000-₹5000', from: 1000, to: 5000 },
      { key: '₹5000-₹10000', from: 5000, to: 10000 },
      { key: '₹10000-₹25000', from: 10000, to: 25000 },
      { key: 'Over ₹25000', from: 25000 },
    ];

    // Get discount range aggregations
    const discountAggs = await db
      .select({
        range: sql<string>`
          CASE
            WHEN ${deals.discountPercentage} >= 50 THEN '50%+'
            WHEN ${deals.discountPercentage} >= 25 THEN '25-50%'
            WHEN ${deals.discountPercentage} >= 10 THEN '10-25%'
            ELSE 'Under 10%'
          END
        `,
        count: sql<number>`count(*)`,
      })
      .from(deals)
      .where(whereClause)
      .groupBy(sql`
        CASE
          WHEN ${deals.discountPercentage} >= 50 THEN '50%+'
          WHEN ${deals.discountPercentage} >= 25 THEN '25-50%'
          WHEN ${deals.discountPercentage} >= 10 THEN '10-25%'
          ELSE 'Under 10%'
        END
      `);

    res.json({
      categories: {
        buckets: categoryAggs
          .filter(c => c.categoryId)
          .map(c => ({
            key: categoryNames[c.categoryId!] || c.categoryId,
            doc_count: Number(c.count),
          }))
          .sort((a, b) => b.doc_count - a.doc_count),
      },
      merchants: {
        buckets: merchantAggs.map(m => ({
          key: m.merchant,
          doc_count: Number(m.count),
        })),
      },
      priceRanges: {
        buckets: priceRanges.map(range => ({
          key: range.key,
          from: range.from,
          to: range.to,
          doc_count: 0, // Would need separate queries for accurate counts
        })),
      },
      discountRanges: {
        buckets: discountAggs.map(d => ({
          key: d.range,
          doc_count: Number(d.count),
        })),
      },
    });
  } catch (error) {
    console.error('Aggregations error:', error);
    res.status(500).json({ error: 'Failed to get aggregations' });
  }
};
