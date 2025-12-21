#!/usr/bin/env tsx
/**
 * Test affiliate link processing
 */
import 'dotenv/config';
import { AffiliateService } from './src/services/affiliate.service.js';

console.log('\n🔗 Testing Affiliate Link Processing\n');
console.log('=' .repeat(70));

const testUrls = [
  'https://amzn.to/4qdnDEQ',  // Amazon shortened
  'https://fkrt.co/lHZ38M',    // Flipkart shortened
  'https://myntr.in/GgcVKW',   // Myntra shortened
  'https://ajiio.co/zavv4P',   // Ajio shortened
  'https://www.amazon.in/dp/B08L5VQGQY?tag=someothertag-21', // Amazon with wrong tag
];

(async () => {
  for (const url of testUrls) {
    console.log(`\n📌 Original URL:`);
    console.log(`   ${url}`);

    try {
      const processedUrl = await AffiliateService.processUrl(url);

      console.log(`\n✅ Processed URL:`);
      console.log(`   ${processedUrl}`);
      console.log(`   Length: ${processedUrl.length} chars`);

      // Check if affiliate ID is present
      if (processedUrl.includes('rishiraavi9-21')) {
        console.log(`   ✅ Contains your affiliate ID!`);
      } else {
        console.log(`   ⚠️  No affiliate ID found`);
      }

      console.log('\n' + '-'.repeat(70));
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Test complete!\n');

  process.exit(0);
})();
