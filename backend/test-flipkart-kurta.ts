#!/usr/bin/env tsx
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';

const url = 'https://www.flipkart.com/gudwear-women-printed-anarkali-kurta/p/itm80443d1f3ef34?pid=KTAGHQNQ3F5RXVGM';

console.log('\n🔍 Testing Flipkart Kurta\n');

(async () => {
  const priceInfo = await AffiliateService.extractPriceInfo(url);

  console.log('Extracted:');
  console.log(`  Price: ₹${priceInfo.currentPrice}`);
  console.log(`  MRP: ₹${priceInfo.originalPrice}`);
  console.log(`  Discount: ${priceInfo.discountPercentage}%\n`);

  process.exit(0);
})();
