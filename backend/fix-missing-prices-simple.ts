#!/usr/bin/env tsx
/**
 * Fix all deals missing original price or discount percentage
 */
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';

console.log('\n🔧 Fixing All Deals Missing Price Information\n');
console.log('='.repeat(70));

(async () => {
  try {
    // Get all deals
    const allDeals = await db.select().from(deals);

    // Filter for deals missing price info
    const dealsToFix = allDeals.filter(
      deal => deal.url && (deal.originalPrice === null || deal.discountPercentage === null)
    );

    console.log(`\nFound ${dealsToFix.length} deals missing price information\n`);

    if (dealsToFix.length === 0) {
      console.log('✅ All deals have complete price information!\n');
      process.exit(0);
    }

    let fixedCount = 0;
    let failedCount = 0;

    for (const deal of dealsToFix.slice(0, 10)) {  // Limit to first 10 for now
      console.log(`\n📦 ${deal.title.substring(0, 50)}...`);
      console.log(`   Current: ₹${deal.price} | MRP: ${deal.originalPrice || 'NULL'} | Discount: ${deal.discountPercentage || 'NULL'}%`);

      try {
        // Extract price from merchant website
        const priceInfo = await AffiliateService.extractPriceInfo(deal.url!);

        if (priceInfo.originalPrice && priceInfo.discountPercentage) {
          // Update deal in database
          await db
            .update(deals)
            .set({
              originalPrice: priceInfo.originalPrice,
              discountPercentage: priceInfo.discountPercentage,
            })
            .where(eq(deals.id, deal.id));

          console.log(`   ✅ Fixed: MRP: ₹${priceInfo.originalPrice} | Discount: ${priceInfo.discountPercentage}%`);
          fixedCount++;
        } else {
          console.log('   ⚠️  Could not extract MRP - might not be on sale');
          failedCount++;
        }

        // Rate limiting - wait 2 seconds between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Fixed ${fixedCount} deals`);
    console.log(`❌ Failed/Skipped ${failedCount} deals`);
    console.log(`⏭️  Remaining: ${dealsToFix.length - 10} deals (run again to continue)\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
