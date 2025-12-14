import { Client } from '@elastic/elasticsearch';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD;
const DEALS_INDEX = 'deals';

export const esClient = new Client({
  node: ELASTICSEARCH_URL,
  ...(ELASTICSEARCH_PASSWORD && {
    auth: {
      username: 'elastic',
      password: ELASTICSEARCH_PASSWORD,
    },
  }),
});

export interface DealDocument {
  id: string;
  title: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  discountPercentage: number | null;
  merchant: string;
  url: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  userId: string;
  username: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  viewCount: number;
  isExpired: boolean;
  festiveTags: string[] | null;
  seasonalTag: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Initialize Elasticsearch index with proper mappings
 */
export async function initializeIndex() {
  try {
    const indexExists = await esClient.indices.exists({ index: DEALS_INDEX });

    if (!indexExists) {
      await esClient.indices.create({
        index: DEALS_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                autocomplete_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'autocomplete_filter'],
                },
                autocomplete_search_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase'],
                },
                synonym_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'synonym_filter'],
                },
              },
              filter: {
                autocomplete_filter: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 20,
                },
                synonym_filter: {
                  type: 'synonym',
                  synonyms: [
                    // Audio devices
                    'earphones, earbuds, headphones, airpods, earpods, headset, earset',
                    'speakers, soundbar, sound bar, home theater, home theatre',
                    // Mobile devices
                    'phone, mobile, smartphone, cell phone, cellphone',
                    'tablet, ipad, tab',
                    // Computing
                    'laptop, notebook, ultrabook, macbook',
                    'computer, pc, desktop',
                    'monitor, display, screen',
                    'keyboard, keypad',
                    'mouse, mice',
                    // TV & Entertainment
                    'tv, television, smart tv, led tv, oled tv',
                    'streaming device, fire stick, firestick, chromecast, roku',
                    // Wearables
                    'smartwatch, smart watch, fitness band, fitness tracker',
                    // Storage
                    'ssd, solid state drive',
                    'hdd, hard drive, hard disk',
                    'pendrive, pen drive, usb drive, flash drive, thumb drive',
                    // Gaming
                    'console, playstation, ps5, ps4, xbox, nintendo switch',
                    'controller, gamepad, joystick',
                    // Camera
                    'camera, cam, dslr, mirrorless',
                    // Home appliances
                    'fridge, refrigerator',
                    'ac, air conditioner, air conditioning',
                    'washing machine, washer',
                    // Kitchen
                    'microwave, oven',
                    'mixer, blender, grinder',
                  ],
                },
              },
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'autocomplete_analyzer',
                search_analyzer: 'autocomplete_search_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                  standard: { type: 'text' },
                  synonym: {
                    type: 'text',
                    analyzer: 'synonym_analyzer',
                  },
                },
              },
              description: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                  synonym: {
                    type: 'text',
                    analyzer: 'synonym_analyzer',
                  },
                },
              },
              price: { type: 'integer' },
              originalPrice: { type: 'integer' },
              discountPercentage: { type: 'integer' },
              merchant: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              url: { type: 'keyword', index: false },
              imageUrl: { type: 'keyword', index: false },
              categoryId: { type: 'keyword' },
              categoryName: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              userId: { type: 'keyword' },
              username: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              upvotes: { type: 'integer' },
              downvotes: { type: 'integer' },
              score: { type: 'integer' },
              commentCount: { type: 'integer' },
              viewCount: { type: 'integer' },
              isExpired: { type: 'boolean' },
              festiveTags: { type: 'keyword' },
              seasonalTag: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`✅ Elasticsearch index "${DEALS_INDEX}" created successfully`);
    } else {
      console.log(`ℹ️  Elasticsearch index "${DEALS_INDEX}" already exists`);
    }
  } catch (error) {
    console.error('❌ Error initializing Elasticsearch index:', error);
    throw error;
  }
}

/**
 * Index a single deal document
 */
export async function indexDeal(deal: DealDocument) {
  try {
    await esClient.index({
      index: DEALS_INDEX,
      id: deal.id,
      document: deal,
      refresh: 'wait_for', // Make the document immediately searchable
    });
    console.log(`✅ Indexed deal: ${deal.id} - ${deal.title}`);
  } catch (error) {
    console.error(`❌ Error indexing deal ${deal.id}:`, error);
    throw error;
  }
}

/**
 * Bulk index multiple deals
 */
export async function bulkIndexDeals(deals: DealDocument[]) {
  if (deals.length === 0) return;

  try {
    const operations = deals.flatMap((deal) => [
      { index: { _index: DEALS_INDEX, _id: deal.id } },
      deal,
    ]);

    const response = await esClient.bulk({
      operations,
      refresh: 'wait_for',
    });

    if (response.errors) {
      const erroredDocuments: any[] = [];
      response.items.forEach((action: any, i: number) => {
        const operation = Object.keys(action)[0];
        if (action[operation]!.error) {
          erroredDocuments.push({
            status: action[operation]!.status,
            error: action[operation]!.error,
            operation: operations[i * 2],
            document: operations[i * 2 + 1],
          });
        }
      });
      console.error('❌ Bulk indexing errors:', erroredDocuments);
    } else {
      console.log(`✅ Bulk indexed ${deals.length} deals successfully`);
    }

    return response;
  } catch (error) {
    console.error('❌ Error bulk indexing deals:', error);
    throw error;
  }
}

/**
 * Update a deal document
 */
export async function updateDeal(dealId: string, partialDeal: Partial<DealDocument>) {
  try {
    await esClient.update({
      index: DEALS_INDEX,
      id: dealId,
      doc: partialDeal,
      refresh: 'wait_for',
    });
    console.log(`✅ Updated deal: ${dealId}`);
  } catch (error) {
    console.error(`❌ Error updating deal ${dealId}:`, error);
    throw error;
  }
}

/**
 * Delete a deal document
 */
export async function deleteDeal(dealId: string) {
  try {
    await esClient.delete({
      index: DEALS_INDEX,
      id: dealId,
      refresh: 'wait_for',
    });
    console.log(`✅ Deleted deal: ${dealId}`);
  } catch (error) {
    console.error(`❌ Error deleting deal ${dealId}:`, error);
    throw error;
  }
}

/**
 * Search deals with advanced features
 */
export interface SearchDealsParams {
  query?: string;
  categoryIds?: string[];
  merchants?: string[];
  minPrice?: number;
  maxPrice?: number;
  minScore?: number;
  isExpired?: boolean;
  festiveTags?: string[];
  seasonalTag?: string;
  from?: number;
  size?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'score' | 'date';
}

export async function searchDeals(params: SearchDealsParams) {
  const {
    query,
    categoryIds,
    merchants,
    minPrice,
    maxPrice,
    minScore,
    isExpired = false,
    festiveTags,
    seasonalTag,
    from = 0,
    size = 20,
    sortBy = 'relevance',
  } = params;

  try {
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search across multiple fields with synonym support
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: [
            'title^5',              // Highest weight for exact title match
            'title.synonym^4',      // Synonym matches in title
            'description^2',        // Description matches
            'description.synonym^3', // Synonym matches in description
            'merchant',             // Merchant name
            'categoryName^2'        // Category name
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',      // Allow typos
          operator: 'or',
        },
      });
    }

    // Filters
    if (categoryIds && categoryIds.length > 0) {
      filter.push({ terms: { categoryId: categoryIds } });
    }

    if (merchants && merchants.length > 0) {
      filter.push({ terms: { 'merchant.keyword': merchants } });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.push({
        range: {
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        },
      });
    }

    if (minScore !== undefined) {
      filter.push({ range: { score: { gte: minScore } } });
    }

    filter.push({ term: { isExpired } });

    if (festiveTags && festiveTags.length > 0) {
      filter.push({ terms: { festiveTags } });
    }

    if (seasonalTag) {
      filter.push({ term: { seasonalTag } });
    }

    // Sorting
    let sort: any;
    switch (sortBy) {
      case 'price_asc':
        sort = [{ price: 'asc' }];
        break;
      case 'price_desc':
        sort = [{ price: 'desc' }];
        break;
      case 'score':
        sort = [{ score: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'date':
        sort = [{ createdAt: 'desc' }];
        break;
      default:
        // Relevance (default Elasticsearch scoring)
        sort = ['_score', { createdAt: 'desc' }];
    }

    const response = await esClient.search({
      index: DEALS_INDEX,
      body: {
        from,
        size,
        query: {
          bool: {
            ...(must.length > 0 && { must }),
            filter,
          },
        },
        sort,
      },
    });

    const hits = response.hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
    }));

    return {
      deals: hits,
      total: (response.hits.total as { value: number }).value,
      took: response.took,
    };
  } catch (error) {
    console.error('❌ Error searching deals:', error);
    throw error;
  }
}

/**
 * Get autocomplete suggestions
 */
export async function getAutocompleteSuggestions(query: string, size: number = 10) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await esClient.search({
      index: DEALS_INDEX,
      body: {
        size,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query.trim(),
                  fields: ['title^3', 'merchant^2', 'categoryName'],
                  type: 'phrase_prefix',
                },
              },
            ],
            filter: [{ term: { isExpired: false } }],
          },
        },
        _source: ['title', 'merchant', 'categoryName'],
      },
    });

    return response.hits.hits.map((hit: any) => ({
      title: hit._source.title,
      merchant: hit._source.merchant,
      categoryName: hit._source.categoryName,
    }));
  } catch (error) {
    console.error('❌ Error getting autocomplete suggestions:', error);
    throw error;
  }
}

/**
 * Get aggregations (facets) for filtering
 */
export async function getSearchAggregations(query?: string) {
  try {
    const response = await esClient.search({
      index: DEALS_INDEX,
      body: {
        size: 0, // We only want aggregations, not documents
        query: query
          ? {
              bool: {
                must: [
                  {
                    multi_match: {
                      query,
                      fields: ['title^3', 'description^2', 'merchant'],
                    },
                  },
                ],
                filter: [{ term: { isExpired: false } }],
              },
            }
          : {
              bool: {
                filter: [{ term: { isExpired: false } }],
              },
            },
        aggs: {
          categories: {
            terms: {
              field: 'categoryName.keyword',
              size: 20,
            },
          },
          merchants: {
            terms: {
              field: 'merchant.keyword',
              size: 50,
            },
          },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { key: 'Under ₹500', to: 500 },
                { key: '₹500-₹1000', from: 500, to: 1000 },
                { key: '₹1000-₹5000', from: 1000, to: 5000 },
                { key: '₹5000-₹10000', from: 5000, to: 10000 },
                { key: '₹10000-₹25000', from: 10000, to: 25000 },
                { key: 'Over ₹25000', from: 25000 },
              ],
            },
          },
          discount_ranges: {
            range: {
              field: 'discountPercentage',
              ranges: [
                { key: '10-25%', from: 10, to: 25 },
                { key: '25-50%', from: 25, to: 50 },
                { key: '50%+', from: 50 },
              ],
            },
          },
        },
      },
    });

    return {
      categories: response.aggregations?.categories,
      merchants: response.aggregations?.merchants,
      priceRanges: response.aggregations?.price_ranges,
      discountRanges: response.aggregations?.discount_ranges,
    };
  } catch (error) {
    console.error('❌ Error getting search aggregations:', error);
    throw error;
  }
}

/**
 * Health check
 */
export async function checkHealth() {
  try {
    const health = await esClient.cluster.health();
    console.log('✅ Elasticsearch cluster health:', health.status);
    return health;
  } catch (error) {
    console.error('❌ Elasticsearch health check failed:', error);
    throw error;
  }
}
