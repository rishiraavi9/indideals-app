import { db } from './src/db/index.js';
import { deals, priceHistory } from './src/db/schema.js';
import { eq, like, and, gte } from 'drizzle-orm';

/**
 * Debug test to see what's being queried
 */

async function test() {
  console.log('\n🔍 DEBUG: Testing deduplication query\n');

  // Clean up first
  const testDeals = await db.select({ id: deals.id }).from(deals).where(like(deals.title, 'TEST:%'));
  for (const deal of testDeals) {
    await db.delete(priceHistory).where(eq(priceHistory.dealId, deal.id));
    await db.delete(deals).where(eq(deals.id, deal.id));
  }

  // Create test deal
  const [created] = await db.insert(deals).values({
    title: 'TEST: Sony WH-1000XM5 Wireless Headphones Black',
    price: 25000,
    originalPrice: 30000,
    merchant: 'Amazon',
    url: 'https://amazon.in/test-sony-xm5',
    description: 'Test deal',
    category: 'Electronics',
    imageUrl: null,
    isActive: true,
    upvotes: 0,
    downvotes: 0,
    source: 'test',
    aiQualityScore: null,
    aiQualityReason: null,
    userId: '3a007a0a-1a5d-4c6f-93a8-dc9de465a3c5',
  }).returning();

  console.log('Created deal:', created.id, created.title);
  console.log('Created at:', created.createdAt);

  // Wait a bit
  await new Promise(r => setTimeout(r, 200));

  // Query the way MlDeduplicationService does
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  console.log('\nQuerying with:');
  console.log('  sevenDaysAgo:', sevenDaysAgo.toISOString());
  console.log('  merchant: Amazon');

  const recentDeals = await db
    .select({
      id: deals.id,
      title: deals.title,
      price: deals.price,
      merchant: deals.merchant,
      url: deals.url,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .where(
      and(
        gte(deals.createdAt, sevenDaysAgo),
        eq(deals.merchant, 'Amazon')
      )
    )
    .limit(50);

  console.log(`\nFound ${recentDeals.length} Amazon deals in last 7 days:`);
  for (const d of recentDeals.slice(0, 10)) {
    console.log(`  - ${d.title.substring(0, 50)}... (₹${d.price}) [${d.createdAt}]`);
  }

  // Check if our test deal is in there
  const testDealFound = recentDeals.find(d => d.id === created.id);
  console.log('\nTest deal in results?', !!testDealFound);

  // Also directly query for the test deal
  const directQuery = await db.select().from(deals).where(eq(deals.id, created.id));
  console.log('Direct query for test deal:', directQuery.length > 0 ? 'FOUND' : 'NOT FOUND');
  if (directQuery.length > 0) {
    console.log('  createdAt:', directQuery[0].createdAt);
    console.log('  Is createdAt >= sevenDaysAgo?', directQuery[0].createdAt >= sevenDaysAgo);
  }

  // Cleanup
  await db.delete(priceHistory).where(eq(priceHistory.dealId, created.id));
  await db.delete(deals).where(eq(deals.id, created.id));
  console.log('\nCleanup done');

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
