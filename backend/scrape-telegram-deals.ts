#!/usr/bin/env tsx
/**
 * Scrape deals from Telegram channels
 */
import 'dotenv/config';
import { TelegramScraperService } from './src/services/scrapers/telegram-scraper.service.js';
import { logger } from './src/utils/logger.js';

const limitPerChannel = parseInt(process.argv[2]) || 30; // Default 30 to ensure we get at least 20 after filtering

console.log('\n📱 Scraping Telegram Deals\n');
console.log('='.repeat(70));
console.log(`Limit per channel: ${limitPerChannel} messages`);
console.log('Channels: MahidharZone, iamprasadtech');
console.log('='.repeat(70));

(async () => {
  try {
    const imported = await TelegramScraperService.scrapeAndImport(limitPerChannel);

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Successfully imported ${imported} total deals\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
