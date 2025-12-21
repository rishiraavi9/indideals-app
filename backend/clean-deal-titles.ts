#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

console.log('\n🧹 Cleaning Deal Titles\n');

(async () => {
  // Get all deals
  const allDeals = await db.execute(sql`SELECT id, title FROM deals`);
  const rows = Array.isArray(allDeals) ? allDeals : (allDeals.rows || []);

  console.log(`Found ${rows.length} deals to clean\n`);

  let cleaned = 0;

  for (const deal of rows) {
    let originalTitle = deal.title;
    let cleanedTitle = originalTitle;

    // Apply same cleaning logic as scraper
    cleanedTitle = cleanedTitle.replace(/Buy Here\s*:.*$/i, '');
    cleanedTitle = cleanedTitle.replace(/More\s*:.*$/i, '');
    cleanedTitle = cleanedTitle.replace(/Deal Price\s*:.*$/i, '');
    cleanedTitle = cleanedTitle.replace(/https?:\/\/[^\s]+/g, '');
    cleanedTitle = cleanedTitle.replace(/🎁/g, '');
    cleanedTitle = cleanedTitle.replace(/🔥+/g, '');
    cleanedTitle = cleanedTitle.replace(/🔴+/g, '');
    cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();

    if (cleanedTitle !== originalTitle) {
      await db.execute(
        sql`UPDATE deals SET title = ${cleanedTitle} WHERE id = ${deal.id}`
      );

      console.log(`✅ ${originalTitle.substring(0, 40)}...`);
      console.log(`   → ${cleanedTitle.substring(0, 40)}...\n`);
      cleaned++;
    }
  }

  console.log(`\n✅ Cleaned ${cleaned} deal titles\n`);
  process.exit(0);
})();
