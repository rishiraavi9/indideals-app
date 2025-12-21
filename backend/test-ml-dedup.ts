#!/usr/bin/env tsx
/**
 * Test ML-based duplicate detection
 */
import 'dotenv/config';
import { MlDeduplicationService } from './src/services/ml-deduplication.service.js';

console.log('\n🤖 Testing ML Duplicate Detection\n');
console.log('='.repeat(70));

const testDeals = [
  {
    title: '🔥🔥Havells MIXWELL 500 W 3 Jar Mixer Grinder',
    price: 1799,
    merchant: 'Amazon',
    url: 'https://www.amazon.in/dp/B09LLT4MSS',
  },
  {
    title: 'Havells MIXWELL 500W Mixer Grinder - Best Deal!',
    price: 1850,
    merchant: 'Amazon',
    url: null,
  },
  {
    title: 'Sony Headphones WH-1000XM5',
    price: 24990,
    merchant: 'Amazon',
    url: null,
  },
  {
    title: '🔥Milton Food Fiesta Tiffin Box Set',
    price: 799,
    merchant: 'Amazon',
    url: null,
  },
];

(async () => {
  for (const deal of testDeals) {
    console.log(`\n📦 Testing Deal:`);
    console.log(`   Title: ${deal.title}`);
    console.log(`   Price: ₹${deal.price}`);
    console.log(`   Merchant: ${deal.merchant}`);

    const result = await MlDeduplicationService.checkForDuplicates(deal);

    console.log(`\n   Result: ${result.isDuplicate ? '❌ DUPLICATE' : '✅ UNIQUE'}`);
    console.log(`   Similarity Score: ${result.similarityScore}%`);
    console.log(`   Reason: ${result.reason}`);
    console.log('\n' + '-'.repeat(70));
  }

  console.log('\n✅ Test complete!\n');
  process.exit(0);
})();
