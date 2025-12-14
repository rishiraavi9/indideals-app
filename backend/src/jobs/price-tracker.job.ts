import { Job } from 'bull';
import { db } from '../db/index.js';
import { deals, priceHistory, priceAlerts, users } from '../db/schema.js';
import { eq, and, lte } from 'drizzle-orm';
import { sendPriceDropEmail } from '../services/email.service.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const processPriceTracker = async (job: Job) => {
  const { type, dealId } = job.data;

  if (type === 'track-all-prices') {
    await trackAllActivePrices();
  } else if (type === 'track-single-price' && dealId) {
    await trackSinglePrice(dealId);
  }
};

// Track prices for all active deals
const trackAllActivePrices = async () => {
  // Get all active deals (not expired)
  const activeDeals = await db
    .select()
    .from(deals)
    .where(eq(deals.isExpired, false))
    .limit(1000); // Process in batches to avoid overwhelming the system

  logger.info(`Tracking prices for ${activeDeals.length} active deals`);

  for (const deal of activeDeals) {
    try {
      await trackSinglePrice(deal.id);
      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`Failed to track price for deal ${deal.id}:`, error);
    }
  }

  logger.info('Finished tracking all prices');
};

// Track price for a single deal
const trackSinglePrice = async (dealId: string) => {
  // Get the deal
  const [deal] = await db
    .select()
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) return;

  // Skip if no URL
  if (!deal.url) {
    logger.warn(`Deal ${dealId} has no URL, skipping price tracking`);
    return;
  }

  try {
    // Fetch current price from the merchant website
    const currentPrice = await scrapePrice(deal.url, deal.merchant);

    if (currentPrice === null) {
      logger.warn(`Could not scrape price for deal ${dealId}`);
      return;
    }

    // Check if price has changed
    if (currentPrice !== deal.price) {
      logger.info(`Price changed for deal ${dealId}: ${deal.price} → ${currentPrice}`);

      // Update deal price
      await db
        .update(deals)
        .set({
          price: currentPrice,
          updatedAt: new Date(),
        })
        .where(eq(deals.id, dealId));

      // Record price history
      await db.insert(priceHistory).values({
        dealId: deal.id,
        price: currentPrice,
        originalPrice: deal.originalPrice,
        merchant: deal.merchant,
        source: 'scraper',
      });

      // Check for price drop alerts
      if (currentPrice < deal.price) {
        await checkPriceAlerts(deal.id, currentPrice);
      }
    } else {
      // Even if price hasn't changed, record it for history
      await db.insert(priceHistory).values({
        dealId: deal.id,
        price: currentPrice,
        originalPrice: deal.originalPrice,
        merchant: deal.merchant,
        source: 'scraper',
      });
    }
  } catch (error) {
    logger.error(`Error tracking price for deal ${dealId}:`, error);
  }
};

// Simple price scraper (you'll need to customize this per merchant)
const scrapePrice = async (url: string, merchant: string): Promise<number | null> => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Merchant-specific selectors (customize for each merchant)
    let priceText = null;

    if (merchant.toLowerCase().includes('amazon')) {
      priceText = $('.a-price-whole').first().text() || $('#priceblock_ourprice').text();
    } else if (merchant.toLowerCase().includes('flipkart')) {
      priceText = $('.\_30jeq3').first().text() || $('.\_25b18c').first().text();
    } else if (merchant.toLowerCase().includes('myntra')) {
      priceText = $('.pdp-price strong').first().text();
    } else {
      // Generic price extraction (looks for common price patterns)
      priceText =
        $('[itemprop="price"]').attr('content') ||
        $('.price').first().text() ||
        $('[class*="price"]').first().text();
    }

    if (!priceText) return null;

    // Extract numeric price (remove ₹, commas, etc.)
    const priceMatch = priceText.replace(/[^\d.]/g, '');
    const price = parseFloat(priceMatch);

    return isNaN(price) ? null : Math.round(price);
  } catch (error) {
    logger.error(`Error scraping price from ${url}:`, error);
    return null;
  }
};

// Check and notify price alerts
const checkPriceAlerts = async (dealId: string, newPrice: number) => {
  // Get all active price alerts for this deal
  const alerts = await db
    .select({
      alert: priceAlerts,
      user: users,
      deal: deals,
    })
    .from(priceAlerts)
    .innerJoin(users, eq(priceAlerts.userId, users.id))
    .innerJoin(deals, eq(priceAlerts.dealId, deals.id))
    .where(
      and(
        eq(priceAlerts.dealId, dealId),
        eq(priceAlerts.isActive, true),
        lte(priceAlerts.targetPrice, newPrice)
      )
    );

  for (const { alert, user, deal } of alerts) {
    try {
      // Send price drop notification
      await sendPriceDropEmail(user.email, deal, newPrice, alert.targetPrice);

      // Mark alert as notified
      await db
        .update(priceAlerts)
        .set({
          notifiedAt: new Date(),
          isActive: false, // Deactivate after notifying
        })
        .where(eq(priceAlerts.id, alert.id));

      logger.info(`Sent price drop alert to ${user.email} for deal ${dealId}`);
    } catch (error) {
      logger.error(`Failed to send price drop alert to ${user.email}:`, error);
    }
  }
};
