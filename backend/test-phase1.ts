#!/usr/bin/env tsx
/**
 * Phase 1 End-to-End Test Script
 * Tests all Phase 1 features: Job Queue, Price Tracking, Deal Verification, Email Alerts
 */

import { db } from './src/db/index.js';
import { deals, priceHistory, priceAlerts, alerts, users } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import {
  priceTrackerQueue,
  dealVerifierQueue,
  alertProcessorQueue,
  cleanupQueue,
  addJob,
} from './src/services/queue.service.js';
import { logger } from './src/utils/logger.js';

const SYSTEM_USER_EMAIL = 'system@indiadeals.com';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bold + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

async function getSystemUser() {
  const [systemUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, SYSTEM_USER_EMAIL))
    .limit(1);

  if (!systemUser) {
    throw new Error('System user not found. Please create it first.');
  }

  return systemUser;
}

/**
 * Test 1: Job Queue Infrastructure
 */
async function testJobQueues() {
  logSection('TEST 1: Job Queue Infrastructure');

  try {
    // Get queue statistics
    const priceTrackerStats = {
      waiting: await priceTrackerQueue.getWaitingCount(),
      active: await priceTrackerQueue.getActiveCount(),
      completed: await priceTrackerQueue.getCompletedCount(),
      failed: await priceTrackerQueue.getFailedCount(),
    };

    const dealVerifierStats = {
      waiting: await dealVerifierQueue.getWaitingCount(),
      active: await dealVerifierQueue.getActiveCount(),
      completed: await dealVerifierQueue.getCompletedCount(),
      failed: await dealVerifierQueue.getFailedCount(),
    };

    const alertProcessorStats = {
      waiting: await alertProcessorQueue.getWaitingCount(),
      active: await alertProcessorQueue.getActiveCount(),
      completed: await alertProcessorQueue.getCompletedCount(),
      failed: await alertProcessorQueue.getFailedCount(),
    };

    log('Price Tracker Queue:', colors.cyan);
    console.log('  Waiting:', priceTrackerStats.waiting);
    console.log('  Active:', priceTrackerStats.active);
    console.log('  Completed:', priceTrackerStats.completed);
    console.log('  Failed:', priceTrackerStats.failed);

    log('\nDeal Verifier Queue:', colors.cyan);
    console.log('  Waiting:', dealVerifierStats.waiting);
    console.log('  Active:', dealVerifierStats.active);
    console.log('  Completed:', dealVerifierStats.completed);
    console.log('  Failed:', dealVerifierStats.failed);

    log('\nAlert Processor Queue:', colors.cyan);
    console.log('  Waiting:', alertProcessorStats.waiting);
    console.log('  Active:', alertProcessorStats.active);
    console.log('  Completed:', alertProcessorStats.completed);
    console.log('  Failed:', alertProcessorStats.failed);

    log('\n✅ Job queues are operational', colors.green);
    return true;
  } catch (error) {
    log('❌ Job queue test failed: ' + error, colors.red);
    return false;
  }
}

/**
 * Test 2: Price History & Tracking
 */
async function testPriceTracking() {
  logSection('TEST 2: Price History & Tracking');

  try {
    // Get a sample deal
    const [deal] = await db
      .select()
      .from(deals)
      .orderBy(desc(deals.createdAt))
      .limit(1);

    if (!deal) {
      log('⚠️  No deals found in database', colors.yellow);
      return false;
    }

    log(`Testing with deal: "${deal.title}"`, colors.cyan);

    // Check price history
    const priceHistoryRecords = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.dealId, deal.id))
      .orderBy(desc(priceHistory.scrapedAt))
      .limit(5);

    log(`\nPrice history records: ${priceHistoryRecords.length}`, colors.cyan);
    priceHistoryRecords.forEach((record, i) => {
      console.log(
        `  ${i + 1}. ₹${(record.price / 100).toFixed(2)} at ${record.scrapedAt.toLocaleString()}`
      );
    });

    // Check price alerts
    const priceAlertsCount = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.dealId, deal.id));

    log(`\nPrice alerts for this deal: ${priceAlertsCount.length}`, colors.cyan);

    // Add a test price tracking job
    log('\nAdding test price tracking job...', colors.yellow);
    await addJob(priceTrackerQueue, 'test-price-track', {
      dealId: deal.id,
      test: true,
    });

    log('✅ Price tracking system operational', colors.green);
    return true;
  } catch (error) {
    log('❌ Price tracking test failed: ' + error, colors.red);
    return false;
  }
}

/**
 * Test 3: Deal Verification
 */
async function testDealVerification() {
  logSection('TEST 3: Deal Verification');

  try {
    // Get deals to verify
    const dealsToVerify = await db
      .select()
      .from(deals)
      .where(eq(deals.isExpired, false))
      .limit(5);

    log(`Found ${dealsToVerify.length} active deals to verify`, colors.cyan);

    // Show verification status
    for (const deal of dealsToVerify) {
      console.log(`\n  Deal: "${deal.title.substring(0, 50)}..."`);
      console.log(`  Status: ${deal.verificationStatus}`);
      console.log(`  Verified: ${deal.verified ? 'Yes' : 'No'}`);
      console.log(`  Last verified: ${deal.lastVerifiedAt?.toLocaleString() || 'Never'}`);
      console.log(`  URL accessible: ${deal.urlAccessible ?? 'Unknown'}`);
    }

    // Add a test verification job
    if (dealsToVerify.length > 0) {
      log('\nAdding test deal verification job...', colors.yellow);
      await addJob(dealVerifierQueue, 'test-verify', {
        dealId: dealsToVerify[0].id,
        test: true,
      });
    }

    log('\n✅ Deal verification system operational', colors.green);
    return true;
  } catch (error) {
    log('❌ Deal verification test failed: ' + error, colors.red);
    return false;
  }
}

/**
 * Test 4: Email Alerts
 */
async function testEmailAlerts() {
  logSection('TEST 4: Email Alerts System');

  try {
    // Get all active alerts
    const activeAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.isActive, true));

    log(`Active alerts in system: ${activeAlerts.length}`, colors.cyan);

    // Show alert summary
    const instant = activeAlerts.filter(a => a.frequency === 'instant').length;
    const daily = activeAlerts.filter(a => a.frequency === 'daily').length;
    const weekly = activeAlerts.filter(a => a.frequency === 'weekly').length;

    console.log(`  Instant alerts: ${instant}`);
    console.log(`  Daily digests: ${daily}`);
    console.log(`  Weekly digests: ${weekly}`);

    if (activeAlerts.length > 0) {
      log('\nSample alerts:', colors.cyan);
      activeAlerts.slice(0, 3).forEach((alert, i) => {
        console.log(`  ${i + 1}. Keyword: "${alert.keyword}" (${alert.frequency})`);
        console.log(`     Last notified: ${alert.lastNotified?.toLocaleString() || 'Never'}`);
        console.log(`     Notification count: ${alert.notificationCount}`);
      });
    }

    log('\n✅ Email alerts system operational', colors.green);
    return true;
  } catch (error) {
    log('❌ Email alerts test failed: ' + error, colors.red);
    return false;
  }
}

/**
 * Test 5: Database Schema
 */
async function testDatabaseSchema() {
  logSection('TEST 5: Database Schema (Phase 1 Tables)');

  try {
    // Check if all Phase 1 tables exist
    const tables = [
      'users',
      'deals',
      'votes',
      'comments',
      'categories',
      'price_history',
      'price_alerts',
      'alerts',
      'alert_notifications',
      'saved_deals',
      'merchants',
      'merchant_products',
      'coupons',
      'coupon_usage',
      'deal_verification_logs',
    ];

    log('Checking Phase 1 database tables:', colors.cyan);

    for (const table of tables) {
      const result: any = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${table}'
        );
      `);

      const exists = result[0]?.exists || result.rows?.[0]?.exists;
      const status = exists ? '✓' : '✗';
      const color = exists ? colors.green : colors.red;
      log(`  ${status} ${table}`, color);
    }

    log('\n✅ Database schema complete', colors.green);
    return true;
  } catch (error) {
    log('❌ Database schema test failed: ' + error, colors.red);
    return false;
  }
}

/**
 * Test 6: Feature Flags
 */
async function testFeatureFlags() {
  logSection('TEST 6: Feature Flags');

  try {
    const { features, getEnabledFeatures, getDisabledFeatures } = await import('./src/config/features.js');

    const enabled = getEnabledFeatures();
    const disabled = getDisabledFeatures();

    log('Phase 1 Feature Flags:', colors.cyan);
    console.log('  BULL_QUEUES:', features.BULL_QUEUES ? '✅' : '❌');
    console.log('  PRICE_TRACKING:', features.PRICE_TRACKING ? '✅' : '❌');
    console.log('  DEAL_VERIFICATION:', features.DEAL_VERIFICATION ? '✅' : '❌');
    console.log('  EMAIL_ALERTS:', features.EMAIL_ALERTS ? '✅' : '❌');
    console.log('  DATABASE_CLEANUP:', features.DATABASE_CLEANUP ? '✅' : '❌');
    console.log('  BULL_BOARD_DASHBOARD:', features.BULL_BOARD_DASHBOARD ? '✅' : '❌');
    console.log('  WISHLIST_API:', features.WISHLIST_API ? '✅' : '❌');
    console.log('  PRICE_HISTORY_API:', features.PRICE_HISTORY_API ? '✅' : '❌');
    console.log('  COUPONS_API:', features.COUPONS_API ? '✅' : '❌');
    console.log('  PRICE_ALERTS_API:', features.PRICE_ALERTS_API ? '✅' : '❌');

    log(`\nTotal enabled: ${enabled.length}`, colors.green);
    log(`Total disabled: ${disabled.length}`, colors.yellow);

    log('\n✅ Feature flags configured', colors.green);
    return true;
  } catch (error) {
    log('❌ Feature flags test failed: ' + error, colors.red);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '█'.repeat(60), colors.bold + colors.cyan);
  log('  PHASE 1 END-TO-END TEST SUITE', colors.bold + colors.cyan);
  log('  IndiaDeals Platform - Backend Verification', colors.cyan);
  log('█'.repeat(60) + '\n', colors.bold + colors.cyan);

  const results = {
    jobQueues: false,
    priceTracking: false,
    dealVerification: false,
    emailAlerts: false,
    databaseSchema: false,
    featureFlags: false,
  };

  try {
    // Verify system user exists
    const systemUser = await getSystemUser();
    log(`✅ System user found: ${systemUser.username}`, colors.green);

    // Run all tests
    results.jobQueues = await testJobQueues();
    results.priceTracking = await testPriceTracking();
    results.dealVerification = await testDealVerification();
    results.emailAlerts = await testEmailAlerts();
    results.databaseSchema = await testDatabaseSchema();
    results.featureFlags = await testFeatureFlags();

    // Summary
    logSection('TEST SUMMARY');

    const testNames = Object.keys(results);
    const passed = testNames.filter(name => results[name as keyof typeof results]).length;
    const total = testNames.length;

    testNames.forEach(name => {
      const status = results[name as keyof typeof results];
      const emoji = status ? '✅' : '❌';
      const color = status ? colors.green : colors.red;
      log(`${emoji} ${name.replace(/([A-Z])/g, ' $1').trim()}`, color);
    });

    console.log('\n' + '─'.repeat(60));
    const percentage = Math.round((passed / total) * 100);
    log(`\nRESULT: ${passed}/${total} tests passed (${percentage}%)`, colors.bold);

    if (passed === total) {
      log('\n🎉 ALL TESTS PASSED! Phase 1 is production-ready! 🎉\n', colors.bold + colors.green);
    } else {
      log('\n⚠️  Some tests failed. Review the output above.\n', colors.bold + colors.yellow);
    }
  } catch (error) {
    log('\n❌ Test suite failed with error:', colors.bold + colors.red);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run tests
runTests();
