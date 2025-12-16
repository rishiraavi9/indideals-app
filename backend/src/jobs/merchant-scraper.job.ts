import { Job } from 'bull';
import { scraperQueue } from '../services/queue.service';
import { flipkartService } from '../services/merchants/flipkart.service';
import { amazonService } from '../services/merchants/amazon.service';
import { db } from '../db';
import { merchants, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

// Map of merchant slugs to service instances
const merchantServices: Record<string, any> = {
  flipkart: flipkartService,
  amazon: amazonService,
};

/**
 * Process merchant scraping jobs
 */
scraperQueue.process('scrape-merchant', async (job: Job) => {
  const { merchantName } = job.data;

  logger.info(`[MerchantScraperJob] Starting scraping for: ${merchantName}`);

  try {
    // Get merchant configuration from database
    const [merchant] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.slug, merchantName.toLowerCase()))
      .limit(1);

    if (!merchant) {
      throw new Error(`Merchant ${merchantName} not found in database`);
    }

    if (!merchant.isActive || !merchant.scrapingEnabled) {
      logger.warn(`[MerchantScraperJob] Merchant ${merchantName} is not active or scraping is disabled`);
      return { skipped: true, reason: 'Merchant inactive or scraping disabled' };
    }

    // Get merchant service
    const merchantService = merchantServices[merchant.slug];
    if (!merchantService) {
      throw new Error(`Scraper service not implemented for ${merchantName}`);
    }

    // Get or create system user for automated deals
    let [systemUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, 'ai-bot'))
      .limit(1);

    if (!systemUser) {
      // Create AI bot user if doesn't exist
      const bcrypt = await import('bcrypt');
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

      [systemUser] = await db
        .insert(users)
        .values({
          email: 'ai-bot@indadeals.internal',
          username: 'ai-bot',
          passwordHash: randomPassword,
          reputation: 1000, // High reputation for AI-posted deals
          emailVerified: true,
        })
        .returning();

      logger.info('[MerchantScraperJob] Created AI bot user');
    }

    // Run scraping job
    const results = await merchantService.runScrapingJob(systemUser.id);

    // Update merchant stats
    await db
      .update(merchants)
      .set({
        lastSyncAt: new Date(),
        dealsScrapedCount: merchant.dealsScrapedCount + results.created,
        updatedAt: new Date(),
      })
      .where(eq(merchants.id, merchant.id));

    logger.info(`[MerchantScraperJob] Completed scraping for ${merchantName}:`, results);

    return {
      success: true,
      merchant: merchantName,
      ...results,
    };
  } catch (error: any) {
    logger.error(`[MerchantScraperJob] Error scraping ${merchantName}:`, error);
    throw error; // Bull will retry based on job options
  }
});

/**
 * Process scraping for all active merchants
 */
scraperQueue.process('scrape-all-merchants', async (job: Job) => {
  logger.info('[MerchantScraperJob] Starting scraping for all merchants');

  try {
    // Get all active merchants with scraping enabled
    const activeMerchants = await db
      .select()
      .from(merchants)
      .where(eq(merchants.isActive, true));

    const results = [];

    for (const merchant of activeMerchants) {
      if (!merchant.scrapingEnabled) {
        logger.info(`[MerchantScraperJob] Skipping ${merchant.name} - scraping disabled`);
        continue;
      }

      try {
        // Queue individual merchant scraping job
        const scrapingJob = await scraperQueue.add('scrape-merchant', {
          merchantName: merchant.slug,
        });

        logger.info(`[MerchantScraperJob] Queued scraping job for ${merchant.name}: ${scrapingJob.id}`);

        results.push({
          merchant: merchant.name,
          jobId: scrapingJob.id,
          status: 'queued',
        });
      } catch (error: any) {
        logger.error(`[MerchantScraperJob] Error queuing ${merchant.name}:`, error);
        results.push({
          merchant: merchant.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    logger.info(`[MerchantScraperJob] Queued ${results.length} merchant scraping jobs`);

    return {
      success: true,
      totalMerchants: activeMerchants.length,
      queuedJobs: results.filter((r) => r.status === 'queued').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };
  } catch (error: any) {
    logger.error('[MerchantScraperJob] Error in scrape-all-merchants:', error);
    throw error;
  }
});

/**
 * Scrape specific product URL (on-demand)
 */
scraperQueue.process('scrape-product-url', async (job: Job) => {
  const { url, userId } = job.data;

  logger.info(`[MerchantScraperJob] Scraping product URL: ${url}`);

  try {
    // Detect merchant from URL
    let merchantService = null;
    let merchantName = '';

    if (url.includes('flipkart.com')) {
      merchantService = flipkartService;
      merchantName = 'Flipkart';
    } else if (url.includes('amazon.in')) {
      merchantService = amazonService;
      merchantName = 'Amazon India';
    } else {
      throw new Error('Unsupported merchant URL');
    }

    // Scrape product
    const scrapedDeal = await merchantService.scrapeProductByUrl(url);

    if (!scrapedDeal) {
      throw new Error('Failed to scrape product data');
    }

    // Save deal to database
    const dealId = await merchantService.saveDeal(scrapedDeal, userId);

    logger.info(`[MerchantScraperJob] Created deal ${dealId} from scraped URL: ${url}`);

    return {
      success: true,
      dealId,
      merchant: merchantName,
      deal: scrapedDeal,
    };
  } catch (error: any) {
    logger.error(`[MerchantScraperJob] Error scraping product URL ${url}:`, error);
    throw error;
  }
});

logger.info('[MerchantScraperJob] Job processors registered');

export default scraperQueue;
