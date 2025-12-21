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

  // Extract current price
  let currentPrice: number | null = null;
  const priceSelectors = [
    '.a-price-whole',
    '#priceblock_dealprice',
    '#priceblock_ourprice',
    '.a-price .a-offscreen',
  ];

  for (const selector of priceSelectors) {
    const priceText = $(selector).first().text().trim();
    if (priceText) {
      currentPrice = parseInt(priceText.replace(/[₹,.\\s]/g, ''));
      if (currentPrice && currentPrice > 0) {
        console.log(`✅ Current Price found: ${selector} = ${priceText} → ${currentPrice}`);
        break;
      }
    }
  }

  // Extract MRP
  let originalPrice: number | null = null;
  const mrpSelectors = [
    '.a-price[data-a-strike="true"] .a-offscreen',
    '.a-text-price .a-offscreen',
    '#priceblock_dealprice + .a-text-price',
    '.basisPrice .a-offscreen',
  ];

  for (const selector of mrpSelectors) {
    const mrpText = $(selector).first().text().trim();
    console.log(`\nTrying selector: ${selector}`);
    console.log(`  Text found: "${mrpText}"`);

    if (mrpText) {
      const price = parseInt(mrpText.replace(/[₹,.\\s]/g, ''));
      console.log(`  Parsed price: ${price}`);
      console.log(`  Current price: ${currentPrice}`);
      console.log(`  Is price > currentPrice? ${price > currentPrice!}`);
      console.log(`  Is price < 1000000? ${price < 1000000}`);

      // Sanity check: MRP should be higher than current price and reasonable (< 1 million)
      if (price && price > currentPrice! && price < 1000000) {
        originalPrice = price;
        console.log(`  ✅ MATCHED! Using this as MRP: ${price}`);
        break;
      } else {
        console.log(`  ❌ REJECTED (sanity check failed)`);
      }
    } else {
      console.log(`  ❌ No text found`);
    }
  }

  console.log(`\n=== FINAL RESULT ===`);
  console.log(`Current Price: ₹${currentPrice}`);
  console.log(`Original Price (MRP): ₹${originalPrice}`);

  if (currentPrice && originalPrice) {
    const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    console.log(`Discount: ${discount}%`);
  }
})();
