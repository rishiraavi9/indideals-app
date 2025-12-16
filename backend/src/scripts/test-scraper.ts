import { flipkartService } from '../services/merchants/flipkart.service';
import { amazonService } from '../services/merchants/amazon.service';
import { logger } from '../utils/logger';

/**
 * Test merchant scrapers
 */
async function testScrapers() {
  logger.info('🧪 Testing merchant scrapers...\n');

  // ====================
  // TEST FLIPKART SCRAPER
  // ====================

  logger.info('='.repeat(50));
  logger.info('TESTING FLIPKART SCRAPER');
  logger.info('='.repeat(50));

  try {
    logger.info('Scraping Flipkart product page...');
    const flipkartUrl = 'https://www.flipkart.com/lenovo-l-series-60-96-cm-24-inch-full-hd-ips-panel-3wx2-speakers-99-srgb-1x-usb-c-pd-3-0-75w-hdmi-1-4-5gbps-dp-1-2-tilt-swivel-pivot-height-adjust-ultraslim-monitor-l24d-4c/p/itme2872b2ca8ff8?pid=MONHGWFA2G3HCKYZ';

    const flipkartDeal = await flipkartService.scrapeProductByUrl(flipkartUrl);

    if (flipkartDeal) {
      logger.info('✅ Flipkart scraping successful!\n');
      logger.info('Product Details:');
      logger.info(`  Title: ${flipkartDeal.title}`);
      logger.info(`  Price: ₹${flipkartDeal.price}`);
      logger.info(`  Original Price: ₹${flipkartDeal.originalPrice || 'N/A'}`);
      logger.info(`  Discount: ${flipkartDeal.discountPercentage}%`);
      logger.info(`  Image: ${flipkartDeal.imageUrl ? 'Available' : 'Not found'}`);
      logger.info(`  Product ID: ${flipkartDeal.externalProductId || 'Not found'}`);
    } else {
      logger.error('❌ Flipkart scraping failed - No data returned');
    }
  } catch (error) {
    logger.error('❌ Flipkart scraping failed:', error);
  }

  logger.info('\n');

  // ====================
  // TEST AMAZON SCRAPER
  // ====================

  logger.info('='.repeat(50));
  logger.info('TESTING AMAZON SCRAPER');
  logger.info('='.repeat(50));

  try {
    logger.info('Scraping Amazon product page...');
    const amazonUrl = 'https://www.amazon.in/dp/B0C54H3YK1';

    const amazonDeal = await amazonService.scrapeProductByUrl(amazonUrl);

    if (amazonDeal) {
      logger.info('✅ Amazon scraping successful!\n');
      logger.info('Product Details:');
      logger.info(`  Title: ${amazonDeal.title}`);
      logger.info(`  Price: ₹${amazonDeal.price}`);
      logger.info(`  Original Price: ₹${amazonDeal.originalPrice || 'N/A'}`);
      logger.info(`  Discount: ${amazonDeal.discountPercentage}%`);
      logger.info(`  Image: ${amazonDeal.imageUrl ? 'Available' : 'Not found'}`);
      logger.info(`  ASIN: ${amazonDeal.externalProductId || 'Not found'}`);
    } else {
      logger.error('❌ Amazon scraping failed - No data returned');
    }
  } catch (error) {
    logger.error('❌ Amazon scraping failed:', error);
  }

  logger.info('\n');

  // ====================
  // TEST DAILY DEALS SCRAPING
  // ====================

  logger.info('='.repeat(50));
  logger.info('TESTING DAILY DEALS SCRAPING');
  logger.info('='.repeat(50));

  // Uncomment to test full daily deals scraping (takes longer)
  /*
  try {
    logger.info('Scraping Flipkart daily deals...');
    const flipkartDeals = await flipkartService.scrapeDailyDeals();
    logger.info(`✅ Scraped ${flipkartDeals.length} Flipkart deals`);

    if (flipkartDeals.length > 0) {
      logger.info('\nSample deals:');
      flipkartDeals.slice(0, 3).forEach((deal, i) => {
        logger.info(`\n${i + 1}. ${deal.title}`);
        logger.info(`   Price: ₹${deal.price} | Discount: ${deal.discountPercentage}%`);
      });
    }
  } catch (error) {
    logger.error('❌ Flipkart daily deals scraping failed:', error);
  }
  */

  logger.info('\n='.repeat(50));
  logger.info('✅ Scraper testing complete!');
  logger.info('='.repeat(50));

  // Close browser instances
  await flipkartService.closeBrowser();
  await amazonService.closeBrowser();
}

// Run test if called directly
if (require.main === module) {
  testScrapers()
    .then(() => {
      logger.info('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export { testScrapers };
