#!/usr/bin/env tsx
import 'dotenv/config';
import { TelegramScraperService } from './src/services/scrapers/telegram-scraper.service.js';

console.log('\n🧪 Testing Telegram Scraper\n');
console.log('='.repeat(70));

(async () => {
  try {
    // Test scraping (limit to 5 deals for testing)
    console.log('\n📡 Scraping Telegram channel...\n');
    const imported = await TelegramScraperService.scrapeAndImport(5);

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Test complete: ${imported} deals imported\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
