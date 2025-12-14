import { db, deals } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function addFestiveTags() {
  console.log('Adding festive tags to deals...');

  // Update some deals with festive tags
  // Since we don't know exact deal content, we'll add seasonal/festive tags to random deals

  // Get all deals
  const allDeals = await db.query.deals.findMany();

  if (allDeals.length === 0) {
    console.log('No deals found to update');
    return;
  }

  // Add festive tags to first few deals
  const festiveTags = [
    ['diwali', 'festival-of-lights'],
    ['christmas', 'new-year'],
    ['pongal', 'harvest-festival'],
    ['holi', 'colors'],
    ['eid', 'ramadan'],
  ];

  let updateCount = 0;
  for (let i = 0; i < Math.min(allDeals.length, 10); i++) {
    const deal = allDeals[i];
    const randomFestive = festiveTags[i % festiveTags.length];

    await db.update(deals)
      .set({
        festiveTags: randomFestive,
        seasonalTag: 'winter' // Current season
      })
      .where(sql`${deals.id} = ${deal.id}`);

    updateCount++;
    console.log(`Updated deal: ${deal.title} with tags: ${randomFestive.join(', ')}`);
  }

  console.log(`\nSuccessfully updated ${updateCount} deals with festive tags!`);
  process.exit(0);
}

addFestiveTags().catch((error) => {
  console.error('Error adding festive tags:', error);
  process.exit(1);
});
