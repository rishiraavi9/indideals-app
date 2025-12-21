#!/usr/bin/env tsx
import { DealVerifierService } from './src/services/deal-verifier.service.js';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function verifyUnverifiedDeals() {
  console.log('\n🔍 Finding unverified deals...\n');

  // Find deals that are not verified
  const unverifiedDeals = await db
    .select()
    .from(deals)
    .where(sql`verified = false OR verified IS NULL`)
    .limit(10);

  console.log(`Found ${unverifiedDeals.length} unverified deals\n`);

  for (const deal of unverifiedDeals) {
    console.log('='.repeat(70));
    console.log(`📦 Deal: ${deal.title}`);
    console.log(`   Price: ₹${deal.price.toLocaleString('en-IN')}`);
    console.log(`   Merchant: ${deal.merchant}`);
    console.log(`   URL: ${deal.url || 'No URL provided'}`);
    console.log('');

    if (!deal.url) {
      console.log('❌ Skipping - No URL to verify\n');
      continue;
    }

    try {
      console.log('⏳ Verifying...');
      const result = await DealVerifierService.verifyDeal(deal.id, 'manual');

      console.log('\n✅ Verification Complete:');
      console.log(`   ✓ URL Accessible: ${result.urlAccessible ? 'Yes' : 'No'}`);
      console.log(`   ✓ Status Code: ${result.statusCode || 'N/A'}`);
      console.log(`   ✓ Price Match: ${result.priceMatch !== undefined ? (result.priceMatch ? 'Yes' : 'No') : 'N/A'}`);
      console.log(`   ✓ Verified: ${result.success ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   ✓ Should Flag: ${result.shouldFlag ? 'Yes' : 'No'}`);

      if (result.scrapedPrice) {
        console.log(`   ✓ Scraped Price: ₹${result.scrapedPrice.toLocaleString('en-IN')}`);
      }

      if (result.errorMessage) {
        console.log(`   ⚠️  Error: ${result.errorMessage}`);
      }

      console.log('');
    } catch (error: any) {
      console.log(`❌ Verification failed: ${error.message}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log('\n✅ Manual verification complete!\n');
}

verifyUnverifiedDeals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
