#!/usr/bin/env tsx
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const dealId = 'c635fd7e-5061-44d0-b72f-c5d196d6e25e';

console.log('\n🔧 Fixing THE BEAR HOUSE deal\n');

(async () => {
  try {
    // Get deal
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));

    if (!deal) {
      console.error('Deal not found');
      process.exit(1);
    }

    console.log(`Current URL: ${deal.url}`);

    // Expand and process URL
    const processedUrl = await AffiliateService.processUrl(deal.url!);
    console.log(`Processed URL: ${processedUrl}`);

    // Extract pricing
    const priceInfo = await AffiliateService.extractPriceInfo(processedUrl);

    if (priceInfo.currentPrice) {
      console.log(`\n✅ Price extracted:`);
      console.log(`   Current: ₹${priceInfo.currentPrice}`);
      console.log(`   MRP: ₹${priceInfo.originalPrice}`);
      console.log(`   Discount: ${priceInfo.discountPercentage}%`);

      // Update deal
      await db.update(deals).set({
        url: processedUrl,
        price: priceInfo.currentPrice,
        originalPrice: priceInfo.originalPrice,
        discountPercentage: priceInfo.discountPercentage,
      }).where(eq(deals.id, dealId));

      console.log('\n✅ Deal updated successfully\n');
    } else {
      console.log('\n⚠️ Could not extract pricing - URL may still be invalid\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
