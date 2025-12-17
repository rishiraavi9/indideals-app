#!/usr/bin/env tsx
/**
 * Test Croma Scraper in Real-Time
 */

import { cromaService } from './src/services/merchants/croma.service.js';
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

async function testCromaScraper() {
  try {
    log('\n' + '='.repeat(70), colors.bold + colors.cyan);
    log('  CROMA SCRAPER - REAL-TIME TEST', colors.bold + colors.cyan);
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

    // Test: Scrape Croma Deals
    log('\n📦 Scraping Croma Deals Page...', colors.cyan);
    log('URL: https://www.croma.com/deals-of-the-day\n', colors.yellow);

    const startTime = Date.now();
    const deals = await cromaService.scrapeDailyDeals();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log(`\n✅ Scraping completed in ${duration}s`, colors.green);
    log(`📊 Found ${deals.length} deals\n`, colors.cyan);

    if (deals.length === 0) {
      log('⚠️  No deals found. Possible reasons:', colors.yellow);
      log('   1. Croma page structure changed', colors.yellow);
      log('   2. Network issues', colors.yellow);
      log('   3. Page selectors need updating', colors.yellow);
      log('   4. Bot detection (less likely for Croma)\n', colors.yellow);
      return;
    }

    // Success! Display deals
    log('🎉 SUCCESS! Deals scraped from Croma:', colors.bold + colors.green);
    log('─'.repeat(70), colors.cyan);

    deals.forEach((deal, i) => {
      console.log(`\n${i + 1}. ${colors.bold}${deal.title}${colors.reset}`);
      console.log(`   Price: ${colors.green}₹${deal.price.toLocaleString('en-IN')}${colors.reset}`);

      if (deal.originalPrice) {
        const savings = deal.originalPrice - deal.price;
        const savingsPercent = Math.round((savings / deal.originalPrice) * 100);
        console.log(`   Original: ${colors.yellow}₹${deal.originalPrice.toLocaleString('en-IN')}${colors.reset}`);
        console.log(`   Savings: ${colors.red}₹${savings.toLocaleString('en-IN')} (${savingsPercent}% OFF)${colors.reset}`);
      }

      if (deal.discountPercentage) {
        console.log(`   Discount: ${colors.red}${deal.discountPercentage}% OFF${colors.reset}`);
      }

      console.log(`   URL: ${colors.cyan}${deal.productUrl}${colors.reset}`);

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
    const totalSavings = deals.reduce((sum, d) => {
      return sum + (d.originalPrice ? d.originalPrice - d.price : 0);
    }, 0);

    console.log(`   Total deals: ${deals.length}`);
    console.log(`   With images: ${withImages} (${((withImages / deals.length) * 100).toFixed(1)}%)`);
    console.log(`   With discounts: ${withDiscounts} (${((withDiscounts / deals.length) * 100).toFixed(1)}%)`);
    console.log(`   With original price: ${withOriginalPrice} (${((withOriginalPrice / deals.length) * 100).toFixed(1)}%)`);
    console.log(`   Average price: ₹${avgPrice.toLocaleString('en-IN')}`);
    console.log(`   Total savings: ₹${totalSavings.toLocaleString('en-IN')}`);

    // Save to database
    log('\n\n💾 Saving Deals to Database...', colors.cyan);
    const results = await cromaService.processScrapedDeals(deals, systemUser.id);

    log('\n✅ Database update complete:', colors.green);
    console.log(`   ${colors.green}Created: ${results.created}${colors.reset}`);
    console.log(`   ${colors.yellow}Updated: ${results.updated}${colors.reset}`);
    console.log(`   ${colors.cyan}Skipped: ${results.skipped}${colors.reset}`);
    console.log(`   ${colors.red}Errors: ${results.errors}${colors.reset}`);

    // Summary
    log('\n\n' + '='.repeat(70), colors.bold + colors.green);
    log('  ✅ CROMA SCRAPER TEST COMPLETE - SUCCESS!', colors.bold + colors.green);
    log('='.repeat(70) + '\n', colors.bold + colors.green);

    log('Summary:', colors.bold);
    console.log(`  • Scraped ${deals.length} deals from Croma`);
    console.log(`  • Created ${results.created} new deals in database`);
    console.log(`  • Updated ${results.updated} existing deals`);
    console.log(`  • Time taken: ${duration}s`);
    console.log(`  • Status: ${colors.green}SUCCESS ✅${colors.reset}\n`);

    log('🎯 Next Steps:', colors.bold + colors.cyan);
    console.log('  1. Check the deals at http://localhost:5173');
    console.log('  2. Review deals in database');
    console.log('  3. Set up automated scraping job');
    console.log('  4. Configure scheduled scraping (daily/hourly)\n');

  } catch (error) {
    log('\n❌ Test failed with error:', colors.bold + colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await cromaService.closeBrowser();
    process.exit(0);
  }
}

// Run test
testCromaScraper();
