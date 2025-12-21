#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { sql } from 'drizzle-orm';
import { AffiliateService } from './src/services/affiliate.service.js';

const urls = [
  'https://www.amazon.in/dp/B0CVF1C2WD/ref=cm_sw_r_as_gl_apa_gl_i_9R2NVJBBMSR1VG4S31VH?tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B09LLT4MSS?th=1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B0BFWRYBFR?smid=AJ6SIZC8YQDZX&th=1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B0C81TXG7P?social_share=cm_sw_r_ud_dp_3T57R04DM0ES4YWAQVH6&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B0BDFZLTGX?s=home-improvement&xpid=qoBxpKbXyoK8C&src=indd-iaa-freeee-stuufff&dealsby=indyafreeesfff&deals-from=1fs&th=1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B09Q6CLHHS?social_share=cm_sw_r_cp_ud_dp_QKK3AFD5SQDN8HVXXTR4&previewDohEventScheduleTesting=C&th=1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B084GG4B1W?social_share=cm_sw_r_ud_dp_ss_9VMF7XKRDGVMV964CTJK_1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B0DGTDYWJT?smid=A1WYWER0W24N8S&th=1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
  'https://www.amazon.in/dp/B07RXHYZK4?th=1&language=en_IN&ref_=as_li_ss_tl&tag=rishiraavi9-21',
];

console.log('\n🔧 Fixing 10 Deals\n');

(async () => {
  let fixed = 0;
  let failed = 0;

  for (const url of urls) {
    if (url.includes('amazon.com/?tag')) {
      console.log('\n⏭️  Skipping invalid URL (homepage)');
      failed++;
      continue;
    }

    try {
      // Extract price
      const priceInfo = await AffiliateService.extractPriceInfo(url);

      if (priceInfo.originalPrice && priceInfo.discountPercentage) {
        // Update using SQL directly
        await db.execute(
          sql`UPDATE deals SET original_price = ${priceInfo.originalPrice}, discount_percentage = ${priceInfo.discountPercentage} WHERE url = ${url}`
        );

        console.log(`\n✅ ${url.substring(0, 60)}...`);
        console.log(`   MRP: ₹${priceInfo.originalPrice}, Discount: ${priceInfo.discountPercentage}%`);
        fixed++;
      } else {
        console.log(`\n⚠️  ${url.substring(0, 60)}... - No MRP found`);
        failed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 2000));
    } catch (error: any) {
      console.log(`\n❌ ${url.substring(0, 60)}... - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n\n✅ Fixed: ${fixed}`);
  console.log(`❌ Failed: ${failed}\n`);
  process.exit(0);
})();
