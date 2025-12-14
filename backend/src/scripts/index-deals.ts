/**
 * Script to bulk index all existing deals into Elasticsearch
 * Run with: npx tsx src/scripts/index-deals.ts
 */

// IMPORTANT: Load dotenv FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now import everything else
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import {
  initializeIndex,
  bulkIndexDeals,
  checkHealth,
  type DealDocument,
} from '../services/elasticsearch.service.js';

async function indexAllDeals() {
  try {
    console.log('Starting Elasticsearch indexing process\n');

    // Check Elasticsearch health
    console.log('Step 1: Checking Elasticsearch health...');
    await checkHealth();

    // Initialize index
    console.log('\nStep 2: Initializing Elasticsearch index...');
    await initializeIndex();

    // Fetch all deals from PostgreSQL
    console.log('\nStep 3: Fetching deals from PostgreSQL...');

    // Create fresh db connection with env variables already loaded
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);
    const db = drizzle(client, { schema });

    // Fetch deals with joins
    const deals = await db
      .select({
        id: schema.deals.id,
        title: schema.deals.title,
        description: schema.deals.description,
        price: schema.deals.price,
        originalPrice: schema.deals.originalPrice,
        discountPercentage: schema.deals.discountPercentage,
        merchant: schema.deals.merchant,
        url: schema.deals.url,
        imageUrl: schema.deals.imageUrl,
        categoryId: schema.deals.categoryId,
        userId: schema.deals.userId,
        upvotes: schema.deals.upvotes,
        downvotes: schema.deals.downvotes,
        commentCount: schema.deals.commentCount,
        viewCount: schema.deals.viewCount,
        isExpired: schema.deals.isExpired,
        festiveTags: schema.deals.festiveTags,
        seasonalTag: schema.deals.seasonalTag,
        createdAt: schema.deals.createdAt,
        updatedAt: schema.deals.updatedAt,
        username: schema.users.username,
        categoryName: schema.categories.name,
      })
      .from(schema.deals)
      .leftJoin(schema.users, eq(schema.deals.userId, schema.users.id))
      .leftJoin(schema.categories, eq(schema.deals.categoryId, schema.categories.id));

    console.log(`   Found ${deals.length} deals to index`);

    if (deals.length === 0) {
      console.log('\nNo deals to index. Done!');
      await client.end();
      return;
    }

    // Transform deals to Elasticsearch documents
    console.log('\nStep 4: Transforming deals to Elasticsearch documents...');
    const documents: DealDocument[] = deals.map((deal) => ({
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
      categoryName: deal.categoryName || null,
      userId: deal.userId,
      username: deal.username || 'Unknown',
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
    }));

    // Bulk index in batches of 100
    console.log('\nStep 5: Bulk indexing deals...');
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(documents.length / batchSize);
      console.log(`   Indexing batch ${batchNum}/${totalBatches}...`);
      await bulkIndexDeals(batch);
    }

    console.log('\nSuccessfully indexed all deals!');
    console.log(`   Total: ${documents.length} deals`);
    console.log('\nIndexing complete!');

    // Close the database connection
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\nIndexing failed:', error);
    process.exit(1);
  }
}

indexAllDeals();
