import 'dotenv/config';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, isNull, sql } from 'drizzle-orm';
import { DealQualityService } from './src/services/ai/deal-quality.service.js';

async function calculateAllScores() {
  console.log('Fetching deals without AI scores...');

  // Use raw SQL to avoid ORM isNull issues with drizzle
  const result = await db.execute(
    sql`SELECT id, title FROM deals WHERE ai_score IS NULL LIMIT 200`
  );
  const dealsWithoutScores = (result as any).rows || result;

  console.log(`Found ${dealsWithoutScores.length} deals to score`);

  for (const deal of dealsWithoutScores) {
    try {
      const result = await DealQualityService.calculateScore(deal.id);
      await db.update(deals).set({
        aiScore: result.totalScore,
        aiScoreBreakdown: result.breakdown,
      }).where(eq(deals.id, deal.id));
      const shortTitle = deal.title.length > 50 ? deal.title.substring(0, 50) + '...' : deal.title;
      console.log(`✓ ${shortTitle} -> Score: ${result.totalScore}`);
    } catch (err) {
      console.error(`✗ Failed to score ${deal.title}:`, err);
    }
  }

  console.log('\nDone!');
  process.exit(0);
}

calculateAllScores();
