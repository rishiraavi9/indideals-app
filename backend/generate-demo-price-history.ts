/**
 * Generate realistic demo price history for deals
 * This creates price fluctuation data for the past 30 days to show meaningful price charts
 */

import { db } from './src/db/index.js';
import { deals, priceHistory } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

async function generateDemoPriceHistory() {
  console.log('🎯 Generating demo price history...\n');

  // Get ALL deals (no limit)
  const recentDeals = await db
    .select()
    .from(deals)
    .orderBy(desc(deals.createdAt));

  console.log(`Found ${recentDeals.length} deals to process\n`);

  for (const deal of recentDeals) {
    if (!deal.price) {
      console.log(`⏭️  Skipping ${deal.title.slice(0, 40)}... (no price)`);
      continue;
    }

    // Check existing price history count
    const existingHistory = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.dealId, deal.id));

    if (existingHistory.length >= 5) {
      console.log(`⏭️  Skipping ${deal.title.slice(0, 40)}... (already has ${existingHistory.length} entries)`);
      continue;
    }

    console.log(`📊 Generating history for: ${deal.title.slice(0, 50)}...`);
    console.log(`   Current price: ₹${deal.price}`);

    const currentPrice = deal.price;
    const originalPrice = deal.originalPrice || currentPrice * 1.3;

    // Generate 30 days of price history with realistic fluctuations
    const historyEntries = [];
    const now = new Date();

    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 12) + 8); // Random hour 8am-8pm
      date.setMinutes(Math.floor(Math.random() * 60));

      // Create price variation pattern
      // Start higher, gradually decrease with some fluctuations, end at current price
      let priceAtPoint: number;

      if (daysAgo === 0) {
        // Today = current price
        priceAtPoint = currentPrice;
      } else if (daysAgo >= 25) {
        // 25-30 days ago: Near original price with small variation
        const variation = 0.9 + Math.random() * 0.15; // 90-105% of original
        priceAtPoint = Math.round(originalPrice * variation);
      } else if (daysAgo >= 15) {
        // 15-24 days ago: Gradual decrease toward current
        const progress = (25 - daysAgo) / 10; // 0 to 1
        const targetPrice = originalPrice - (originalPrice - currentPrice) * (progress * 0.5);
        const variation = 0.95 + Math.random() * 0.1;
        priceAtPoint = Math.round(targetPrice * variation);
      } else if (daysAgo >= 7) {
        // 7-14 days ago: Getting closer to current price
        const progress = (15 - daysAgo) / 8;
        const targetPrice = originalPrice - (originalPrice - currentPrice) * (0.5 + progress * 0.3);
        const variation = 0.97 + Math.random() * 0.06;
        priceAtPoint = Math.round(targetPrice * variation);
      } else {
        // 1-6 days ago: Near current price
        const variation = 0.98 + Math.random() * 0.05;
        priceAtPoint = Math.round(currentPrice * variation);
      }

      // Ensure price doesn't go below current or above original
      priceAtPoint = Math.max(currentPrice, Math.min(priceAtPoint, originalPrice));

      // Occasional flash sale dips (10% chance)
      if (Math.random() < 0.1 && daysAgo > 2) {
        priceAtPoint = Math.round(priceAtPoint * (0.85 + Math.random() * 0.1));
      }

      historyEntries.push({
        dealId: deal.id,
        price: Math.round(priceAtPoint),
        originalPrice: deal.originalPrice ? Math.round(deal.originalPrice) : null,
        merchant: deal.merchant || 'Unknown',
        scrapedAt: date,
        source: 'demo',
      });
    }

    // Insert all history entries
    await db.insert(priceHistory).values(historyEntries);

    const prices = historyEntries.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    console.log(`   ✅ Added ${historyEntries.length} price points (₹${minPrice} - ₹${maxPrice})\n`);
  }

  console.log('\n✨ Demo price history generation complete!');
  process.exit(0);
}

generateDemoPriceHistory().catch(console.error);
