import Bull from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { TELEGRAM_SCRAPER_CONFIG } from '../config/telegram-channels.js';

// Redis connection options
const redisOptions = {
  redis: {
    host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
    port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port) : 6379,
    password: env.REDIS_PASSWORD,
  },
};

// Create queues for different job types
export const emailQueue = new Bull('email', redisOptions);
export const priceTrackerQueue = new Bull('price-tracker', redisOptions);
export const scraperQueue = new Bull('scraper', redisOptions);
export const dealVerifierQueue = new Bull('deal-verifier', redisOptions);
export const alertProcessorQueue = new Bull('alert-processor', redisOptions);
export const cleanupQueue = new Bull('cleanup', redisOptions);
export const telegramScraperQueue = new Bull('telegram-scraper', redisOptions);

// Bull Board setup for queue monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(priceTrackerQueue),
    new BullAdapter(scraperQueue),
    new BullAdapter(dealVerifierQueue),
    new BullAdapter(alertProcessorQueue),
    new BullAdapter(cleanupQueue),
    new BullAdapter(telegramScraperQueue),
  ],
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();

// Queue event listeners for logging
const setupQueueListeners = (queue: Bull.Queue, queueName: string) => {
  queue.on('error', (error) => {
    logger.error(`Queue ${queueName} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in queue ${queueName} failed:`, error);
  });

  queue.on('completed', (job) => {
    logger.info(`Job ${job.id} in queue ${queueName} completed`);
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} in queue ${queueName} stalled`);
  });
};

// Setup listeners for all queues
setupQueueListeners(emailQueue, 'email');
setupQueueListeners(priceTrackerQueue, 'price-tracker');
setupQueueListeners(scraperQueue, 'scraper');
setupQueueListeners(dealVerifierQueue, 'deal-verifier');
setupQueueListeners(alertProcessorQueue, 'alert-processor');
setupQueueListeners(cleanupQueue, 'cleanup');
setupQueueListeners(telegramScraperQueue, 'telegram-scraper');

// Helper function to add jobs with retry policy
export const addJob = async (
  queue: Bull.Queue,
  jobName: string,
  data: any,
  options?: Bull.JobOptions
) => {
  const defaultOptions: Bull.JobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  };

  return queue.add(jobName, data, { ...defaultOptions, ...options });
};

// Scheduled jobs using Bull's repeat functionality
export const setupScheduledJobs = () => {
  // Process daily alerts every day at 9 AM
  alertProcessorQueue.add(
    'daily-digest',
    {},
    {
      repeat: {
        cron: '0 9 * * *', // 9 AM every day
      },
    }
  );

  // Process weekly alerts every Monday at 9 AM
  alertProcessorQueue.add(
    'weekly-digest',
    {},
    {
      repeat: {
        cron: '0 9 * * 1', // 9 AM every Monday
      },
    }
  );

  // Track prices every hour
  priceTrackerQueue.add(
    'track-all-prices',
    {},
    {
      repeat: {
        cron: '0 * * * *', // Every hour
      },
    }
  );

  // Verify deals every 6 hours
  dealVerifierQueue.add(
    'verify-all-deals',
    {},
    {
      repeat: {
        cron: '0 */6 * * *', // Every 6 hours
      },
    }
  );

  // Cleanup old data every day at 2 AM
  cleanupQueue.add(
    'cleanup-old-data',
    {},
    {
      repeat: {
        cron: '0 2 * * *', // 2 AM every day
      },
    }
  );

  // Scrape Telegram channels (schedule configured in telegram-channels.ts)
  telegramScraperQueue.add(
    'scrape-telegram',
    { limit: TELEGRAM_SCRAPER_CONFIG.dealsPerChannel },
    {
      repeat: {
        cron: TELEGRAM_SCRAPER_CONFIG.scheduleCron,
      },
    }
  );

  logger.info('Scheduled jobs configured');
};

// Graceful shutdown
export const shutdownQueues = async () => {
  logger.info('Shutting down queues...');
  await Promise.all([
    emailQueue.close(),
    priceTrackerQueue.close(),
    scraperQueue.close(),
    dealVerifierQueue.close(),
    alertProcessorQueue.close(),
    cleanupQueue.close(),
  ]);
  logger.info('All queues shut down');
};
