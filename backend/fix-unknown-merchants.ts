#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';

console.log('\n🔧 Fixing Unknown Merchants\n');

function detectMerchant(url: string | null): string {
  if (!url) return 'Unknown';

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('amazon')) return 'Amazon';
  if (lowerUrl.includes('flipkart')) return 'Flipkart';
  if (lowerUrl.includes('myntra')) return 'Myntra';
  if (lowerUrl.includes('ajio')) return 'Ajio';
  if (lowerUrl.includes('paytm')) return 'Paytm';
  if (lowerUrl.includes('snapdeal')) return 'Snapdeal';
  if (lowerUrl.includes('tatacliq')) return 'Tata CLiQ';
  if (lowerUrl.includes('nykaa')) return 'Nykaa';
  if (lowerUrl.includes('meesho')) return 'Meesho';
  if (lowerUrl.includes('jiomart')) return 'JioMart';

  return 'Unknown';
}

(async () => {
  // Get all deals with Unknown merchant
  const unknownDeals = await db.execute(
    sql`SELECT id, title, merchant, url FROM deals WHERE merchant = 'Unknown' OR merchant IS NULL`
  );

  const rows = Array.isArray(unknownDeals) ? unknownDeals : (unknownDeals.rows || []);

  console.log(`Found ${rows.length} deals with Unknown merchant\n`);

  let fixed = 0;

  for (const deal of rows) {
    const detectedMerchant = detectMerchant(deal.url);

    if (detectedMerchant !== 'Unknown') {
      await db.execute(
        sql`UPDATE deals SET merchant = ${detectedMerchant} WHERE id = ${deal.id}`
      );

      console.log(`✅ ${deal.title.substring(0, 50)}... → ${detectedMerchant}`);
      fixed++;
    } else {
      console.log(`⚠️  ${deal.title.substring(0, 50)}... → Still Unknown`);
    }
  }

  console.log(`\n✅ Fixed ${fixed} deals\n`);
  process.exit(0);
})();
