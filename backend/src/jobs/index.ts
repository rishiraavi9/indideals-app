import {
  emailQueue,
  priceTrackerQueue,
  scraperQueue,
  dealVerifierQueue,
  alertProcessorQueue,
  cleanupQueue,
  telegramScraperQueue,
  setupScheduledJobs,
} from '../services/queue.service.js';
import { processAlertProcessor } from './alert-processor.job.js';
import { processPriceTracker } from './price-tracker.job.js';
import { processDealVerifier } from './deal-verifier.job.js';
import { processCleanup } from './cleanup.job.js';
import { processTelegramScraper } from './telegram-scraper.job.js';
import { logger } from '../utils/logger.js';
import { isFeatureEnabled } from '../config/features.js';

// Register all job processors (respects feature flags)
export const registerJobProcessors = () => {
  const registeredJobs: string[] = [];

  // Alert processor
  if (isFeatureEnabled('EMAIL_ALERTS')) {
    alertProcessorQueue.process('daily-digest', async (job) => {
      try {
        await processAlertProcessor(job);
      } catch (error) {
        logger.error('Alert processor job failed:', error);
        throw error;
      }
    });
    alertProcessorQueue.process('weekly-digest', async (job) => {
      try {
        await processAlertProcessor(job);
      } catch (error) {
        logger.error('Alert processor job failed:', error);
        throw error;
      }
    });
    registeredJobs.push('Alert Processor');
  }

  // Price tracker
  if (isFeatureEnabled('PRICE_TRACKING')) {
    priceTrackerQueue.process('track-all-prices', async (job) => {
      try {
        await processPriceTracker(job);
      } catch (error) {
        logger.error('Price tracker job failed:', error);
        throw error;
      }
    });
    registeredJobs.push('Price Tracker');
  }

  // Deal verifier
  if (isFeatureEnabled('DEAL_VERIFICATION')) {
    dealVerifierQueue.process('verify-single-deal', async (job) => {
      try {
        await processDealVerifier(job);
      } catch (error) {
        logger.error('Deal verifier job failed:', error);
        throw error;
      }
    });
    dealVerifierQueue.process('verify-all-deals', async (job) => {
      try {
        await processDealVerifier(job);
      } catch (error) {
        logger.error('Deal verifier job failed:', error);
        throw error;
      }
    });
    registeredJobs.push('Deal Verifier');
  }

  // Cleanup
  if (isFeatureEnabled('DATABASE_CLEANUP')) {
    cleanupQueue.process(async (job) => {
      try {
        await processCleanup(job);
      } catch (error) {
        logger.error('Cleanup job failed:', error);
        throw error;
      }
    });
    registeredJobs.push('Cleanup');
  }

  // Telegram scraper
  if (isFeatureEnabled('MERCHANT_SCRAPERS')) {
    telegramScraperQueue.process('scrape-telegram', async (job) => {
      try {
        await processTelegramScraper(job);
      } catch (error) {
        logger.error('Telegram scraper job failed:', error);
        throw error;
      }
    });
    registeredJobs.push('Telegram Scraper');
  }

  logger.info(`✅ Job processors registered: ${registeredJobs.join(', ')}`);

  // Setup scheduled jobs (only if Bull queues are enabled)
  if (isFeatureEnabled('BULL_QUEUES')) {
    setupScheduledJobs();
  }
};
