#!/usr/bin/env tsx
/**
 * Calculate AI score for a specific deal
 */
import 'dotenv/config';
import { DealQualityService } from './src/services/ai/deal-quality.service.js';
import { db } from './src/db/index.js';
import { deals } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const dealId = process.argv[2];

if (!dealId) {
  console.error('Usage: npx tsx score-deal.ts <deal-id>');
  process.exit(1);
}

console.log(`\n🤖 Calculating AI score for deal: ${dealId}\n`);

(async () => {
  try {
    // Calculate AI quality score (it will fetch the deal internally)
    const score = await DealQualityService.calculateScore(dealId);

    // Update deal with score
    await db
      .update(deals)
      .set({
        aiScore: score.totalScore,
        aiScoreBreakdown: score.breakdown,
      })
      .where(eq(deals.id, dealId));

    console.log('✅ AI Score calculated successfully!\n');
    console.log(`   Total Score: ${score.totalScore}/100`);
    console.log(`\n   Breakdown:`);
    console.log(`   • Value Proposition: ${score.breakdown.valueProp}/100`);
    console.log(`   • Authenticity: ${score.breakdown.authenticity}/100`);
    console.log(`   • Urgency: ${score.breakdown.urgency}/100`);
    console.log(`   • Social Proof: ${score.breakdown.socialProof}/100\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to calculate score:', error);
    process.exit(1);
  }
})();
