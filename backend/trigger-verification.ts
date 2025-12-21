#!/usr/bin/env tsx
/**
 * Trigger verification for a specific deal
 */
import { dealVerifierQueue, addJob } from './src/services/queue.service.js';

const dealId = process.argv[2];

if (!dealId) {
  console.error('Usage: npx tsx trigger-verification.ts <deal-id>');
  process.exit(1);
}

console.log(`\n🔍 Queueing verification for deal: ${dealId}\n`);

addJob(dealVerifierQueue, 'verify-single-deal', {
  type: 'verify-single-deal',
  dealId,
  verificationType: 'manual',
}, {
  delay: 0, // Immediate
  priority: 1,
})
  .then(() => {
    console.log('✅ Verification job queued successfully!');
    console.log('   Check status in Bull Board: http://localhost:3001/admin/queues\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to queue verification:', error);
    process.exit(1);
  });
