/**
 * One-time script to expire deals older than 7 days
 * Run with: npx tsx src/scripts/expire-old-deals.ts
 */

import { db } from '../db/index.js';
import { deals } from '../db/schema.js';
import { lt, eq, and, lte } from 'drizzle-orm';

async function expireOldDeals() {
  console.log('Starting deal expiration...');

  // Mark deals as expired after 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const expiredByAge = await db
    .update(deals)
    .set({ isExpired: true })
    .where(
      and(
        eq(deals.isExpired, false),
        lt(deals.createdAt, sevenDaysAgo)
      )
    )
    .returning({ id: deals.id, title: deals.title, createdAt: deals.createdAt });

  console.log(`\nMarked ${expiredByAge.length} deals as expired (older than 7 days)`);

  if (expiredByAge.length > 0) {
    console.log('\nExpired deals:');
    expiredByAge.slice(0, 10).forEach(deal => {
      console.log(`  - ${deal.title.substring(0, 50)}... (created: ${deal.createdAt})`);
    });
    if (expiredByAge.length > 10) {
      console.log(`  ... and ${expiredByAge.length - 10} more`);
    }
  }

  // Also mark deals as expired if expiresAt date has passed
  const now = new Date();
  const expiredByDate = await db
    .update(deals)
    .set({ isExpired: true })
    .where(
      and(
        eq(deals.isExpired, false),
        lte(deals.expiresAt, now)
      )
    )
    .returning({ id: deals.id });

  if (expiredByDate.length > 0) {
    console.log(`\nMarked ${expiredByDate.length} deals as expired (past expiresAt date)`);
  }

  // Show summary
  const [totalDeals] = await db.select({ count: db.$count(deals) }).from(deals);
  const [activeDeals] = await db.select({ count: db.$count(deals) }).from(deals).where(eq(deals.isExpired, false));
  const [expiredDeals] = await db.select({ count: db.$count(deals) }).from(deals).where(eq(deals.isExpired, true));

  console.log('\n--- Summary ---');
  console.log(`Total deals: ${totalDeals?.count || 0}`);
  console.log(`Active deals: ${activeDeals?.count || 0}`);
  console.log(`Expired deals: ${expiredDeals?.count || 0}`);

  process.exit(0);
}

expireOldDeals().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
