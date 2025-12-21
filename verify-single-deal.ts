#!/usr/bin/env tsx
import { DealVerifierService } from './backend/src/services/deal-verifier.service.js';

const dealId = process.argv[2];

if (!dealId) {
  console.error('Usage: npx tsx verify-single-deal.ts <deal-id>');
  process.exit(1);
}

console.log(`\n🔍 Verifying deal: ${dealId}\n`);

DealVerifierService.verifyDeal(dealId, 'manual')
  .then((result) => {
    console.log('✅ Verification Complete:');
    console.log(`   URL Accessible: ${result.urlAccessible ? 'Yes' : 'No'}`);
    console.log(`   Status Code: ${result.statusCode || 'N/A'}`);
    console.log(`   Price Match: ${result.priceMatch !== undefined ? (result.priceMatch ? 'Yes' : 'No') : 'N/A'}`);
    console.log(`   Verified: ${result.success ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Should Flag: ${result.shouldFlag ? 'Yes' : 'No'}`);

    if (result.scrapedPrice) {
      console.log(`   Scraped Price: ₹${result.scrapedPrice.toLocaleString('en-IN')}`);
    }

    if (result.errorMessage) {
      console.log(`   ⚠️  Error: ${result.errorMessage}`);
    }

    console.log('\n✅ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
