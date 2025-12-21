#!/usr/bin/env tsx
import 'dotenv/config';
import { DealVerifierService } from './src/services/deal-verifier.service.js';

const dealId = '69a234fa-2da0-47ed-bdc3-5ae45974696d';

console.log('\n🔍 Verifying Puma Ripper V3 Slipper deal...\n');

(async () => {
  try {
    const result = await DealVerifierService.verifyDeal(dealId, 'manual');

    console.log('\n📊 Verification Result:\n');
    console.log('  Success:', result.success);
    console.log('  URL Accessible:', result.urlAccessible);
    console.log('  Status Code:', result.statusCode);
    console.log('  Price Match:', result.priceMatch);
    console.log('  Scraped Price:', result.scrapedPrice ? `₹${result.scrapedPrice}` : 'N/A');
    console.log('  Should Flag:', result.shouldFlag);
    console.log('  Should Expire:', result.shouldExpire);
    console.log('  Flag Reason:', result.flagReason || 'None');
    console.log('  Error:', result.errorMessage || 'None');
    console.log('\n');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
