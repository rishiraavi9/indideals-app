#!/usr/bin/env tsx
/**
 * Calculate AI scores for all deals
 */
import 'dotenv/config';
import { DealQualityService } from './src/services/ai/deal-quality.service.js';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq, isNull } from 'drizzle-orm';
import { logger } from './src/utils/logger.js';

console.log('\n🤖 Calculating AI scores for all deals\n');
console.log('='.repeat(70));

(async () => {
  try {
    // Get all deals without AI scores
    const dealsToScore = await db
      .select()
      .from(deals)
      .where(isNull(deals.aiScore));

    console.log(`\n📊 Found ${dealsToScore.length} deals to score\n`);

    let scored = 0;
    let failed = 0;

    for (const deal of dealsToScore) {
      try {
        console.log(`\n🔄 Scoring: ${deal.title.substring(0, 50)}...`);

        // Calculate AI quality score
        const score = await DealQualityService.calculateScore(deal.id);

        // Update deal with score
        await db
          .update(deals)
          .set({
            aiScore: score.totalScore,
            aiScoreBreakdown: score.breakdown,
          })
          .where(eq(deals.id, deal.id));

        console.log(`   ✅ Score: ${score.totalScore}/100`);
        console.log(`      • Value: ${score.breakdown.valueProp}/100`);
        console.log(`      • Auth: ${score.breakdown.authenticity}/100`);
        console.log(`      • Urgency: ${score.breakdown.urgency}/100`);
        console.log(`      • Social: ${score.breakdown.socialProof}/100`);

        scored++;

        // Rate limit to avoid overwhelming the database
        await new Promise(r => setTimeout(r, 100));
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Scored ${scored} deals`);
    console.log(`❌ Failed ${failed} deals\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
