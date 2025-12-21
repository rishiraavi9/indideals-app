import { db } from './src/db/index.js';
import { deals, priceHistory } from './src/db/schema.js';
import { eq, like } from 'drizzle-orm';
import { MlDeduplicationService } from './src/services/ml-deduplication.service.js';

/**
 * Test script for deduplication functionality
 * Tests both Telegram scraper dedup and user-submitted deal dedup
 */

async function testDeduplication() {
  console.log('\n🧪 DEDUPLICATION TEST SUITE\n');
  console.log('='.repeat(60));

  // Clean up any test deals first
  console.log('\n📋 Cleaning up previous test deals...');
  const testDeals = await db
    .select({ id: deals.id })
    .from(deals)
    .where(like(deals.title, 'TEST:%'));

  for (const deal of testDeals) {
    await db.delete(priceHistory).where(eq(priceHistory.dealId, deal.id));
    await db.delete(deals).where(eq(deals.id, deal.id));
  }
  console.log(`✅ Cleaned up ${testDeals.length} test deals\n`);

  let createdDealId: string | null = null;

  try {
    // Test 1: Create initial deal
    console.log('='.repeat(60));
    console.log('TEST 1: Create initial deal');
    console.log('='.repeat(60));

    const initialDeal = {
      title: 'TEST: Sony WH-1000XM5 Wireless Headphones Black',
      price: 25000,
      originalPrice: 30000,
      merchant: 'Amazon',
      url: 'https://amazon.in/test-sony-xm5',
      description: 'Premium noise cancelling headphones',
      category: 'Electronics',
      imageUrl: null,
      isActive: true,
      upvotes: 0,
      downvotes: 0,
      source: 'test',
      aiQualityScore: null,
      aiQualityReason: null,
      userId: '3a007a0a-1a5d-4c6f-93a8-dc9de465a3c5',
    };

    const [createdDeal] = await db.insert(deals).values(initialDeal).returning();
    createdDealId = createdDeal.id;
    console.log(`✅ Created initial deal: "${createdDeal.title}"`);
    console.log(`   ID: ${createdDeal.id}`);
    console.log(`   Price: ₹${createdDeal.price}`);
    console.log(`   Merchant: ${createdDeal.merchant}`);

    // Add initial price history
    await db.insert(priceHistory).values({
      dealId: createdDeal.id,
      price: 25000,
      merchant: 'Amazon',
      source: 'initial',
    });
    console.log('   Added to price history\n');

    // Small delay to ensure the deal is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test 2: EXACT same title (should definitely be duplicate)
    console.log('='.repeat(60));
    console.log('TEST 2: EXACT same title with HIGHER price');
    console.log('='.repeat(60));

    const exactSameDeal = {
      title: 'TEST: Sony WH-1000XM5 Wireless Headphones Black',
      price: 27000,
      merchant: 'Amazon',
      url: null,
    };

    const exactCheck = await MlDeduplicationService.checkForDuplicates(exactSameDeal);
    console.log(`   New title: "${exactSameDeal.title}"`);
    console.log(`   New price: ₹${exactSameDeal.price}`);
    console.log(`   Is Duplicate: ${exactCheck.isDuplicate}`);
    console.log(`   Similarity Score: ${exactCheck.similarityScore}%`);
    console.log(`   Matched Deal ID: ${exactCheck.matchedDealId || 'N/A'}`);
    console.log(`   Matched Deal Price: ₹${exactCheck.matchedDealPrice || 'N/A'}`);

    if (exactCheck.isDuplicate) {
      if (exactSameDeal.price >= (exactCheck.matchedDealPrice || 0)) {
        console.log('\n✅ PASS: Higher price deal correctly identified - would be REJECTED');
      } else {
        console.log('\n⚠️  Price comparison needs checking');
      }
    } else {
      console.log('\n❌ FAIL: Exact same title should be duplicate');
      console.log('   Reason:', exactCheck.reason);
    }

    // Test 3: EXACT same title with LOWER price (should replace)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: EXACT same title with LOWER price');
    console.log('='.repeat(60));

    const lowerPriceDeal = {
      title: 'TEST: Sony WH-1000XM5 Wireless Headphones Black',
      price: 22000,
      merchant: 'Amazon',
      url: null,
    };

    const lowerCheck = await MlDeduplicationService.checkForDuplicates(lowerPriceDeal);
    console.log(`   New title: "${lowerPriceDeal.title}"`);
    console.log(`   New price: ₹${lowerPriceDeal.price} (vs existing ₹${lowerCheck.matchedDealPrice})`);
    console.log(`   Is Duplicate: ${lowerCheck.isDuplicate}`);
    console.log(`   Similarity Score: ${lowerCheck.similarityScore}%`);

    if (lowerCheck.isDuplicate && lowerCheck.matchedDealPrice) {
      if (lowerPriceDeal.price < lowerCheck.matchedDealPrice) {
        console.log('\n✅ PASS: Lower price deal correctly identified - would REPLACE existing');
        console.log(`   Action: Replace deal at ₹${lowerCheck.matchedDealPrice} with ₹${lowerPriceDeal.price}`);
      } else {
        console.log('\n⚠️  Price comparison issue');
      }
    } else {
      console.log('\n❌ FAIL: Should be duplicate with lower price');
      console.log('   Reason:', lowerCheck.reason);
    }

    // Test 4: Different merchant (should NOT be duplicate)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: Same product, DIFFERENT merchant');
    console.log('='.repeat(60));

    const differentMerchantDeal = {
      title: 'TEST: Sony WH-1000XM5 Wireless Headphones Black',
      price: 24000,
      merchant: 'Flipkart',
      url: null,
    };

    const merchantCheck = await MlDeduplicationService.checkForDuplicates(differentMerchantDeal);
    console.log(`   Same title, different merchant: ${differentMerchantDeal.merchant}`);
    console.log(`   Is Duplicate: ${merchantCheck.isDuplicate}`);

    if (!merchantCheck.isDuplicate) {
      console.log('\n✅ PASS: Different merchant correctly identified as UNIQUE deal');
    } else {
      console.log('\n❌ FAIL: Different merchant should NOT be duplicate');
    }

    // Test 5: Exact URL match (should always be duplicate)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Exact URL match (different title)');
    console.log('='.repeat(60));

    const sameUrlDeal = {
      title: 'Completely Different Product Name Here',
      price: 20000,
      merchant: 'Amazon',
      url: 'https://amazon.in/test-sony-xm5', // Same URL as initial deal
    };

    const urlCheck = await MlDeduplicationService.checkForDuplicates(sameUrlDeal);
    console.log(`   Same URL: ${sameUrlDeal.url}`);
    console.log(`   Different title: "${sameUrlDeal.title}"`);
    console.log(`   Is Duplicate: ${urlCheck.isDuplicate}`);
    console.log(`   Similarity Score: ${urlCheck.similarityScore}%`);

    if (urlCheck.isDuplicate && urlCheck.similarityScore === 100) {
      console.log('\n✅ PASS: URL match correctly identified as 100% duplicate');
    } else if (urlCheck.isDuplicate) {
      console.log('\n✅ PASS: URL match detected as duplicate');
    } else {
      console.log('\n❌ FAIL: URL match should always be duplicate');
      console.log('   Reason:', urlCheck.reason);
    }

    // Test 6: Similar but different variant (should NOT be duplicate)
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Similar product but different variant');
    console.log('='.repeat(60));

    const differentVariantDeal = {
      title: 'TEST: Sony WH-1000XM4 Wireless Headphones Silver', // XM4 not XM5, Silver not Black
      price: 18000,
      merchant: 'Amazon',
      url: null,
    };

    const variantCheck = await MlDeduplicationService.checkForDuplicates(differentVariantDeal);
    console.log(`   Original: "TEST: Sony WH-1000XM5 Wireless Headphones Black"`);
    console.log(`   New:      "${differentVariantDeal.title}"`);
    console.log(`   Is Duplicate: ${variantCheck.isDuplicate}`);
    console.log(`   Similarity Score: ${variantCheck.similarityScore}%`);

    if (!variantCheck.isDuplicate) {
      console.log('\n✅ PASS: Different variant (XM4 vs XM5) correctly identified as UNIQUE');
    } else {
      console.log('\n⚠️  Different variant detected as duplicate - may need tuning');
    }

  } finally {
    // Cleanup at the end
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP');
    console.log('='.repeat(60));

    if (createdDealId) {
      await db.delete(priceHistory).where(eq(priceHistory.dealId, createdDealId));
      await db.delete(deals).where(eq(deals.id, createdDealId));
      console.log('✅ Test deals cleaned up\n');
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`
The deduplication system works as follows:

DETECTION:
- Uses Levenshtein distance (character-level similarity)
- Uses Jaccard similarity (word-level overlap)
- Exact URL match = 100% duplicate
- Different merchant = never duplicate
- Similarity threshold: 75%

PRICE LOGIC (when duplicate detected):
- If new price is LOWER → REPLACE old deal, transfer price history
- If new price is SAME/HIGHER → REJECT the new deal

APPLIES TO:
✓ Telegram scraper imports (telegram-scraper.service.ts)
✓ User-submitted deals (deals.controller.ts)
`);

  process.exit(0);
}

testDeduplication().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
