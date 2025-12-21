#!/usr/bin/env tsx
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';

const testUrl = 'https://www.amazon.in/dp/B09KLM5QHM';

console.log('\n🔍 Testing Price Extraction Fix\n');
console.log('URL:', testUrl);
console.log('='.repeat(70));

(async () => {
  const priceInfo = await AffiliateService.extractPriceInfo(testUrl);

  console.log('\nExtracted Prices:');
  console.log('  Current Price:', priceInfo.currentPrice);
  console.log('  Original Price (MRP):', priceInfo.originalPrice);
  console.log('  Discount:', priceInfo.discountPercentage + '%');

  console.log('\nExpected (from Amazon page):');
  console.log('  Current Price: 1899');
  console.log('  Original Price (MRP): 5999');
  console.log('  Discount: 68%');

  if (priceInfo.originalPrice !== 5999) {
    console.log('\n❌ WRONG! Price extraction is broken.');
  } else {
    console.log('\n✅ Correct!');
  }

  process.exit(0);
})();
