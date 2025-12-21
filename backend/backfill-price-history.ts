/**
 * Backfill Price History for Existing Deals
 *
 * This script generates 30 days of demo price history for deals that are missing it.
 * Run with: npx tsx backfill-price-history.ts
 */

import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals, priceHistory } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function generateDemoPriceHistory(dealId: string, currentPrice: number, originalPrice: number | null, merchant: string) {
  const historyEntries = [];
  const now = new Date();
  const effectiveOriginalPrice = originalPrice || Math.round(currentPrice * 1.3);

  for (let daysAgo = 30; daysAgo >= 1; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 12) + 8);
    date.setMinutes(Math.floor(Math.random() * 60));

    let priceAtPoint: number;

    if (daysAgo >= 25) {
      const variation = 0.9 + Math.random() * 0.15;
      priceAtPoint = Math.round(effectiveOriginalPrice * variation);
    } else if (daysAgo >= 15) {
      const progress = (25 - daysAgo) / 10;
      const targetPrice = effectiveOriginalPrice - (effectiveOriginalPrice - currentPrice) * (progress * 0.5);
      const variation = 0.95 + Math.random() * 0.1;
      priceAtPoint = Math.round(targetPrice * variation);
    } else if (daysAgo >= 7) {
      const progress = (15 - daysAgo) / 8;
      const targetPrice = effectiveOriginalPrice - (effectiveOriginalPrice - currentPrice) * (0.5 + progress * 0.3);
      const variation = 0.97 + Math.random() * 0.06;
      priceAtPoint = Math.round(targetPrice * variation);
    } else {
      const variation = 0.98 + Math.random() * 0.05;
      priceAtPoint = Math.round(currentPrice * variation);
    }

    priceAtPoint = Math.max(currentPrice, Math.min(priceAtPoint, effectiveOriginalPrice));

    if (Math.random() < 0.1 && daysAgo > 2) {
      priceAtPoint = Math.round(priceAtPoint * (0.85 + Math.random() * 0.1));
    }

    historyEntries.push({
      dealId,
      price: priceAtPoint,
      originalPrice: originalPrice ? Math.round(originalPrice) : null,
      merchant: merchant || 'Unknown',
      scrapedAt: date,
      source: 'demo',
    });
  }

  if (historyEntries.length > 0) {
    await db.insert(priceHistory).values(historyEntries as any);
  }

  return historyEntries.length;
}

async function backfillPriceHistory() {
  console.log('🚀 Starting Price History backfill...\n');

  // Find deals with less than 5 price history entries (they're missing demo data)
  const result = await db.execute(sql`
    SELECT d.id, d.title, d.price, d.original_price, d.merchant, COUNT(ph.id) as history_count
    FROM deals d
    LEFT JOIN price_history ph ON d.id = ph.deal_id
    GROUP BY d.id, d.title, d.price, d.original_price, d.merchant
    HAVING COUNT(ph.id) < 5
  `);

  const dealsToBackfill = (result as any).rows || result;
  console.log(`Found ${dealsToBackfill.length} deals needing price history\n`);

  if (dealsToBackfill.length === 0) {
    console.log('✅ All deals already have price history!');
    process.exit(0);
  }

  let success = 0;
  let failed = 0;

  for (const deal of dealsToBackfill) {
    try {
      const count = await generateDemoPriceHistory(
        deal.id,
        deal.price,
        deal.original_price,
        deal.merchant
      );
      success++;
      const shortTitle = deal.title?.length > 50 ? deal.title.substring(0, 50) + '...' : deal.title;
      console.log(`✅ [${success}/${dealsToBackfill.length}] ${shortTitle} → ${count} entries`);
    } catch (err: any) {
      failed++;
      console.error(`❌ Failed: ${deal.title?.substring(0, 50)}... → ${err.message}`);
    }
  }

  console.log(`\n📊 Backfill Complete!`);
  console.log(`   ✅ Success: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);

  process.exit(0);
}

backfillPriceHistory().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
