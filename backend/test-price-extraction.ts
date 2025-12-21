#!/usr/bin/env tsx
/**
 * Test price extraction from merchant websites
 */
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';

const testUrls = [
  'https://www.amazon.in/dp/B09LLT4MSS', // Havells mixer
  'https://www.amazon.in/dp/B0DP9HMH16', // Milton tiffin
];

console.log('\n💰 Testing Price Extraction\n');
console.log('='.repeat(70));

(async () => {
  for (const url of testUrls) {
    console.log(`\n📌 URL: ${url.substring(0, 60)}...`);

    try {
      const priceInfo = await AffiliateService.extractPriceInfo(url);

      console.log(`\n✅ Price Information:`);
      console.log(`   Current Price: ₹${priceInfo.currentPrice}`);
      console.log(`   Original Price: ₹${priceInfo.originalPrice}`);
      console.log(`   Discount: ${priceInfo.discountPercentage}%`);

      if (priceInfo.discountPercentage && priceInfo.discountPercentage > 0) {
        console.log(`   ✅ Discount percentage calculated successfully!`);
      } else {
        console.log(`   ⚠️  No discount percentage`);
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
    }

    console.log('\n' + '-'.repeat(70));
  }

  console.log('\n✅ Test complete!\n');
  process.exit(0);
})();
