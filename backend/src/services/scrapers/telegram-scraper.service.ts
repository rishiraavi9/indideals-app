import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../../db/index.js';
import { deals, users, telegramMessages, priceHistory } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';
import { AffiliateService } from '../affiliate.service.js';
import { MlDeduplicationService } from '../ml-deduplication.service.js';
import { DealQualityService } from '../ai/deal-quality.service.js';
import { getEnabledChannels, TELEGRAM_SCRAPER_CONFIG } from '../../config/telegram-channels.js';
import { indexDeal, deleteDeal as deleteFromElasticsearch } from '../elasticsearch.service.js';

/**
 * Generate 7 days of realistic demo price history for a deal
 * This makes the price history chart look nice with historical data
 */
async function generateDemoPriceHistory(dealId: string, currentPrice: number, originalPrice: number | null, merchant: string) {
  try {
    const historyEntries = [];
    const now = new Date();

    for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(Math.random() * 12) + 8);
      date.setMinutes(Math.floor(Math.random() * 60));

      // Price hovers near current price with small variations (±2-5%)
      const variation = 0.98 + Math.random() * 0.05;
      let priceAtPoint = Math.round(currentPrice * variation);

      // Occasional flash sale dips (10% chance, not on recent days)
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

    // Insert all history entries
    if (historyEntries.length > 0) {
      await db.insert(priceHistory).values(historyEntries as any);
      logger.info(`[Telegram] Generated ${historyEntries.length} price history entries for deal ${dealId}`);
    }
  } catch (err: any) {
    logger.error(`[Telegram] Failed to generate demo price history: ${err.message}`);
  }
}

/**
 * Telegram Channel Scraper Service
 * Scrapes deals from public Telegram channels (web view)
 */

interface TelegramDeal {
  title: string;
  price: number;
  originalPrice: number | null;
  merchant: string;
  url: string | null;
  imageUrl: string | null;
  description: string | null;
  categoryId: string | null;
  messageId: string; // Telegram message ID (e.g., "iamprasadtech/100311")
  postedAt: Date; // When the message was posted
}

export class TelegramScraperService {
  // Channels are now loaded from config/telegram-channels.ts
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private static readonly MIN_DEALS_PER_CHANNEL = 20;

  // Bot user ID for auto-posting deals
  private static botUserId: string | null = null;

  /**
   * Initialize or get the bot user
   */
  private static async getBotUser(): Promise<string> {
    if (this.botUserId) {
      return this.botUserId;
    }

    // Check if bot user exists
    const [botUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'deals-admin'))
      .limit(1);

    if (botUser) {
      this.botUserId = botUser.id;
      return botUser.id;
    }

    // Create bot user if doesn't exist
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('deals-admin-secure-password-' + Date.now(), 10);

    const [newBotUser] = await db
      .insert(users)
      .values({
        username: 'deals-admin',
        email: 'deals-admin@desidealsai.local',
        passwordHash, // Secure hash, but bot won't use it
        reputation: 100, // High reputation for trusted bot
      })
      .returning();

    this.botUserId = newBotUser.id;
    logger.info('[Telegram] Created bot user for auto-posting deals');
    return newBotUser.id;
  }

  /**
   * Scrape latest deals from a specific Telegram channel
   */
  static async scrapeDeals(channelUrl: string, limit: number = 20): Promise<TelegramDeal[]> {
    try {
      logger.info(`[Telegram] Scraping deals from ${channelUrl}`);

      const response = await axios.get(channelUrl, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const deals: TelegramDeal[] = [];

      // Telegram web view uses specific class names for messages
      $('.tgme_widget_message').each((index, element) => {
        if (deals.length >= limit) return false; // Stop after reaching limit

        try {
          const $message = $(element);

          // Extract message metadata
          const messageId = $message.attr('data-post');
          const timestampStr = $message.find('.tgme_widget_message_date time').attr('datetime');

          if (!messageId || !timestampStr) {
            logger.warn('[Telegram] Missing message ID or timestamp, skipping');
            return;
          }

          const postedAt = new Date(timestampStr);

          const messageText = $message.find('.tgme_widget_message_text').text();
          const messageHTML = $message.find('.tgme_widget_message_text').html() || '';

          // Check for link preview (MahidharZone format)
          const linkPreviewTitle = $message.find('.link_preview_title').text();
          const linkPreviewDesc = $message.find('.link_preview_description').text();

          // Skip if message is too short AND no link preview
          if ((!messageText || messageText.length < 20) && !linkPreviewTitle) return;

          // Extract deal information using various patterns
          const deal = this.parseDealFromMessage(messageText, messageHTML, $message, linkPreviewTitle, linkPreviewDesc);

          if (deal) {
            // Add message metadata to deal
            deal.messageId = messageId;
            deal.postedAt = postedAt;

            deals.push(deal);
            logger.info(`[Telegram] Parsed deal: ${deal.title.substring(0, 50)}... (${messageId})`);
          }
        } catch (error: any) {
          logger.warn('[Telegram] Error parsing message:', error.message);
        }
      });

      logger.info(`[Telegram] Successfully scraped ${deals.length} deals`);
      return deals;
    } catch (error: any) {
      logger.error('[Telegram] Failed to scrape channel:', error.message);
      return [];
    }
  }

  /**
   * Parse deal information from message text
   */
  private static parseDealFromMessage(
    text: string,
    html: string,
    $message: cheerio.Cheerio<cheerio.Element>,
    linkPreviewTitle?: string,
    linkPreviewDesc?: string
  ): TelegramDeal | null {
    // Count all URLs in the message to detect roundup/compilation posts
    const allUrls = text.match(/https?:\/\/[^\s]+/gi) || [];
    const maxUrls = TELEGRAM_SCRAPER_CONFIG.maxUrlsPerDeal;

    if (allUrls.length > maxUrls) {
      logger.info(`[Telegram] Skipping roundup post with ${allUrls.length} URLs (max: ${maxUrls})`);
      return null;
    }

    // Extract product URL (Amazon, Flipkart, etc.)
    // Look for URLs but stop at common message keywords that get concatenated
    const urlMatch = text.match(/(https?:\/\/[^\s]+?)(?:More|Buy|Click|Deal|Price|Off|\s|$)/i);
    let url = urlMatch ? urlMatch[1] : null;

    // Skip non-retailer URLs (YouTube, social media, news sites, etc.)
    if (url) {
      const nonDealDomains = [
        'youtube.com', 'youtu.be',           // YouTube
        'facebook.com', 'fb.com', 'fb.watch', // Facebook
        'instagram.com',                      // Instagram
        'twitter.com', 'x.com', 't.co',       // Twitter/X
        'linkedin.com',                       // LinkedIn
        'telegram.me', 't.me',                // Telegram
        'whatsapp.com',                       // WhatsApp
        'bit.ly', 'tinyurl.com', 'goo.gl',   // Generic shorteners (not retailer-specific)
        'news', 'blog', 'article',            // News/blog sites
      ];

      const lowerUrl = url.toLowerCase();
      const isNonDealUrl = nonDealDomains.some(domain => lowerUrl.includes(domain));

      if (isNonDealUrl) {
        logger.info(`[Telegram] Skipping non-deal URL (${url.substring(0, 50)}...)`);
        return null;
      }
    }

    // If we have link preview (MahidharZone format), use that for title and combine text
    const fullText = linkPreviewTitle
      ? `${linkPreviewTitle} ${linkPreviewDesc || ''} ${text}`
      : text;

    // Extract prices (₹499, ₹1,299, etc.) from full text including link preview
    const priceMatches = fullText.match(/₹\s?[\d,]+/g);

    let price: number;
    let originalPrice: number | null = null;

    if (priceMatches && priceMatches.length > 0) {
      // Parse prices from message
      const prices = priceMatches.map(p => parseInt(p.replace(/[₹,\s]/g, '')));
      price = Math.min(...prices); // Current price is usually the lowest mentioned
      originalPrice = prices.length > 1 ? Math.max(...prices) : null;
    } else if (url) {
      // No price in message - we'll extract it from the merchant website later
      // Use placeholder price of 1 rupee for now
      price = 1;
      originalPrice = null;
    } else {
      // No price and no URL = not a deal
      return null;
    }

    // Extract title - use link preview title if available, otherwise extract from text
    let title: string;
    if (linkPreviewTitle && linkPreviewTitle.length > 10) {
      title = linkPreviewTitle;
    } else {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      title = this.extractTitle(lines, text);
    }

    if (!title || title.length < 10) {
      return null; // Invalid title
    }

    // Detect merchant from URL
    const merchant = this.detectMerchant(url);

    // Extract image URL (check both photo wrap and link preview)
    let imageUrl = $message.find('.tgme_widget_message_photo_wrap').css('background-image');
    if (!imageUrl) {
      imageUrl = $message.find('.link_preview_image').css('background-image');
    }
    const cleanImageUrl = imageUrl ? imageUrl.replace(/url\(['"]?(.*?)['"]?\)/, '$1') : null;

    // Extract description - use link preview desc if available, otherwise extract from text
    let description: string | null;
    if (linkPreviewDesc && linkPreviewDesc.length > 20) {
      description = linkPreviewDesc.substring(0, 500);
    } else {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      description = this.extractDescription(lines, title);
    }

    // Auto-detect category based on keywords (use full text)
    const categoryId = this.detectCategory(title, fullText);

    return {
      title,
      price,
      originalPrice,
      merchant,
      url,
      imageUrl: cleanImageUrl,
      description,
      categoryId,
    };
  }

  /**
   * Extract product title from message
   */
  private static extractTitle(lines: string[], fullText: string): string {
    // Title is usually the first meaningful line
    for (const line of lines) {
      // Skip lines that are just prices or URLs
      // Handle both ₹499 and 499₹ formats
      if (line.match(/^₹\s?[\d,]+/) || line.match(/^[\d,]+\s?₹/) || line.match(/^https?:\/\//)) {
        continue;
      }

      // Skip very short lines
      if (line.trim().length < 10) {
        continue;
      }

      // Clean up the title
      let title = line.trim();

      // Remove price prefixes in various formats (799₹, ₹799, Rs.799, etc.)
      // This handles cases like "799₹Boult Audio..." -> "Boult Audio..."
      title = title.replace(/^[\d,]+\s?₹\s*/g, '');           // 799₹ at start
      title = title.replace(/^₹\s?[\d,]+\s*/g, '');           // ₹799 at start
      title = title.replace(/^Rs\.?\s?[\d,]+\s*/gi, '');      // Rs.799 or Rs 799 at start
      title = title.replace(/^INR\s?[\d,]+\s*/gi, '');        // INR799 at start

      // Remove common prefixes
      title = title.replace(/^(Deal|Hot Deal|Lightning Deal|Offer|Sale)[\s:]+/i, '');

      // Remove URLs and "Buy Here", "More", "Deal Price" sections that get embedded in title
      title = title.replace(/Buy Here\s*:.*$/i, '');
      title = title.replace(/More\s*:.*$/i, '');
      title = title.replace(/Deal Price\s*:.*$/i, '');
      title = title.replace(/https?:\/\/[^\s]+/g, '');

      // Remove emojis (gift boxes, fire emojis, etc.)
      title = title.replace(/🎁/g, '');
      title = title.replace(/🔥+/g, '');
      title = title.replace(/🔴+/g, '');

      // Clean up extra whitespace
      title = title.replace(/\s+/g, ' ').trim();

      // Truncate if too long (keep first 200 chars)
      if (title.length > 200) {
        title = title.substring(0, 197) + '...';
      }

      return title;
    }

    // Fallback: use first 100 chars
    return fullText.substring(0, 100).trim();
  }

  /**
   * Extract description from message
   */
  private static extractDescription(lines: string[], title: string): string | null {
    const descLines = lines.filter(line => {
      return line !== title &&
             !line.match(/^₹\s?[\d,]+/) &&
             !line.match(/^https?:\/\//) &&
             line.length > 15;
    });

    if (descLines.length === 0) return null;

    return descLines.join('\n').substring(0, 500);
  }

  /**
   * Detect merchant from URL
   */
  private static detectMerchant(url: string | null): string {
    if (!url) return 'Unknown';

    const lowerUrl = url.toLowerCase();

    // Full domains and shortened URLs
    if (lowerUrl.includes('amazon') || lowerUrl.includes('amzn.to') || lowerUrl.includes('amzn.in')) return 'Amazon';
    if (lowerUrl.includes('flipkart') || lowerUrl.includes('fkrt.co') || lowerUrl.includes('fkrt.it')) return 'Flipkart';
    if (lowerUrl.includes('myntra') || lowerUrl.includes('myntr.in')) return 'Myntra';
    if (lowerUrl.includes('ajio') || lowerUrl.includes('ajiio.co')) return 'Ajio';
    if (lowerUrl.includes('paytm')) return 'Paytm';
    if (lowerUrl.includes('snapdeal')) return 'Snapdeal';
    if (lowerUrl.includes('tatacliq')) return 'Tata CLiQ';
    if (lowerUrl.includes('nykaa')) return 'Nykaa';
    if (lowerUrl.includes('meesho')) return 'Meesho';
    if (lowerUrl.includes('jiomart')) return 'JioMart';

    return 'Unknown';
  }

  /**
   * Auto-detect category based on keywords
   */
  private static detectCategory(title: string, text: string): string | null {
    const combined = (title + ' ' + text).toLowerCase();

    // Electronics keywords
    if (combined.match(/phone|mobile|laptop|tablet|earphone|headphone|speaker|smartwatch|tv|monitor|camera/)) {
      return 'electronics'; // Will need to map to actual category ID
    }

    // Fashion keywords
    if (combined.match(/shirt|t-shirt|jeans|dress|shoes|sandal|clothing|fashion|watch|bag/)) {
      return 'fashion';
    }

    // Home & Kitchen
    if (combined.match(/kitchen|cookware|bedsheet|pillow|furniture|home|decor/)) {
      return 'home-kitchen';
    }

    // Books
    if (combined.match(/book|novel|diary|notebook|journal/)) {
      return 'books';
    }

    // Health & Beauty
    if (combined.match(/cream|lotion|shampoo|soap|cosmetic|makeup|skincare|perfume/)) {
      return 'health-beauty';
    }

    // Gaming
    if (combined.match(/gaming|playstation|xbox|controller|console/)) {
      return 'gaming';
    }

    return null; // Unknown category
  }

  /**
   * Check if deal already exists (by URL)
   */
  private static async dealExists(url: string): Promise<boolean> {
    if (!url) return false;

    const existing = await db
      .select()
      .from(deals)
      .where(eq(deals.url, url))
      .limit(1);

    return existing.length > 0;
  }

  /**
   * Map category slug to category ID
   */
  private static async getCategoryId(slug: string | null): Promise<string | null> {
    if (!slug) return null;

    try {
      const [category] = await db.query.categories.findMany({
        where: (categories, { eq }) => eq(categories.slug, slug),
        limit: 1,
      });

      return category?.id || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Import deals into database
   */
  static async importDeals(scrapedDeals: TelegramDeal[], channelUsername: string): Promise<number> {
    const botUserId = await this.getBotUser();
    let imported = 0;

    for (const deal of scrapedDeals) {
      try {
        // Check if we've already processed this message
        const [existingMessage] = await db
          .select()
          .from(telegramMessages)
          .where(eq(telegramMessages.messageId, deal.messageId))
          .limit(1);

        if (existingMessage) {
          logger.info(`[Telegram] Already processed message ${deal.messageId}, skipping`);
          continue;
        }
        // Process URL: expand shortened links and replace affiliate tags
        let processedUrl = deal.url;
        if (deal.url) {
          logger.info(`[Telegram] Processing affiliate URL for: ${deal.title.substring(0, 40)}...`);
          processedUrl = await AffiliateService.processUrl(deal.url);
          logger.info(`[Telegram] Original: ${deal.url.substring(0, 50)}...`);
          logger.info(`[Telegram] Processed: ${processedUrl.substring(0, 50)}...`);
        }

        // Skip if deal already exists (check with processed URL)
        if (processedUrl && await this.dealExists(processedUrl)) {
          logger.info(`[Telegram] Deal already exists (URL match): ${deal.title.substring(0, 30)}...`);

          // Record as processed but skipped
          await db.insert(telegramMessages).values({
            messageId: deal.messageId,
            channelUsername,
            dealId: null,
            processed: true,
            skippedReason: 'duplicate_url',
            postedAt: deal.postedAt,
          });

          continue;
        }

        // Use ML to check for semantic duplicates (local, no API costs)
        logger.info(`[Telegram] Checking for ML-based duplicate detection...`);
        const duplicateCheck = await MlDeduplicationService.checkForDuplicates({
          title: deal.title,
          price: deal.price,
          merchant: deal.merchant,
          url: processedUrl,
        });

        // Track if we need to replace an existing deal
        let replacingDealId: string | null = null;

        if (duplicateCheck.isDuplicate && duplicateCheck.matchedDealId) {
          const existingPrice = duplicateCheck.matchedDealPrice || Infinity;

          // Check if new deal has a better (lower) price
          if (deal.price < existingPrice) {
            logger.info(`[Telegram] 🔄 BETTER PRICE FOUND!`);
            logger.info(`[Telegram]   Existing: ₹${existingPrice} → New: ₹${deal.price} (saving ₹${existingPrice - deal.price})`);
            logger.info(`[Telegram]   Will replace deal ${duplicateCheck.matchedDealId}`);
            replacingDealId = duplicateCheck.matchedDealId;
          } else {
            // Same or higher price - skip the duplicate
            logger.info(`[Telegram] ⚠️ Duplicate detected (${duplicateCheck.similarityScore}% match): ${deal.title.substring(0, 30)}...`);
            logger.info(`[Telegram]   Existing: ₹${existingPrice}, New: ₹${deal.price} - keeping existing (same/better price)`);

            // Record as processed but skipped
            await db.insert(telegramMessages).values({
              messageId: deal.messageId,
              channelUsername,
              postedAt: deal.postedAt,
            } as any);

            continue;
          }
        } else {
          logger.info(`[Telegram] ✅ Unique deal confirmed (similarity: ${duplicateCheck.similarityScore}%)`);
        }

        // Extract accurate pricing from merchant website
        let finalPrice = deal.price;
        let finalOriginalPrice = deal.originalPrice;
        let discountPercentage: number | null = null;
        let priceVerified = false; // Track if price was verified from merchant

        if (processedUrl) {
          logger.info(`[Telegram] Extracting real-time pricing from merchant...`);
          const priceInfo = await AffiliateService.extractPriceInfo(processedUrl);

          // Use scraped prices if available, otherwise fall back to Telegram message prices
          if (priceInfo.currentPrice) {
            finalPrice = priceInfo.currentPrice;
            finalOriginalPrice = priceInfo.originalPrice;
            discountPercentage = priceInfo.discountPercentage;
            priceVerified = true;
            logger.info(`[Telegram] ✅ Extracted prices: ₹${finalPrice} (was ₹${finalOriginalPrice}), ${discountPercentage}% off`);

            // VALIDATION: Detect obviously wrong prices that slip through
            // These usually come from misformatted Indian prices (₹6,29,800 -> 629800)
            // Rules:
            // 1. Discount > 95% is almost always a parsing error
            // 2. Original price > 100x current price is suspicious
            // 3. Original price > ₹50,000 for most household items is wrong
            const isSuspiciousDiscount = discountPercentage !== null && discountPercentage > 95;
            const isPriceRatioSuspicious = finalOriginalPrice !== null && finalPrice > 0 && (finalOriginalPrice / finalPrice) > 50;
            const isOriginalPriceUnrealistic = finalOriginalPrice !== null && finalOriginalPrice > 50000 && finalPrice < 1000;

            if (isSuspiciousDiscount || isPriceRatioSuspicious || isOriginalPriceUnrealistic) {
              logger.warn(`[Telegram] ⚠️ SUSPICIOUS PRICES DETECTED - likely parsing error:`);
              logger.warn(`[Telegram]   Price: ₹${finalPrice}, Original: ₹${finalOriginalPrice}, Discount: ${discountPercentage}%`);
              logger.warn(`[Telegram]   Clearing invalid original price, keeping current price only`);

              // Clear the suspicious original price and discount
              finalOriginalPrice = null;
              discountPercentage = null;
            }
          } else {
            // FALLBACK: Use Telegram message prices if merchant scraping fails
            // This allows deals to be imported even when the URL is temporarily unavailable
            if (deal.price && deal.price > 0) {
              logger.warn(`[Telegram] ⚠️ Could not extract prices from merchant - using Telegram prices as fallback`);
              finalPrice = deal.price;
              finalOriginalPrice = deal.originalPrice;
              priceVerified = false;

              // Calculate discount if we have original price
              if (finalOriginalPrice && finalOriginalPrice > finalPrice) {
                discountPercentage = Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100);
              }

              logger.info(`[Telegram] 📝 Using Telegram prices: ₹${finalPrice} (was ₹${finalOriginalPrice}), ${discountPercentage}% off [UNVERIFIED]`);
            } else {
              // No valid price from Telegram either - skip this deal
              logger.warn(`[Telegram] ❌ No valid price available - skipping deal: ${deal.title.substring(0, 50)}...`);

              await db.insert(telegramMessages).values({
                messageId: deal.messageId,
                channelUsername,
                dealId: null,
                processed: true,
                skippedReason: 'no_price',
                postedAt: deal.postedAt,
              } as any);

              continue;
            }
          }
        } else {
          // No URL - but we can still import if we have a price from Telegram
          if (deal.price && deal.price > 0) {
            logger.warn(`[Telegram] ⚠️ No URL found - importing with Telegram price only`);
            finalPrice = deal.price;
            finalOriginalPrice = deal.originalPrice;
            priceVerified = false;

            if (finalOriginalPrice && finalOriginalPrice > finalPrice) {
              discountPercentage = Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100);
            }
          } else {
            // No URL and no price - skip
            logger.warn(`[Telegram] ❌ No URL and no price - skipping deal: ${deal.title.substring(0, 50)}...`);

            await db.insert(telegramMessages).values({
              messageId: deal.messageId,
              channelUsername,
              dealId: null,
              processed: true,
              skippedReason: 'no_url_no_price',
              postedAt: deal.postedAt,
            } as any);

            continue;
          }
        }

        // Re-detect merchant from expanded URL (shortened URLs like fkrt.co won't be detected initially)
        const finalMerchant = this.detectMerchant(processedUrl) !== 'Unknown'
          ? this.detectMerchant(processedUrl)
          : deal.merchant;

        // Get category ID
        const categoryId = await this.getCategoryId(deal.categoryId);

        // If replacing an existing deal with better price, transfer price history first
        if (replacingDealId) {
          logger.info(`[Telegram] 🔄 Transferring price history from old deal ${replacingDealId}...`);

          // Get all price history from the old deal
          const oldPriceHistory = await db
            .select()
            .from(priceHistory)
            .where(eq(priceHistory.dealId, replacingDealId));

          // Delete the old deal (this will cascade delete its price history due to FK)
          await db.delete(deals).where(eq(deals.id, replacingDealId));
          logger.info(`[Telegram] ✅ Deleted old deal ${replacingDealId}`);

          // We'll re-insert the price history after creating the new deal
          // Store it temporarily
          (deal as any)._oldPriceHistory = oldPriceHistory;
        }

        // Insert deal with processed URL and extracted prices
        const [insertedDeal] = await db.insert(deals).values({
          title: deal.title,
          description: deal.description,
          price: finalPrice, // Use extracted price from merchant
          originalPrice: finalOriginalPrice, // Use extracted MRP from merchant
          discountPercentage, // Calculated from extracted prices
          merchant: finalMerchant, // Use re-detected merchant from expanded URL
          url: processedUrl, // Use processed URL with your affiliate tags
          imageUrl: deal.imageUrl,
          userId: botUserId,
          categoryId,
          verified: priceVerified, // True if price was verified from merchant website
          verificationStatus: priceVerified ? 'verified' : 'pending',
        }).returning();

        // If we're replacing a deal, restore the old price history with new deal ID
        const oldPriceHistory = (deal as any)._oldPriceHistory;
        if (oldPriceHistory && oldPriceHistory.length > 0) {
          logger.info(`[Telegram] 📊 Restoring ${oldPriceHistory.length} price history entries...`);
          for (const entry of oldPriceHistory) {
            await db.insert(priceHistory).values({
              dealId: insertedDeal.id, // New deal ID
              price: entry.price,
              originalPrice: entry.originalPrice,
              merchant: entry.merchant,
              source: entry.source,
              scrapedAt: entry.scrapedAt,
            } as any).catch((err) => {
              logger.error(`[Telegram] Failed to restore price history entry: ${err.message}`);
            });
          }
          logger.info(`[Telegram] ✅ Restored price history from previous deal`);
        }

        // Create new price history entry for current price
        await db.insert(priceHistory).values({
          dealId: insertedDeal.id,
          price: finalPrice,
          merchant: finalMerchant,
          source: replacingDealId ? 'price_update' : 'scraper',
        } as any).catch((err) => {
          logger.error(`[Telegram] Failed to create price history: ${err.message}`);
        });

        // Generate 30 days of demo price history for the chart (only for new deals, not replacements)
        if (!replacingDealId) {
          generateDemoPriceHistory(
            insertedDeal.id,
            finalPrice,
            deal.originalPrice,
            finalMerchant
          ).catch((err) => {
            logger.error(`[Telegram] Failed to generate demo price history: ${err.message}`);
          });
        }

        // Calculate and save AI quality score
        let aiScore: number | null = null;
        try {
          const aiResult = await DealQualityService.calculateScore(insertedDeal.id);
          await db.update(deals).set({
            aiScore: aiResult.totalScore,
            aiScoreBreakdown: aiResult.breakdown,
          } as any).where(eq(deals.id, insertedDeal.id));
          aiScore = aiResult.totalScore;
          logger.info(`[Telegram] ✅ AI Score calculated: ${aiResult.totalScore}`);
        } catch (err: any) {
          logger.error(`[Telegram] Failed to calculate AI score: ${err.message}`);
        }

        // Index in Elasticsearch for search functionality
        try {
          await indexDeal({
            id: insertedDeal.id,
            title: insertedDeal.title,
            description: insertedDeal.description,
            price: insertedDeal.price,
            originalPrice: insertedDeal.originalPrice,
            discountPercentage: insertedDeal.discountPercentage,
            merchant: insertedDeal.merchant,
            url: insertedDeal.url,
            imageUrl: insertedDeal.imageUrl,
            categoryId: insertedDeal.categoryId,
            categoryName: null, // Will be populated on next reindex
            userId: insertedDeal.userId,
            username: 'deals-admin',
            upvotes: 0,
            downvotes: 0,
            score: 0,
            commentCount: 0,
            viewCount: 0,
            isExpired: false,
            festiveTags: null,
            seasonalTag: null,
            createdAt: insertedDeal.createdAt,
            updatedAt: insertedDeal.updatedAt,
          });
          logger.info(`[Telegram] ✅ Deal indexed in Elasticsearch`);
        } catch (err: any) {
          logger.error(`[Telegram] Failed to index in Elasticsearch: ${err.message}`);
        }

        // If replacing an old deal, delete it from Elasticsearch
        if (replacingDealId) {
          deleteFromElasticsearch(replacingDealId).catch((err) => {
            logger.error(`[Telegram] Failed to delete old deal from Elasticsearch: ${err.message}`);
          });
        }

        // Record that we've processed this message successfully
        await db.insert(telegramMessages).values({
          messageId: deal.messageId,
          channelUsername,
          dealId: insertedDeal.id,
          processed: true,
          skippedReason: null,
          postedAt: deal.postedAt,
        });

        imported++;
        logger.info(`[Telegram] Imported deal: ${deal.title.substring(0, 50)}...`);
      } catch (error: any) {
        logger.error(`[Telegram] Failed to import deal: ${error.message}`);
      }
    }

    logger.info(`[Telegram] Imported ${imported}/${scrapedDeals.length} deals`);
    return imported;
  }

  /**
   * Get the oldest processed message ID for a channel (for backfill)
   */
  private static async getOldestProcessedMessageId(channelUsername: string): Promise<string | null> {
    try {
      const result = await db
        .select({ messageId: telegramMessages.messageId })
        .from(telegramMessages)
        .where(eq(telegramMessages.channelUsername, channelUsername))
        .orderBy(telegramMessages.postedAt)
        .limit(1);

      return result[0]?.messageId || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Main method: Scrape and import deals from all channels
   *
   * Strategy (Two-Phase Approach):
   * =============================
   * PHASE 1 - NEW DEALS: Start from newest message, go backwards
   *   - Catches: E, F (new messages posted since last run)
   *   - Stops when: hits already-processed messages OR reaches target
   *
   * PHASE 2 - BACKFILL: Continue from oldest known message, go further back
   *   - Catches: A (messages we never reached before)
   *   - Stops when: reaches beginning of channel OR reaches target
   *
   * Timeline Example:
   *   Morning:  [A] → [B] → [C] → [D]     (D=newest)
   *             Scraped D,C,B - stopped at limit, A missed
   *
   *   Evening:  [A] → [B] → [C] → [D] → [E] → [F]  (F=newest)
   *             Phase 1: F,E (new) → D,C,B (skip, processed)
   *             Phase 2: Continue from A (oldest known) → go further back
   */
  static async scrapeAndImport(limitPerChannel?: number): Promise<number> {
    const channels = getEnabledChannels();
    const targetDealsPerChannel = limitPerChannel ?? TELEGRAM_SCRAPER_CONFIG.dealsPerChannel;
    const maxPagesToFetch = TELEGRAM_SCRAPER_CONFIG.maxPagesPerPhase ?? 10;
    const messagesPerPage = 50;
    const enablePhase1 = TELEGRAM_SCRAPER_CONFIG.enablePhase1NewDeals ?? true;
    const enablePhase2 = TELEGRAM_SCRAPER_CONFIG.enablePhase2Backfill ?? true;

    logger.info(`[Telegram] Starting scrape and import job for ${channels.length} channels (target: ${targetDealsPerChannel} deals each)`);
    logger.info(`[Telegram] Phase 1 (New Deals): ${enablePhase1 ? 'ENABLED' : 'DISABLED'}, Phase 2 (Backfill): ${enablePhase2 ? 'ENABLED' : 'DISABLED'}`);

    let totalImported = 0;

    for (const channel of channels) {
      try {
        logger.info(`\n[Telegram] ========== Scraping ${channel.username} ==========`);

        let channelImported = 0;
        let pagesFetched = 0;
        let oldestMessageId: string | null = null;
        let noMoreMessages = false;

        // ===== PHASE 1: Scrape NEW messages (from newest going back) =====
        if (enablePhase1) {
          logger.info(`[Telegram] 📥 Phase 1: Fetching NEW messages...`);

          while (channelImported < targetDealsPerChannel && pagesFetched < maxPagesToFetch && !noMoreMessages) {
            pagesFetched++;

            let url = channel.url;
            if (oldestMessageId) {
              const messageNumber = oldestMessageId.split('/').pop();
              url = `${channel.url}?before=${messageNumber}`;
              logger.info(`[Telegram] Fetching page ${pagesFetched} (before message ${messageNumber})...`);
            } else {
              logger.info(`[Telegram] Fetching page ${pagesFetched} (latest messages)...`);
            }

            const scrapedDeals = await this.scrapeDeals(url, messagesPerPage);

            if (scrapedDeals.length === 0) {
              logger.info(`[Telegram] No more messages to fetch`);
              noMoreMessages = true;
              break;
            }

            const lastDeal = scrapedDeals[scrapedDeals.length - 1];
            if (lastDeal && lastDeal.messageId === oldestMessageId) {
              noMoreMessages = true;
              break;
            }
            oldestMessageId = lastDeal?.messageId || null;

            logger.info(`[Telegram] Page ${pagesFetched}: Scraped ${scrapedDeals.length} messages`);

            const imported = await this.importDeals(scrapedDeals, channel.username);
            channelImported += imported;

            logger.info(`[Telegram] Page ${pagesFetched}: Imported ${imported} deals (total: ${channelImported}/${targetDealsPerChannel})`);

            // If we hit a wall of processed messages, switch to backfill
            if (imported === 0 && scrapedDeals.length >= 10) {
              logger.info(`[Telegram] Hit processed messages zone, switching to backfill...`);
              break;
            }

            if (imported === 0 && scrapedDeals.length < messagesPerPage) {
              noMoreMessages = true;
              break;
            }

            if (!noMoreMessages && channelImported < targetDealsPerChannel) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } else {
          logger.info(`[Telegram] ⏭️ Phase 1 DISABLED, skipping new messages...`);
        }

        // ===== PHASE 2: BACKFILL older messages we haven't reached yet =====
        if (enablePhase2 && channelImported < targetDealsPerChannel && !noMoreMessages) {
          logger.info(`[Telegram] 📦 Phase 2: BACKFILL - fetching older messages...`);

          const oldestKnownMessageId = await this.getOldestProcessedMessageId(channel.username);

          if (oldestKnownMessageId) {
            logger.info(`[Telegram] Oldest known message: ${oldestKnownMessageId}`);

            let backfillPages = 0;
            let backfillOldestId = oldestKnownMessageId;

            while (channelImported < targetDealsPerChannel && backfillPages < maxPagesToFetch) {
              backfillPages++;

              const messageNumber = backfillOldestId.split('/').pop();
              const url = `${channel.url}?before=${messageNumber}`;
              logger.info(`[Telegram] Backfill page ${backfillPages} (before message ${messageNumber})...`);

              const scrapedDeals = await this.scrapeDeals(url, messagesPerPage);

              if (scrapedDeals.length === 0) {
                logger.info(`[Telegram] 🏁 Reached beginning of channel history`);
                break;
              }

              const lastDeal = scrapedDeals[scrapedDeals.length - 1];
              if (lastDeal && lastDeal.messageId === backfillOldestId) {
                break;
              }
              backfillOldestId = lastDeal?.messageId || backfillOldestId;

              logger.info(`[Telegram] Backfill page ${backfillPages}: Scraped ${scrapedDeals.length} messages`);

              const imported = await this.importDeals(scrapedDeals, channel.username);
              channelImported += imported;

              logger.info(`[Telegram] Backfill page ${backfillPages}: Imported ${imported} deals (total: ${channelImported}/${targetDealsPerChannel})`);

              if (imported === 0 && scrapedDeals.length < messagesPerPage) {
                logger.info(`[Telegram] Backfill complete - no more new deals in history`);
                break;
              }

              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            logger.info(`[Telegram] No previous messages found, skipping backfill`);
          }
        } else if (!enablePhase2) {
          logger.info(`[Telegram] ⏭️ Phase 2 DISABLED, skipping backfill...`);
        }

        if (channelImported < targetDealsPerChannel) {
          logger.info(`[Telegram] ⚠️ Could only import ${channelImported}/${targetDealsPerChannel} deals from ${channel.username}`);
        } else {
          logger.info(`[Telegram] ✅ Reached target: ${channelImported} deals from ${channel.username}`);
        }

        totalImported += channelImported;

        await new Promise(resolve => setTimeout(resolve, TELEGRAM_SCRAPER_CONFIG.delayBetweenChannels));
      } catch (error: any) {
        logger.error(`[Telegram] Error processing channel ${channel.username}:`, error.message);
      }
    }

    logger.info(`\n[Telegram] ========== Job Complete ==========`);
    logger.info(`[Telegram] Total deals imported: ${totalImported} from ${channels.length} channels`);
    return totalImported;
  }

  /**
   * Scrape and import from a single channel
   */
  static async scrapeAndImportChannel(channelUrl: string, channelUsername: string, limit: number = 20): Promise<number> {
    logger.info(`[Telegram] Starting scrape and import for ${channelUsername}`);

    const scrapedDeals = await this.scrapeDeals(channelUrl, limit);

    if (scrapedDeals.length === 0) {
      logger.warn(`[Telegram] No deals scraped from ${channelUsername}`);
      return 0;
    }

    const imported = await this.importDeals(scrapedDeals, channelUsername);

    logger.info(`[Telegram] Job complete: ${imported} new deals imported from ${channelUsername}`);
    return imported;
  }
}
