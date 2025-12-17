#!/usr/bin/env tsx
/**
 * Test Amazon India Scraper in Real-Time
 */

import { amazonService } from './src/services/merchants/amazon.service.js';
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const SYSTEM_USER_EMAIL = 'system@indiadeals.com';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testAmazonScraper() {
  try {
    log('\n' + '='.repeat(70), colors.bold + colors.cyan);
    log('  AMAZON INDIA SCRAPER - REAL-TIME TEST', colors.bold + colors.cyan);
    log('='.repeat(70) + '\n', colors.bold + colors.cyan);

    // Get system user
    const [systemUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, SYSTEM_USER_EMAIL))
      .limit(1);

    if (!systemUser) {
      log('❌ System user not found', colors.red);
      process.exit(1);
    }

    log(`✅ System user: ${systemUser.username} (${systemUser.id})`, colors.green);

    // Test 1: Scrape Amazon Deals Page
    log('\n📦 Test 1: Scraping Amazon India Daily Deals...', colors.cyan);
    log('URL: https://www.amazon.in/deals\n', colors.yellow);

    const startTime = Date.now();
    const deals = await amazonService.scrapeDailyDeals();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log(`\n✅ Scraping completed in ${duration}s`, colors.green);
    log(`📊 Found ${deals.length} deals\n`, colors.cyan);

    if (deals.length === 0) {
      log('⚠️  No deals found. This could mean:', colors.yellow);
      log('   1. Amazon has changed their HTML structure', colors.yellow);
      log('   2. Rate limiting or bot detection', colors.yellow);
      log('   3. Network issues', colors.yellow);
      log('   4. Page selectors need updating\n', colors.yellow);
      return;
    }

    // Display sample deals
    log('📋 Sample Deals (first 5):', colors.bold + colors.cyan);
    log('─'.repeat(70), colors.cyan);

    deals.slice(0, 5).forEach((deal, i) => {
      console.log(`\n${i + 1}. ${colors.bold}${deal.title}${colors.reset}`);
      console.log(`   Price: ${colors.green}₹${(deal.price / 100).toFixed(2)}${colors.reset}`);

      if (deal.originalPrice) {
        console.log(`   Original: ${colors.yellow}₹${(deal.originalPrice / 100).toFixed(2)}${colors.reset}`);
      }

      if (deal.discountPercentage) {
        console.log(`   Discount: ${colors.red}${deal.discountPercentage}% OFF${colors.reset}`);
      }

      console.log(`   URL: ${colors.cyan}${deal.productUrl}${colors.reset}`);

      if (deal.externalProductId) {
        console.log(`   ASIN: ${deal.externalProductId}`);
      }

      if (deal.imageUrl) {
        console.log(`   Image: ${deal.imageUrl.substring(0, 60)}...`);
      }
    });

    log('\n' + '─'.repeat(70), colors.cyan);

    // Statistics
    log('\n📈 Statistics:', colors.bold + colors.cyan);
    const withImages = deals.filter(d => d.imageUrl).length;
    const withDiscounts = deals.filter(d => d.discountPercentage).length;
    const withOriginalPrice = deals.filter(d => d.originalPrice).length;
    const avgPrice = deals.reduce((sum, d) => sum + d.price, 0) / deals.length;
    const avgDiscount = withDiscounts > 0
      ? deals.reduce((sum, d) => sum + (d.discountPercentage || 0), 0) / withDiscounts
      : 0;

    console.log(`   Total deals scraped: ${deals.length}`);
    console.log(`   Deals with images: ${withImages} (${((withImages / deals.length) * 100).toFixed(1)}%)`);
    console.log(`   Deals with discounts: ${withDiscounts} (${((withDiscounts / deals.length) * 100).toFixed(1)}%)`);
    console.log(`   Deals with original price: ${withOriginalPrice} (${((withOriginalPrice / deals.length) * 100).toFixed(1)}%)`);
    console.log(`   Average price: ₹${(avgPrice / 100).toFixed(2)}`);
    console.log(`   Average discount: ${avgDiscount.toFixed(1)}%`);

    // Test 2: Process and save deals
    log('\n\n💾 Test 2: Processing Scraped Deals...', colors.cyan);
    const results = await amazonService.processScrapedDeals(deals, systemUser.id);

    log('\n✅ Processing complete:', colors.green);
    console.log(`   ${colors.green}Created: ${results.created}${colors.reset}`);
    console.log(`   ${colors.yellow}Updated: ${results.updated}${colors.reset}`);
    console.log(`   ${colors.cyan}Skipped: ${results.skipped}${colors.reset}`);
    console.log(`   ${colors.red}Errors: ${results.errors}${colors.reset}`);

    // Test 3: Scrape a specific product (use first deal URL)
    if (deals.length > 0) {
      log('\n\n🔍 Test 3: Scraping Specific Product...', colors.cyan);
      log(`URL: ${deals[0].productUrl}\n`, colors.yellow);

      const startTime2 = Date.now();
      const productDeal = await amazonService.scrapeProductByUrl(deals[0].productUrl);
      const duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);

      if (productDeal) {
        log(`✅ Product scraped in ${duration2}s\n`, colors.green);
        console.log(`${colors.bold}${productDeal.title}${colors.reset}`);
        console.log(`Price: ${colors.green}₹${(productDeal.price / 100).toFixed(2)}${colors.reset}`);

        if (productDeal.originalPrice) {
          console.log(`Original: ${colors.yellow}₹${(productDeal.originalPrice / 100).toFixed(2)}${colors.reset}`);
        }

        if (productDeal.discountPercentage) {
          console.log(`Discount: ${colors.red}${productDeal.discountPercentage}% OFF${colors.reset}`);
        }

        if (productDeal.description) {
          console.log(`\nDescription: ${productDeal.description.substring(0, 200)}...`);
        }
      } else {
        log(`❌ Failed to scrape product in ${duration2}s`, colors.red);
      }
    }

    // Summary
    log('\n\n' + '='.repeat(70), colors.bold + colors.green);
    log('  ✅ AMAZON SCRAPER TEST COMPLETE', colors.bold + colors.green);
    log('='.repeat(70) + '\n', colors.bold + colors.green);

    log('Summary:', colors.bold);
    console.log(`  • Scraped ${deals.length} deals from Amazon India`);
    console.log(`  • Created ${results.created} new deals in database`);
    console.log(`  • Updated ${results.updated} existing deals`);
    console.log(`  • Time taken: ${duration}s`);
    console.log(`  • Status: ${colors.green}SUCCESS${colors.reset}\n`);

  } catch (error) {
    log('\n❌ Test failed with error:', colors.bold + colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    // Close the browser
    await amazonService.closeBrowser();
    process.exit(0);
  }
}

// Run test
testAmazonScraper();
