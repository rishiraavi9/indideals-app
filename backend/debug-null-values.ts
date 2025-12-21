#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';

(async () => {
  const allDeals = await db.select().from(deals).limit(5);

  console.log('\n=== First 5 Deals ===\n');
  for (const deal of allDeals) {
    console.log(`Title: ${deal.title.substring(0, 40)}`);
    console.log(`  price: ${deal.price} (type: ${typeof deal.price})`);
    console.log(`  originalPrice: ${deal.originalPrice} (type: ${typeof deal.originalPrice})`);
    console.log(`  discountPercentage: ${deal.discountPercentage} (type: ${typeof deal.discountPercentage})`);
    console.log(`  originalPrice === null? ${deal.originalPrice === null}`);
    console.log(`  discountPercentage === null? ${deal.discountPercentage === null}`);
    console.log('');
  }

  process.exit(0);
})();
