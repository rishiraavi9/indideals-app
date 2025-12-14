#!/usr/bin/env tsx
import 'dotenv/config';
import { esClient, initializeIndex, indexDeal } from '../services/elasticsearch.service.js';
import { db } from '../db/index.js';

const DEALS_INDEX = 'deals';

async function reindexElasticsearch() {
  try {
    console.log('🔄 Starting Elasticsearch reindex...');

    // Delete existing index
    const indexExists = await esClient.indices.exists({ index: DEALS_INDEX });
    if (indexExists) {
      console.log('🗑️  Deleting existing index...');
      await esClient.indices.delete({ index: DEALS_INDEX });
      console.log('✅ Index deleted');
    }

    // Create new index with updated mappings and synonym support
    console.log('📝 Creating new index with synonym support...');
    await initializeIndex();
    console.log('✅ Index created with synonym support');

    // Fetch all deals from database
    console.log('📊 Fetching all deals from database...');
    const allDeals = await db.query.deals.findMany({
      with: {
        user: {
          columns: {
            username: true,
          },
        },
        category: {
          columns: {
            name: true,
          },
        },
      },
    });
    console.log(`📦 Found ${allDeals.length} deals to index`);

    // Index all deals
    let indexed = 0;
    for (const deal of allDeals) {
      try {
        await indexDeal({
          id: deal.id,
          title: deal.title,
          description: deal.description,
          price: deal.price,
          originalPrice: deal.originalPrice,
          discountPercentage: deal.discountPercentage,
          merchant: deal.merchant,
          url: deal.url,
          imageUrl: deal.imageUrl,
          categoryId: deal.categoryId,
          categoryName: deal.category?.name || null,
          userId: deal.userId,
          username: deal.user?.username || 'Unknown',
          upvotes: deal.upvotes,
          downvotes: deal.downvotes,
          score: deal.upvotes - deal.downvotes,
          commentCount: deal.commentCount,
          viewCount: deal.viewCount,
          isExpired: deal.isExpired,
          festiveTags: deal.festiveTags,
          seasonalTag: deal.seasonalTag,
          createdAt: deal.createdAt,
          updatedAt: deal.updatedAt,
        });
        indexed++;
        if (indexed % 10 === 0) {
          console.log(`⏳ Indexed ${indexed}/${allDeals.length} deals...`);
        }
      } catch (error) {
        console.error(`❌ Failed to index deal ${deal.id}:`, error);
      }
    }

    console.log(`✅ Successfully reindexed ${indexed} deals`);
    console.log('🎉 Reindex complete!');

    // Test synonym search
    console.log('\n🔍 Testing synonym search...');
    const testResult = await esClient.search({
      index: DEALS_INDEX,
      body: {
        query: {
          multi_match: {
            query: 'earphones',
            fields: ['title.synonym^4', 'description.synonym^3'],
          },
        },
        size: 5,
      },
    });

    console.log(`Found ${testResult.hits.hits.length} results for "earphones":`);
    testResult.hits.hits.forEach((hit: any) => {
      console.log(`  - ${hit._source.title} (score: ${hit._score})`);
    });

  } catch (error) {
    console.error('❌ Reindex failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

reindexElasticsearch();
