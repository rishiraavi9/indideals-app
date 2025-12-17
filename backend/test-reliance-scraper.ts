#!/usr/bin/env tsx
/**
 * Test Reliance Digital Scraper - Real Product Data
 */

import puppeteer from 'puppeteer';
import { db } from './src/db/index.js';
import { users, deals, priceHistory } from './src/db/schema.js';
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

async function testRelianceScraper() {
  log('\n' + '='.repeat(70), colors.bold + colors.cyan);
  log('  RELIANCE DIGITAL SCRAPER - REAL-TIME TEST', colors.bold + colors.cyan);
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

  log(`✅ System user: ${systemUser.username}`, colors.green);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );

    log('\n📦 Scraping Reliance Digital Homepage...', colors.cyan);
    const url = 'https://www.reliancedigital.in/';
    log(`URL: ${url}\n`, colors.yellow);

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Scroll to load more products
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract product data
    const products = await page.evaluate(() => {
      const productCards = document.querySelectorAll(
        '[class*="Product"], [data-test*="product"], .product-card, [class*="product-item"]'
      );

      const results: any[] = [];

      productCards.forEach((card) => {
        try {
          // Title
          const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="name"]');
          const title = titleEl?.textContent?.trim();
          if (!title) return;

          // Price
          const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
          const priceText = priceEl?.textContent?.trim();
          if (!priceText) return;

          const priceMatch = priceText.match(/[\d,]+/);
          if (!priceMatch) return;
          const price = parseInt(priceMatch[0].replace(/,/g, ''));

          // URL
          const linkEl = card.querySelector('a[href]') as HTMLAnchorElement;
          const href = linkEl?.getAttribute('href');
          if (!href) return;

          const productUrl = href.startsWith('http')
            ? href
            : `https://www.reliancedigital.in${href}`;

          // Image
          const imgEl = card.querySelector('img') as HTMLImageElement;
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src');

          results.push({
            title: title.substring(0, 255),
            price,
            productUrl,
            imageUrl,
          });
        } catch (err) {
          // Skip problematic cards
        }
      });

      return results;
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    log(`✅ Scraping completed in ${duration}s`, colors.green);
    log(`📊 Found ${products.length} products\n`, colors.cyan);

    if (products.length === 0) {
      log('⚠️  No products found', colors.yellow);
      return;
    }

    // Display products
    log('🎉 SUCCESS! Products scraped from Reliance Digital:', colors.bold + colors.green);
    log('─'.repeat(70), colors.cyan);

    products.slice(0, 10).forEach((product, i) => {
      console.log(`\n${i + 1}. ${colors.bold}${product.title}${colors.reset}`);
      console.log(`   Price: ${colors.green}₹${product.price.toLocaleString('en-IN')}${colors.reset}`);
      console.log(`   URL: ${colors.cyan}${product.productUrl}${colors.reset}`);
      if (product.imageUrl) {
        console.log(`   Image: ${product.imageUrl.substring(0, 60)}...`);
      }
    });

    log('\n' + '─'.repeat(70), colors.cyan);

    // Save to database
    log('\n💾 Saving Products to Database...', colors.cyan);

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Check if deal exists
        const [existing] = await db
          .select()
          .from(deals)
          .where(eq(deals.url, product.productUrl))
          .limit(1);

        if (existing) {
          // Update price
          await db
            .update(deals)
            .set({
              price: product.price,
              lastVerifiedAt: new Date(),
            })
            .where(eq(deals.id, existing.id));

          // Add price history
          await db.insert(priceHistory).values({
            dealId: existing.id,
            price: product.price,
            merchant: 'Reliance Digital',
            source: 'scraper',
          });

          updated++;
        } else {
          // Create new deal
          const [newDeal] = await db
            .insert(deals)
            .values({
              title: product.title,
              price: product.price,
              merchant: 'Reliance Digital',
              url: product.productUrl,
              imageUrl: product.imageUrl,
              userId: systemUser.id,
              verificationStatus: 'verified',
              verified: true,
              verifiedAt: new Date(),
              urlAccessible: true,
            })
            .returning({ id: deals.id });

          // Add price history
          await db.insert(priceHistory).values({
            dealId: newDeal.id,
            price: product.price,
            merchant: 'Reliance Digital',
            source: 'scraper',
          });

          created++;
        }
      } catch (err) {
        console.error(`Error saving product: ${product.title}`, err);
        errors++;
      }
    }

    log('\n✅ Database update complete:', colors.green);
    console.log(`   ${colors.green}Created: ${created}${colors.reset}`);
    console.log(`   ${colors.yellow}Updated: ${updated}${colors.reset}`);
    console.log(`   ${colors.red}Errors: ${errors}${colors.reset}`);

    // Summary
    log('\n\n' + '='.repeat(70), colors.bold + colors.green);
    log('  ✅ RELIANCE DIGITAL SCRAPER - SUCCESS!', colors.bold + colors.green);
    log('='.repeat(70) + '\n', colors.bold + colors.green);

    log('Summary:', colors.bold);
    console.log(`  • Scraped ${products.length} products from Reliance Digital`);
    console.log(`  • Created ${created} new deals in database`);
    console.log(`  • Updated ${updated} existing deals`);
    console.log(`  • Time taken: ${duration}s`);
    console.log(`  • Status: ${colors.green}SUCCESS ✅${colors.reset}\n`);

    log('🎯 Next Steps:', colors.bold + colors.cyan);
    console.log('  1. View deals at http://localhost:5173');
    console.log('  2. Set up automated scraping job for Reliance Digital');
    console.log('  3. Add more merchants (similar approach)\n');

  } catch (error) {
    log('\n❌ Test failed:', colors.red);
    console.error(error);
  } finally {
    await browser.close();
  }
}

testRelianceScraper()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
