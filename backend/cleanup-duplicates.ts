#!/usr/bin/env tsx
/**
 * Cleanup existing duplicate deals using AI
 */
import 'dotenv/config';
import { AiDeduplicationService } from './src/services/ai-deduplication.service.js';

console.log('\n🧹 AI-Powered Duplicate Cleanup\n');
console.log('='.repeat(70));
console.log('\nThis script will use Claude AI to detect and remove duplicate deals.');
console.log('Duplicates are detected based on:');
console.log('  - Same product name (semantic similarity)');
console.log('  - Same merchant');
console.log('  - Similar price (within 10%)');
console.log('  - Same product URL\n');
console.log('='.repeat(70));

(async () => {
  try {
    console.log('\n🤖 Starting AI-powered duplicate detection...\n');

    const removedCount = await AiDeduplicationService.cleanupExistingDuplicates();

    console.log('\n' + '='.repeat(70));
    if (removedCount > 0) {
      console.log(`\n✅ Successfully removed ${removedCount} duplicate deals!`);
      console.log('\n💡 Your database is now cleaner and users will see unique deals only.\n');
    } else {
      console.log('\n✅ No duplicates found! Your database is already clean.\n');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
