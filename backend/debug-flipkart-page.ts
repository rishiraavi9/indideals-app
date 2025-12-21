#!/usr/bin/env tsx
import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://www.flipkart.com/india-desire-deals/p/indiadesire_deals?pid=TBTHYGC2JYXYGHQW';

(async () => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    console.log('\n=== CURRENT PRICE SELECTORS (Old) ===');
    const oldPriceSelectors = [
      '._30jeq3._16Jk6d',
      '._25b18c',
      '._30jeq3'
    ];

    for (const selector of oldPriceSelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        console.log(`${selector}: ${text}`);
      }
    }

    console.log('\n=== MRP SELECTORS (Old) ===');
    const oldMrpSelectors = [
      '._3I9_wc._2p6lqe',
      '._3auQ3N._1POkHg'
    ];

    for (const selector of oldMrpSelectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        console.log(`${selector}: ${text}`);
      }
    }

    console.log('\n=== ALL ELEMENTS WITH ₹ ===');
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('₹') && text.length < 50 && text.match(/₹\d/)) {
        const classes = $(el).attr('class') || 'no-class';
        console.log(`${classes.substring(0, 40)}: ${text.substring(0, 40)}`);
      }
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  }
})();
