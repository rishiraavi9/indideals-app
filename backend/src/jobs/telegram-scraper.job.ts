import { Job } from 'bull';
import { TelegramScraperService } from '../services/scrapers/telegram-scraper.service.js';
import { logger } from '../utils/logger.js';

export const processTelegramScraper = async (job: Job) => {
  const { limit = 20 } = job.data;

  logger.info('[Job] Starting Telegram scraper job');

  try {
    const imported = await TelegramScraperService.scrapeAndImport(limit);

    logger.info(`[Job] Telegram scraper complete: ${imported} deals imported`);

    return {
      success: true,
      imported,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('[Job] Telegram scraper failed:', error);
    throw error;
  }
};
