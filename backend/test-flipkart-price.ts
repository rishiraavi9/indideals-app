#!/usr/bin/env tsx
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';

const url = 'https://www.flipkart.com/india-desire-deals/p/indiadesire_deals?pid=TBTHYGC2JYXYGHQW&lid=LSTTBTHYGC2JYXYGHQWK0Q61C&marketplace=FLIPKART';

console.log('\n🔍 Testing Flipkart Price Extraction\n');
console.log('URL:', url);
console.log('='.repeat(70));

(async () => {
  const priceInfo = await AffiliateService.extractPriceInfo(url);

  console.log('\nExtracted Prices:');
  console.log(`  Current Price: ${priceInfo.currentPrice}`);
  console.log(`  Original Price (MRP): ${priceInfo.originalPrice}`);
  console.log(`  Discount: ${priceInfo.discountPercentage}%`);

  if (priceInfo.originalPrice) {
    console.log('\n✅ Success!');
  } else {
    console.log('\n❌ Failed to extract MRP');
  }

  process.exit(0);
})();
