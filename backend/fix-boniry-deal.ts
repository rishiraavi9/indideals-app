#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';

const url = 'https://www.amazon.in/Boniry-Stainless-Bathroom-Organiser-Space-Saving/dp/B0D6W88JLF';

(async () => {
  console.log('\n🔧 Fixing Boniry Bathroom Organiser Deal\n');

  // Extract price
  const priceInfo = await AffiliateService.extractPriceInfo(url);

  console.log('Extracted:');
  console.log(`  Price: ₹${priceInfo.currentPrice}`);
  console.log(`  MRP: ₹${priceInfo.originalPrice}`);
  console.log(`  Discount: ${priceInfo.discountPercentage}%`);

  // Update in database
  await db
    .update(deals)
    .set({
      originalPrice: priceInfo.originalPrice,
      discountPercentage: priceInfo.discountPercentage,
    })
    .where(eq(deals.url, url));

  console.log('\n✅ Deal updated!\n');
  process.exit(0);
})();
