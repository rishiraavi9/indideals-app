#!/usr/bin/env tsx
/**
 * Quick cleanup of duplicate deals using database queries
 */
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from './src/utils/logger.js';

console.log('\n🧹 Quick Duplicate Cleanup (Database-based)\n');
console.log('='.repeat(70));

(async () => {
  try {
    // Step 1: Remove exact URL duplicates (keep oldest)
    console.log('\n1️⃣  Finding exact URL duplicates...');

    const urlDuplicates = await db.execute(sql`
      SELECT url, array_agg(id ORDER BY created_at) as deal_ids, COUNT(*) as count
      FROM deals
      WHERE url IS NOT NULL
      GROUP BY url
      HAVING COUNT(*) > 1
    `);

    let urlDupsRemoved = 0;
    const rows = Array.isArray(urlDuplicates) ? urlDuplicates : (urlDuplicates.rows || []);

    if (rows.length > 0) {
      console.log(`   Found ${rows.length} URLs with duplicates`);

      for (const row of rows) {
        const dealIds = row.deal_ids as string[];
        // Keep first (oldest), remove rest
        const toRemove = dealIds.slice(1);

        for (const dealId of toRemove) {
          await db.delete(deals).where(eq(deals.id, dealId));
          urlDupsRemoved++;
        }
      }
      console.log(`   ✅ Removed ${urlDupsRemoved} URL duplicates`);
    } else {
      console.log('   ✅ No URL duplicates found');
    }

    // Step 2: Remove exact title + price + merchant duplicates
    console.log('\n2️⃣  Finding exact title/price/merchant duplicates...');

    const exactDuplicates = await db.execute(sql`
      SELECT title, price, merchant, array_agg(id ORDER BY created_at) as deal_ids, COUNT(*) as count
      FROM deals
      GROUP BY title, price, merchant
      HAVING COUNT(*) > 1
    `);

    let exactDupsRemoved = 0;
    const exactRows = Array.isArray(exactDuplicates) ? exactDuplicates : (exactDuplicates.rows || []);

    if (exactRows.length > 0) {
      console.log(`   Found ${exactRows.length} groups of exact duplicates`);

      for (const row of exactRows) {
        const dealIds = row.deal_ids as string[];
        // Keep first (oldest), remove rest
        const toRemove = dealIds.slice(1);

        for (const dealId of toRemove) {
          await db.delete(deals).where(eq(deals.id, dealId));
          exactDupsRemoved++;
        }
      }
      console.log(`   ✅ Removed ${exactDupsRemoved} exact duplicates`);
    } else {
      console.log('   ✅ No exact duplicates found');
    }

    // Step 3: Show final count
    const finalCount = await db.execute(sql`SELECT COUNT(*) as count FROM deals`);
    const finalRows = Array.isArray(finalCount) ? finalCount : (finalCount.rows || []);
    const totalDeals = finalRows[0]?.count || 0;

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Removed ${urlDupsRemoved} URL duplicates`);
    console.log(`   - Removed ${exactDupsRemoved} exact duplicates`);
    console.log(`   - Total duplicates removed: ${urlDupsRemoved + exactDupsRemoved}`);
    console.log(`   - Remaining deals: ${totalDeals}`);
    console.log('\n💡 From now on, AI will prevent duplicates when importing new deals.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
