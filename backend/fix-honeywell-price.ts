#!/usr/bin/env tsx
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const dealId = 'bd18b870-ae1e-4db7-a65f-c1c604a4155d';
const url = 'https://www.amazon.in/Honeywell-V3-Activated-Pre-Filter-additional/dp/B09C64FC6Z';

console.log('\n🔍 Fetching correct pricing from Amazon...\n');

(async () => {
  try {
    const priceInfo = await AffiliateService.extractPriceInfo(url);

    console.log('Extracted Price Info:');
    console.log('  Current Price:', priceInfo.currentPrice ? `₹${priceInfo.currentPrice / 100}` : 'N/A');
    console.log('  Original Price:', priceInfo.originalPrice ? `₹${priceInfo.originalPrice / 100}` : 'N/A');
    console.log('  Discount:', priceInfo.discountPercentage ? `${priceInfo.discountPercentage}%` : 'N/A');

    if (priceInfo.currentPrice) {
      await db
        .update(deals)
        .set({
          price: priceInfo.currentPrice,
          originalPrice: priceInfo.originalPrice,
          discountPercentage: priceInfo.discountPercentage,
        })
        .where(eq(deals.id, dealId));

      console.log('\n✅ Deal updated successfully!');
    } else {
      console.log('\n❌ Could not extract price from Amazon');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
