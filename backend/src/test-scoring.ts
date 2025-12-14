import { ScoringAlgorithm } from './utils/scoring.js';

console.log('🧪 Testing Scoring Algorithm\n');
console.log('='.repeat(60));

// ============================================================================
// Test 1: Vote Weight Calculation
// ============================================================================
console.log('\n📊 Test 1: Vote Weight Calculation\n');

const newUser = {
  trustScore: 20,
  dealsPosted: 1,
  votesGiven: 5,
  accurateDealsCount: 0,
  accountAgeDays: 3,
};

const regularUser = {
  trustScore: 55,
  dealsPosted: 15,
  votesGiven: 80,
  accurateDealsCount: 12,
  accountAgeDays: 45,
};

const powerUser = {
  trustScore: 85,
  dealsPosted: 50,
  votesGiven: 300,
  accurateDealsCount: 45,
  accountAgeDays: 180,
};

console.log('New User (3 days old, trust 20):');
console.log(`  Vote Weight: ${ScoringAlgorithm.calculateVoteWeight(newUser).toFixed(2)}x`);

console.log('\nRegular User (45 days old, trust 55):');
console.log(`  Vote Weight: ${ScoringAlgorithm.calculateVoteWeight(regularUser).toFixed(2)}x`);

console.log('\nPower User (180 days old, trust 85):');
console.log(`  Vote Weight: ${ScoringAlgorithm.calculateVoteWeight(powerUser).toFixed(2)}x`);

// ============================================================================
// Test 2: Deal Score Calculation
// ============================================================================
console.log('\n\n📈 Test 2: Deal Score Calculation\n');

const goodDeal = {
  upvotes: 80,
  downvotes: 6,
  weightedUpvotes: 120,
  weightedDownvotes: 10,
  posterTrustScore: 70,
  priceTruthStatus: 'lowest_90d' as const,
  createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  upvoteVelocity: 15,
  burstVoteDetected: false,
};

const spamDeal = {
  upvotes: 100,
  downvotes: 50,
  weightedUpvotes: 110, // Low weight votes
  weightedDownvotes: 60,
  posterTrustScore: 15,
  priceTruthStatus: 'inflated' as const,
  createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
  upvoteVelocity: 2,
  burstVoteDetected: true,
};

console.log('Good Deal (iQOO Phone @ ₹18,999):');
console.log(`  Raw Votes: ${goodDeal.upvotes}👍 ${goodDeal.downvotes}👎`);
console.log(`  Weighted: ${goodDeal.weightedUpvotes.toFixed(1)}👍 ${goodDeal.weightedDownvotes.toFixed(1)}👎`);
console.log(`  Poster Trust: ${goodDeal.posterTrustScore}`);
console.log(`  Price Status: ${goodDeal.priceTruthStatus}`);
console.log(`  Deal Score: ${ScoringAlgorithm.calculateDealScore(goodDeal).toFixed(1)}`);
console.log(`  Frontpage Score: ${ScoringAlgorithm.calculateFrontpageScore(goodDeal).toFixed(1)}`);
console.log(`  Qualifies for Frontpage: ${ScoringAlgorithm.qualifiesForFrontpage(goodDeal) ? '✅ YES' : '❌ NO'}`);

console.log('\nSpam Deal (Fake discount):');
console.log(`  Raw Votes: ${spamDeal.upvotes}👍 ${spamDeal.downvotes}👎`);
console.log(`  Weighted: ${spamDeal.weightedUpvotes.toFixed(1)}👍 ${spamDeal.weightedDownvotes.toFixed(1)}👎`);
console.log(`  Poster Trust: ${spamDeal.posterTrustScore}`);
console.log(`  Price Status: ${spamDeal.priceTruthStatus} (FAKE MRP!)`);
console.log(`  Deal Score: ${ScoringAlgorithm.calculateDealScore(spamDeal).toFixed(1)}`);
console.log(`  Frontpage Score: ${ScoringAlgorithm.calculateFrontpageScore(spamDeal).toFixed(1)}`);
console.log(`  Qualifies for Frontpage: ${ScoringAlgorithm.qualifiesForFrontpage(spamDeal) ? '✅ YES' : '❌ NO'}`);

// ============================================================================
// Test 3: Time Decay
// ============================================================================
console.log('\n\n⏰ Test 3: Time Decay Over Time\n');

const ages = [1, 6, 12, 24, 48];
ages.forEach(hours => {
  const date = new Date(Date.now() - hours * 60 * 60 * 1000);
  const decay = ScoringAlgorithm.calculateTimeDecay(date);
  console.log(`  ${hours.toString().padStart(2)}h old: -${decay.toFixed(1)} points`);
});

// ============================================================================
// Test 4: Price Truth Impact
// ============================================================================
console.log('\n\n💰 Test 4: Price Truth Impact\n');

const priceStatuses = [
  { status: 'lowest_90d', label: 'Lowest in 90 days' },
  { status: 'below_avg', label: 'Below 30-day avg' },
  { status: 'normal', label: 'Normal pricing' },
  { status: 'inflated', label: 'Inflated (FAKE!)' },
];

priceStatuses.forEach(({ status, label }) => {
  const bonus = ScoringAlgorithm.calculatePriceTruthBonus(status);
  const sign = bonus > 0 ? '+' : '';
  console.log(`  ${label.padEnd(25)} ${sign}${bonus} points`);
});

// ============================================================================
// Test 5: User Trust Score Progression
// ============================================================================
console.log('\n\n👤 Test 5: User Trust Score Progression\n');

const userProgression = [
  { days: 1, deals: 0, votes: 0, accurate: 0, label: 'Day 1 (New)' },
  { days: 7, deals: 3, votes: 20, accurate: 2, label: 'Week 1' },
  { days: 30, deals: 10, votes: 100, accurate: 8, label: 'Month 1' },
  { days: 90, deals: 30, votes: 300, accurate: 25, label: 'Month 3' },
  { days: 180, deals: 50, votes: 500, accurate: 45, label: 'Month 6 (Power User)' },
];

userProgression.forEach(({ days, deals, votes, accurate, label }) => {
  const profile = {
    trustScore: 0, // Will be calculated
    dealsPosted: deals,
    votesGiven: votes,
    accurateDealsCount: accurate,
    accountAgeDays: days,
  };
  const trust = ScoringAlgorithm.calculateUserTrustScore(profile);
  const weight = ScoringAlgorithm.calculateVoteWeight({ ...profile, trustScore: trust });
  console.log(`  ${label.padEnd(25)} Trust: ${trust}/100, Vote Weight: ${weight.toFixed(2)}x`);
});

// ============================================================================
// Test 6: Burst Vote Detection
// ============================================================================
console.log('\n\n🚨 Test 6: Burst Vote Detection\n');

// Normal voting pattern
const normalVotes = Array.from({ length: 30 }, (_, i) => ({
  timestamp: new Date(Date.now() - i * 10 * 60 * 1000), // 10 min apart
  userId: `user-${i}`,
  userAccountAge: 30,
  userTrustScore: 50,
}));

// Burst voting pattern (Telegram spam)
const burstVotes = Array.from({ length: 50 }, (_, i) => ({
  timestamp: new Date(Date.now() - i * 5 * 1000), // 5 sec apart
  userId: `spammer-${i}`,
  userAccountAge: 2, // New accounts
  userTrustScore: 15,
}));

console.log('Normal voting (30 votes over 5 hours):');
console.log(`  Burst Detected: ${ScoringAlgorithm.detectBurstVoting(normalVotes) ? '⚠️  YES' : '✅ NO'}`);

console.log('\nTelegram spam (50 votes in 4 minutes):');
console.log(`  Burst Detected: ${ScoringAlgorithm.detectBurstVoting(burstVotes) ? '⚠️  YES' : '✅ NO'}`);

// ============================================================================
// Test 7: Tab Classification
// ============================================================================
console.log('\n\n📂 Test 7: Tab Classification\n');

const testDeals = [
  { ...goodDeal, label: 'Good Deal (iQOO)' },
  { ...spamDeal, label: 'Spam Deal' },
  {
    upvotes: 30,
    downvotes: 5,
    weightedUpvotes: 45,
    weightedDownvotes: 7,
    posterTrustScore: 50,
    priceTruthStatus: 'normal' as const,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    upvoteVelocity: 8,
    burstVoteDetected: false,
    label: 'Popular Deal',
  },
  {
    upvotes: 5,
    downvotes: 2,
    weightedUpvotes: 6,
    weightedDownvotes: 2.5,
    posterTrustScore: 30,
    priceTruthStatus: 'normal' as const,
    createdAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000),
    upvoteVelocity: 2,
    burstVoteDetected: false,
    label: 'New Deal',
  },
];

testDeals.forEach(deal => {
  const tab = ScoringAlgorithm.classifyDealTab(deal);
  const score = ScoringAlgorithm.calculateDealScore(deal).toFixed(1);
  console.log(`  ${deal.label.padEnd(25)} → ${tab.padEnd(10)} (Score: ${score})`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ All tests complete!\n');
