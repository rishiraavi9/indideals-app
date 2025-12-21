#!/usr/bin/env tsx
/**
 * Force import fresh deals from Telegram
 */
import 'dotenv/config';
import { TelegramScraperService } from './src/services/scrapers/telegram-scraper.service.js';

console.log('\n🚀 Force Importing Deals from Telegram\n');
console.log('='.repeat(70));

(async () => {
  try {
    console.log('\n1️⃣  Scraping latest deals from Telegram channel...');
    const imported = await TelegramScraperService.scrapeAndImport(5);

    console.log(`\n✅ Successfully imported ${imported} deals!`);
    console.log('\n' + '='.repeat(70));
    console.log('\nYou can now view them at http://localhost:5173\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
