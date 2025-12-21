#!/usr/bin/env tsx
import axios from 'axios';
import * as cheerio from 'cheerio';

const url = 'https://www.amazon.in/dp/B09KLM5QHM';

(async () => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(response.data);

  console.log('\n=== CURRENT PRICE SELECTORS ===');
  const priceSelectors = [
    '.a-price-whole',
    '#priceblock_dealprice',
    '#priceblock_ourprice',
    '.a-price .a-offscreen',
  ];

  for (const selector of priceSelectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      console.log(`${selector}: ${text}`);
    }
  }

  console.log('\n=== MRP/ORIGINAL PRICE SELECTORS ===');
  const mrpSelectors = [
    '.a-price[data-a-strike="true"] .a-offscreen',
    '.a-text-price .a-offscreen',
    '#priceblock_dealprice + .a-text-price',
    '.basisPrice .a-offscreen',
  ];

  for (const selector of mrpSelectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      console.log(`${selector}: ${text}`);
    }
  }

  console.log('\n=== ALL PRICE ELEMENTS ===');
  $('.a-price').each((i, el) => {
    const priceText = $(el).text().trim();
    const offscreen = $(el).find('.a-offscreen').text().trim();
    const hasStrike = $(el).attr('data-a-strike') === 'true';
    console.log(`Price ${i + 1}: ${priceText.substring(0, 30)} | offscreen: ${offscreen} | strike: ${hasStrike}`);
  });

  console.log('\n=== SEARCHING FOR "M.R.P" TEXT ===');
  const bodyText = $('body').text();
  const mrpMatches = bodyText.match(/M\.R\.P\.?\s*:?\s*₹\s*([\d,]+)/gi);
  if (mrpMatches) {
    mrpMatches.forEach(match => console.log(match));
  }
})();
