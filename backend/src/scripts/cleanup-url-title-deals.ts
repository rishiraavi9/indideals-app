/**
 * Script to clean up deals that have URLs as titles
 * These are invalid deals that should be deleted
 */

import { db } from '../db/index.js';
import { deals } from '../db/schema.js';
import { sql, like, or } from 'drizzle-orm';

async function cleanupUrlTitleDeals() {
  console.log('🧹 Starting cleanup of deals with URL-only titles...\n');

  // Find deals where title starts with http:// or https://
  const badDeals = await db
    .select({ id: deals.id, title: deals.title, url: deals.url })
    .from(deals)
    .where(
      or(
        like(deals.title, 'http://%'),
        like(deals.title, 'https://%'),
        like(deals.title, 'amzn.to%'),
        like(deals.title, 'fkrt.%'),
      )
    );

  console.log(`Found ${badDeals.length} deals with URL-only titles:\n`);

  for (const deal of badDeals) {
    console.log(`  - ID: ${deal.id}`);
    console.log(`    Title: ${deal.title.substring(0, 60)}...`);
    console.log(`    URL: ${deal.url?.substring(0, 60) || 'none'}...`);
    console.log('');
  }

  if (badDeals.length === 0) {
    console.log('✅ No bad deals found. Database is clean!');
    return;
  }

  // Delete the bad deals
  console.log(`\n🗑️  Deleting ${badDeals.length} invalid deals...`);

  const deleteResult = await db
    .delete(deals)
    .where(
      or(
        like(deals.title, 'http://%'),
        like(deals.title, 'https://%'),
        like(deals.title, 'amzn.to%'),
        like(deals.title, 'fkrt.%'),
      )
    );

  console.log(`✅ Deleted ${badDeals.length} deals with URL-only titles`);
  console.log('\n🏁 Cleanup complete!');
}

// Run the script
cleanupUrlTitleDeals()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
