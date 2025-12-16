import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from '../../db';
import { deals, priceHistory } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface ScrapedDeal {
  title: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  productUrl: string;
  imageUrl?: string;
  merchant: string;
  description?: string;
  externalProductId?: string; // Product ID from merchant site
  category?: string;
}

export interface ScraperConfig {
  headless: boolean;
  timeout: number;
  userAgent?: string;
  maxRetries: number;
}

export abstract class BaseMerchantService {
  protected abstract merchantName: string;
  protected abstract baseUrl: string;
  protected browser: Browser | null = null;

  protected config: ScraperConfig = {
    headless: true,
    timeout: 30000,
    maxRetries: 3,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  /**
   * Initialize Puppeteer browser instance
   */
  protected async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Create a new page with common settings
   */
  protected async createPage(): Promise<Page> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    // Set user agent to avoid bot detection
    if (this.config.userAgent) {
      await page.setUserAgent(this.config.userAgent);
    }

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set default timeout
    page.setDefaultNavigationTimeout(this.config.timeout);
    page.setDefaultTimeout(this.config.timeout);

    return page;
  }

  /**
   * Navigate to URL with retry logic
   */
  protected async navigateWithRetry(page: Page, url: string, retries = this.config.maxRetries): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2' });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Retry ${i + 1}/${retries} for ${url}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
      }
    }
  }

  /**
   * Extract price from string (removes ₹, commas, etc.)
   */
  protected parsePrice(priceStr: string): number | null {
    if (!priceStr) return null;

    // Remove ₹, Rs, commas, and whitespace
    const cleaned = priceStr.replace(/[₹Rs,\s]/g, '');
    const price = parseFloat(cleaned);

    return isNaN(price) ? null : Math.round(price);
  }

  /**
   * Calculate discount percentage
   */
  protected calculateDiscount(price: number, originalPrice: number): number {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  /**
   * Check if deal already exists in database
   */
  protected async checkDuplicateDeal(productUrl: string): Promise<string | null> {
    const [existingDeal] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.url, productUrl))
      .limit(1);

    return existingDeal?.id || null;
  }

  /**
   * Save scraped deal to database
   */
  protected async saveDeal(scrapedDeal: ScrapedDeal, userId: string): Promise<string> {
    const discountPct = scrapedDeal.originalPrice
      ? this.calculateDiscount(scrapedDeal.price, scrapedDeal.originalPrice)
      : scrapedDeal.discountPercentage || 0;

    const [newDeal] = await db
      .insert(deals)
      .values({
        title: scrapedDeal.title,
        description: scrapedDeal.description,
        price: scrapedDeal.price,
        originalPrice: scrapedDeal.originalPrice,
        discountPercentage: discountPct,
        merchant: scrapedDeal.merchant,
        url: scrapedDeal.productUrl,
        imageUrl: scrapedDeal.imageUrl,
        userId: userId, // System user for automated deals
        verificationStatus: 'verified', // Auto-verified from official merchant
        verified: true,
        verifiedAt: new Date(),
        urlAccessible: true,
        priceMatch: true,
      })
      .returning({ id: deals.id });

    // Add to price history
    await db.insert(priceHistory).values({
      dealId: newDeal.id,
      price: scrapedDeal.price,
      originalPrice: scrapedDeal.originalPrice,
      merchant: scrapedDeal.merchant,
      source: 'scraper',
    });

    return newDeal.id;
  }

  /**
   * Update existing deal price
   */
  protected async updateDealPrice(dealId: string, newPrice: number, newOriginalPrice?: number): Promise<void> {
    const discountPct = newOriginalPrice
      ? this.calculateDiscount(newPrice, newOriginalPrice)
      : 0;

    await db
      .update(deals)
      .set({
        price: newPrice,
        originalPrice: newOriginalPrice,
        discountPercentage: discountPct,
        lastVerifiedAt: new Date(),
      })
      .where(eq(deals.id, dealId));

    // Add to price history
    await db.insert(priceHistory).values({
      dealId: dealId,
      price: newPrice,
      originalPrice: newOriginalPrice,
      merchant: this.merchantName,
      source: 'scraper',
    });
  }

  /**
   * Abstract method: Scrape deals from merchant's deals page
   * Each merchant must implement this
   */
  abstract scrapeDailyDeals(): Promise<ScrapedDeal[]>;

  /**
   * Abstract method: Scrape specific product by URL
   * Each merchant must implement this
   */
  abstract scrapeProductByUrl(url: string): Promise<ScrapedDeal | null>;

  /**
   * Process scraped deals (save new, update existing)
   */
  async processScrapedDeals(scrapedDeals: ScrapedDeal[], systemUserId: string): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const scrapedDeal of scrapedDeals) {
      try {
        // Check if deal already exists
        const existingDealId = await this.checkDuplicateDeal(scrapedDeal.productUrl);

        if (existingDealId) {
          // Update price if changed
          await this.updateDealPrice(
            existingDealId,
            scrapedDeal.price,
            scrapedDeal.originalPrice
          );
          results.updated++;
        } else {
          // Create new deal
          await this.saveDeal(scrapedDeal, systemUserId);
          results.created++;
        }
      } catch (error) {
        console.error(`Error processing deal: ${scrapedDeal.title}`, error);
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Run full scraping job
   */
  async runScrapingJob(systemUserId: string): Promise<{
    merchant: string;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();

    try {
      console.log(`[${this.merchantName}] Starting scraping job...`);

      // Scrape deals
      const scrapedDeals = await this.scrapeDailyDeals();
      console.log(`[${this.merchantName}] Scraped ${scrapedDeals.length} deals`);

      // Process deals
      const results = await this.processScrapedDeals(scrapedDeals, systemUserId);

      const duration = Date.now() - startTime;

      console.log(`[${this.merchantName}] Job complete:`, {
        ...results,
        duration: `${(duration / 1000).toFixed(2)}s`,
      });

      return {
        merchant: this.merchantName,
        ...results,
        duration,
      };
    } catch (error) {
      console.error(`[${this.merchantName}] Scraping job failed:`, error);
      throw error;
    } finally {
      await this.closeBrowser();
    }
  }
}
