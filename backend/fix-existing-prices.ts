#!/usr/bin/env tsx
/**
 * Fix existing deals with incorrect prices by re-scraping from merchant websites
 */
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, and, or, gt } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';
import { logger } from './src/utils/logger.js';

console.log('\n🔧 Fixing Existing Deals with Incorrect Prices\n');
console.log('='.repeat(70));

(async () => {
  try {
    // Find deals with suspicious prices (MRP > 100,000 or missing discount)
    const suspiciousDeals = await db
      .select({
        id: deals.id,
        title: deals.title,
        url: deals.url,
        price: deals.price,
        originalPrice: deals.originalPrice,
        discountPercentage: deals.discountPercentage,
        merchant: deals.merchant,
      })
      .from(deals)
      .where(
        or(
          gt(deals.originalPrice, 100000), // MRP > 100,000 (unrealistic)
          and(
            eq(deals.discountPercentage, null), // Missing discount
            eq(deals.originalPrice, null) // Missing MRP
          )
        )
      )
      .limit(50);

    console.log(`\nFound ${suspiciousDeals.length} deals with suspicious pricing\n`);

    if (suspiciousDeals.length === 0) {
      console.log('✅ No deals need fixing!\n');
      process.exit(0);
    }

    let fixedCount = 0;
    let failedCount = 0;

    for (const deal of suspiciousDeals) {
      console.log(`\n📦 ${deal.title.substring(0, 50)}...`);
      console.log(`   Current: ₹${deal.price} | MRP: ₹${deal.originalPrice} | Discount: ${deal.discountPercentage}%`);

      if (!deal.url) {
        console.log('   ⚠️  No URL - skipping');
        failedCount++;
        continue;
      }

      try {
        // Re-scrape price from merchant website
        const priceInfo = await AffiliateService.extractPriceInfo(deal.url);

        if (priceInfo.currentPrice && priceInfo.originalPrice) {
          // Update deal in database
          await db
            .update(deals)
            .set({
              price: priceInfo.currentPrice,
              originalPrice: priceInfo.originalPrice,
              discountPercentage: priceInfo.discountPercentage,
            })
            .where(eq(deals.id, deal.id));

          console.log(`   ✅ Fixed: ₹${priceInfo.currentPrice} | MRP: ₹${priceInfo.originalPrice} | Discount: ${priceInfo.discountPercentage}%`);
          fixedCount++;
        } else {
          console.log('   ⚠️  Could not extract price - skipping');
          failedCount++;
        }

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Fixed ${fixedCount} deals`);
    console.log(`❌ Failed ${failedCount} deals\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
