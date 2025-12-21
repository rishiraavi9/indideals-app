#!/usr/bin/env tsx
/**
 * Check which features are enabled
 */
import 'dotenv/config';
import { features, getEnabledFeatures, getDisabledFeatures } from './src/config/features.js';

console.log('\n🚩 Current Feature Flag Status\n');
console.log('='.repeat(70));

console.log('\n✅ ENABLED FEATURES:');
const enabled = getEnabledFeatures();
enabled.forEach(feature => {
  console.log(`  ✅ ${feature}`);
});

console.log('\n❌ DISABLED FEATURES:');
const disabled = getDisabledFeatures();
disabled.forEach(feature => {
  console.log(`  ❌ ${feature}`);
});

console.log('\n' + '='.repeat(70));
console.log('\nKey Features for Telegram Scraper:');
console.log(`  BULL_QUEUES: ${features.BULL_QUEUES ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  MERCHANT_SCRAPERS: ${features.MERCHANT_SCRAPERS ? '✅ Enabled' : '❌ Disabled'}`);
console.log('');

if (features.BULL_QUEUES && features.MERCHANT_SCRAPERS) {
  console.log('✅ Telegram scraper scheduled job should be ACTIVE\n');
  console.log('📅 Schedule: Every 2 hours (cron: "0 */2 * * *")');
  console.log('📋 Limit: 20 deals per run');
  console.log('🔗 Source: https://t.me/s/iamprasadtech\n');
} else {
  console.log('❌ Telegram scraper is NOT active because:');
  if (!features.BULL_QUEUES) console.log('  - BULL_QUEUES is disabled');
  if (!features.MERCHANT_SCRAPERS) console.log('  - MERCHANT_SCRAPERS is disabled');
  console.log('');
}

process.exit(0);
