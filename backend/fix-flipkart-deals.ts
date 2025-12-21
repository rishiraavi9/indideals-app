#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';

console.log('\n🔧 Fixing Flipkart Deals\n');

(async () => {
  // Get Flipkart deals missing price info
  const result = await db.execute(
    sql`SELECT id, title, url, price, original_price, discount_percentage
        FROM deals
        WHERE url LIKE '%flipkart%'
        AND (original_price IS NULL OR discount_percentage IS NULL)`
  );

  const flipkartDeals = Array.isArray(result) ? result : (result.rows || []);

  console.log(`Found ${flipkartDeals.length} Flipkart deals to fix\n`);

  let fixed = 0;
  let failed = 0;

  for (const deal of flipkartDeals) {
    console.log(`\n📦 ${deal.title.substring(0, 50)}...`);

    try {
      const priceInfo = await AffiliateService.extractPriceInfo(deal.url);

      if (priceInfo.originalPrice && priceInfo.discountPercentage) {
        await db.execute(
          sql`UPDATE deals
              SET original_price = ${priceInfo.originalPrice},
                  discount_percentage = ${priceInfo.discountPercentage},
                  merchant = 'Flipkart'
              WHERE id = ${deal.id}`
        );

        console.log(`   ✅ MRP: ₹${priceInfo.originalPrice}, Discount: ${priceInfo.discountPercentage}%`);
        fixed++;
      } else {
        console.log('   ⚠️  No MRP found');
        failed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 2000));
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Fixed: ${fixed}`);
  console.log(`❌ Failed: ${failed}\n`);
  process.exit(0);
})();
