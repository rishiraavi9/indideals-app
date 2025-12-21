#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { like } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';

(async () => {
  console.log('\n🔧 Fixing Boniry Bathroom Organiser Deal\n');

  // Find the deal
  const deal = await db
    .select()
    .from(deals)
    .where(like(deals.url, '%B0D6W88JLF%'))
    .limit(1);

  if (deal.length === 0) {
    console.log('❌ Deal not found');
    process.exit(1);
  }

  console.log(`Found deal: ${deal[0].title.substring(0, 50)}...`);
  console.log(`Current: Price=₹${deal[0].price}, MRP=₹${deal[0].originalPrice}, Discount=${deal[0].discountPercentage}%`);

  // Extract price
  const priceInfo = await AffiliateService.extractPriceInfo(deal[0].url!);

  console.log('\nExtracted from Amazon:');
  console.log(`  Price: ₹${priceInfo.currentPrice}`);
  console.log(`  MRP: ₹${priceInfo.originalPrice}`);
  console.log(`  Discount: ${priceInfo.discountPercentage}%`);

  // Update in database using the ID
  const result = await db
    .update(deals)
    .set({
      price: priceInfo.currentPrice!,
      originalPrice: priceInfo.originalPrice,
      discountPercentage: priceInfo.discountPercentage,
    })
    .where(like(deals.url, '%B0D6W88JLF%'))
    .returning();

  console.log('\n✅ Updated:', result.length, 'deal(s)');
  console.log(`New values: Price=₹${result[0].price}, MRP=₹${result[0].originalPrice}, Discount=${result[0].discountPercentage}%`);

  process.exit(0);
})();
