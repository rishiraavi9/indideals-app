#!/usr/bin/env tsx
/**
 * Automatically categorize all deals that are missing categories
 */
import 'dotenv/config';
import { CategoryDetectorService } from './src/services/ai/category-detector.service.js';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import { logger } from './src/utils/logger.js';

console.log('\n🤖 Categorizing all deals without categories\n');
console.log('='.repeat(70));

(async () => {
  try {
    // Get all deals without categories
    const dealsToProcess = await db
      .select()
      .from(deals)
      .where(isNull(deals.categoryId));

    console.log(`\n📊 Found ${dealsToProcess.length} deals to categorize\n`);

    let categorized = 0;
    let failed = 0;

    for (const deal of dealsToProcess) {
      try {
        console.log(`\n🔄 Processing: ${deal.title.substring(0, 60)}...`);

        // Use keyword-based category detection
        const categoryId = await CategoryDetectorService.detectCategory(
          deal.title,
          deal.description || undefined,
          deal.merchant || undefined
        );

        if (categoryId) {
          // Update deal with category
          await db
            .update(deals)
            .set({
              categoryId,
              updatedAt: new Date(),
            })
            .where(eq(deals.id, deal.id));

          console.log(`   ✅ Categorized successfully`);
          categorized++;

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 500));
        } else {
          console.log(`   ⚠️  Could not determine category`);
          failed++;
        }
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Categorized ${categorized} deals`);
    console.log(`⚠️  Failed ${failed} deals\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
