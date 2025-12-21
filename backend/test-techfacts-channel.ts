import { TelegramScraperService } from './src/services/scrapers/telegram-scraper.service.js';

async function test() {
  console.log('Testing TechFactsDeals channel...\n');

  try {
    const count = await TelegramScraperService.scrapeAndImportChannel(
      'https://t.me/s/TechFactsDeals',
      'TechFactsDeals',
      5  // Just get 5 deals for testing
    );

    console.log('\n✅ Successfully scraped', count, 'deals from TechFactsDeals');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }

  process.exit(0);
}

test();
