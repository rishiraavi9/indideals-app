import { Request, Response } from 'express';
import { z } from 'zod';
import {
  searchDeals,
  getAutocompleteSuggestions,
  getSearchAggregations,
} from '../services/elasticsearch.service.js';
import type { AuthRequest } from '../middleware/auth.js';
import { cacheAside, CachePrefix, CacheTTL } from '../services/cache.service.js';

const searchDealsSchema = z.object({
  q: z.string().optional(),
  categoryIds: z.string().optional(), // Comma-separated
  merchants: z.string().optional(), // Comma-separated
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minScore: z.string().optional(),
  festiveTags: z.string().optional(), // Comma-separated
  seasonalTag: z.string().optional(),
  from: z.string().optional(),
  size: z.string().optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'score', 'date']).optional(),
});

export const search = async (req: Request, res: Response) => {
  try {
    const params = searchDealsSchema.parse(req.query);

    // Create cache key from search parameters
    const cacheKey = `${CachePrefix.SEARCH}:${JSON.stringify(params)}`;

    const result = await cacheAside(cacheKey, CacheTTL.SHORT, async () => {
      return searchDeals({
        query: params.q,
        categoryIds: params.categoryIds?.split(',').filter(Boolean),
        merchants: params.merchants?.split(',').filter(Boolean),
        minPrice: params.minPrice ? parseInt(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? parseInt(params.maxPrice) : undefined,
        minScore: params.minScore ? parseInt(params.minScore) : undefined,
        festiveTags: params.festiveTags?.split(',').filter(Boolean),
        seasonalTag: params.seasonalTag,
        from: params.from ? parseInt(params.from) : 0,
        size: params.size ? Math.min(parseInt(params.size), 100) : 20,
        sortBy: params.sortBy || 'relevance',
      });
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid search parameters', details: error.errors });
      return;
    }
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const autocomplete = async (req: Request, res: Response) => {
  try {
    const { q, size } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const sizeNum = size ? Math.min(parseInt(size as string), 20) : 10;
    const suggestions = await getAutocompleteSuggestions(q, sizeNum);

    res.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
};

export const aggregations = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const query = q ? String(q) : undefined;

    // Cache aggregations for 5 minutes
    const cacheKey = `${CachePrefix.AGGREGATIONS}:${query || 'all'}`;

    const aggs = await cacheAside(cacheKey, CacheTTL.MEDIUM, async () => {
      return getSearchAggregations(query);
    });

    res.json(aggs);
  } catch (error) {
    console.error('Aggregations error:', error);
    res.status(500).json({ error: 'Failed to get aggregations' });
  }
};
