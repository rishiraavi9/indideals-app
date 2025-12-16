import { scraperQueue, priceTrackerQueue, dealVerifierQueue, alertProcessorQueue, cleanupQueue } from '../services/queue.service';
import { logger } from '../utils/logger';

/**
 * Setup scheduled jobs for automated deal scraping, price tracking, and verification
 */
async function setupScheduler() {
  logger.info('Setting up job schedulers...');

  try {
    // ====================
    // MERCHANT SCRAPING
    // ====================

    // Scrape Flipkart every 6 hours
    await scraperQueue.add(
      'scrape-merchant',
      { merchantName: 'flipkart' },
      {
        repeat: {
          cron: '0 */6 * * *', // Every 6 hours
        },
        jobId: 'scrape-flipkart-recurring',
      }
    );
    logger.info('✅ Scheduled Flipkart scraping: Every 6 hours');

    // Scrape Amazon every 6 hours (offset by 3 hours to avoid overlap)
    await scraperQueue.add(
      'scrape-merchant',
      { merchantName: 'amazon' },
      {
        repeat: {
          cron: '0 3,9,15,21 * * *', // 3 AM, 9 AM, 3 PM, 9 PM
        },
        jobId: 'scrape-amazon-recurring',
      }
    );
    logger.info('✅ Scheduled Amazon scraping: Every 6 hours (offset)');

    // ====================
    // PRICE TRACKING
    // ====================

    // Track all prices every hour
    await priceTrackerQueue.add(
      'track-all-prices',
      { type: 'track-all-prices' },
      {
        repeat: {
          cron: '0 * * * *', // Every hour
        },
        jobId: 'track-all-prices-recurring',
      }
    );
    logger.info('✅ Scheduled price tracking: Every hour');

    // ====================
    // DEAL VERIFICATION
    // ====================

    // Verify deals every 12 hours
    await dealVerifierQueue.add(
      'verify-all-deals',
      {},
      {
        repeat: {
          cron: '0 */12 * * *', // Every 12 hours
        },
        jobId: 'verify-all-deals-recurring',
      }
    );
    logger.info('✅ Scheduled deal verification: Every 12 hours');

    // ====================
    // EMAIL ALERTS
    // ====================

    // Daily digest at 9 AM IST
    await alertProcessorQueue.add(
      'daily-digest',
      {},
      {
        repeat: {
          cron: '0 9 * * *', // 9 AM every day
          tz: 'Asia/Kolkata',
        },
        jobId: 'daily-digest-recurring',
      }
    );
    logger.info('✅ Scheduled daily digest emails: 9 AM IST');

    // Weekly digest on Monday at 9 AM IST
    await alertProcessorQueue.add(
      'weekly-digest',
      {},
      {
        repeat: {
          cron: '0 9 * * 1', // 9 AM every Monday
          tz: 'Asia/Kolkata',
        },
        jobId: 'weekly-digest-recurring',
      }
    );
    logger.info('✅ Scheduled weekly digest emails: Monday 9 AM IST');

    // ====================
    // CLEANUP
    // ====================

    // Cleanup old data at 2 AM IST daily
    await cleanupQueue.add(
      'cleanup-old-data',
      {},
      {
        repeat: {
          cron: '0 2 * * *', // 2 AM every day
          tz: 'Asia/Kolkata',
        },
        jobId: 'cleanup-old-data-recurring',
      }
    );
    logger.info('✅ Scheduled cleanup job: 2 AM IST daily');

    logger.info('🎉 All schedulers set up successfully!');

    // Log current scheduled jobs
    const scraperJobs = await scraperQueue.getRepeatableJobs();
    const priceJobs = await priceTrackerQueue.getRepeatableJobs();
    const verifierJobs = await dealVerifierQueue.getRepeatableJobs();
    const alertJobs = await alertProcessorQueue.getRepeatableJobs();
    const cleanupJobs = await cleanupQueue.getRepeatableJobs();

    logger.info(`\n📊 Scheduled Jobs Summary:`);
    logger.info(`  Scraper Queue: ${scraperJobs.length} jobs`);
    logger.info(`  Price Tracker Queue: ${priceJobs.length} jobs`);
    logger.info(`  Deal Verifier Queue: ${verifierJobs.length} jobs`);
    logger.info(`  Alert Processor Queue: ${alertJobs.length} jobs`);
    logger.info(`  Cleanup Queue: ${cleanupJobs.length} jobs`);

    return {
      success: true,
      totalJobs: scraperJobs.length + priceJobs.length + verifierJobs.length + alertJobs.length + cleanupJobs.length,
    };
  } catch (error) {
    logger.error('Error setting up schedulers:', error);
    throw error;
  }
}

/**
 * Remove all scheduled jobs (useful for resetting)
 */
async function clearAllSchedulers() {
  logger.info('Clearing all scheduled jobs...');

  try {
    const queues = [scraperQueue, priceTrackerQueue, dealVerifierQueue, alertProcessorQueue, cleanupQueue];

    for (const queue of queues) {
      const repeatableJobs = await queue.getRepeatableJobs();

      for (const job of repeatableJobs) {
        await queue.removeRepeatableByKey(job.key);
        logger.info(`Removed scheduled job: ${job.id || job.name}`);
      }
    }

    logger.info('✅ All scheduled jobs cleared');
  } catch (error) {
    logger.error('Error clearing schedulers:', error);
    throw error;
  }
}

export { setupScheduler, clearAllSchedulers };

// Run if called directly
const action = process.argv[2];

if (action === 'clear') {
  clearAllSchedulers()
    .then(() => {
      logger.info('Done!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error:', error);
      process.exit(1);
    });
} else {
  setupScheduler()
    .then(() => {
      logger.info('Done! Schedulers are now active.');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Error:', error);
      process.exit(1);
    });
}
