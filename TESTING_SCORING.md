# 🧪 Testing the Scoring Algorithm

## Quick Start Testing (Without Migration)

You can test the scoring algorithm **right now** without migrating your database! The scoring functions work independently.

---

## Method 1: Interactive Node.js Test (Easiest)

### Step 1: Create a Test Script

Create `backend/src/test-scoring.ts`:

```typescript
import { ScoringAlgorithm } from './utils/scoring.js';

console.log('🧪 Testing Scoring Algorithm\n');
console.log('=' .repeat(60));

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
```

### Step 2: Run the Test

```bash
cd backend
npx tsx src/test-scoring.ts
```

You'll see output like:

```
🧪 Testing Scoring Algorithm

============================================================

📊 Test 1: Vote Weight Calculation

New User (3 days old, trust 20):
  Vote Weight: 0.60x

Regular User (45 days old, trust 55):
  Vote Weight: 1.55x

Power User (180 days old, trust 85):
  Vote Weight: 1.85x

📈 Test 2: Deal Score Calculation

Good Deal (iQOO Phone @ ₹18,999):
  Raw Votes: 80👍 6👎
  Weighted: 120.0👍 10.0👎
  Poster Trust: 70
  Price Status: lowest_90d
  Deal Score: 155.0
  Frontpage Score: 149.0
  Qualifies for Frontpage: ✅ YES

Spam Deal (Fake discount):
  Raw Votes: 100👍 50👎
  Weighted: 110.0👍 60.0👎
  Poster Trust: 15
  Price Status: inflated (FAKE MRP!)
  Deal Score: 0.0
  Frontpage Score: 0.0
  Qualifies for Frontpage: ❌ NO
```

---

## Method 2: Unit Tests with Jest (Recommended for CI/CD)

### Step 1: Install Jest

```bash
cd backend
npm install --save-dev jest ts-jest @types/jest
```

### Step 2: Configure Jest

Create `backend/jest.config.js`:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
};
```

### Step 3: Create Test File

Create `backend/src/utils/scoring.test.ts`:

```typescript
import { ScoringAlgorithm } from './scoring';

describe('Scoring Algorithm', () => {
  describe('calculateVoteWeight', () => {
    it('should give low weight to new users', () => {
      const newUser = {
        trustScore: 20,
        dealsPosted: 0,
        votesGiven: 0,
        accurateDealsCount: 0,
        accountAgeDays: 3,
      };

      const weight = ScoringAlgorithm.calculateVoteWeight(newUser);
      expect(weight).toBeCloseTo(0.6, 1); // 0.5 penalty for < 7 days
    });

    it('should give high weight to power users', () => {
      const powerUser = {
        trustScore: 85,
        dealsPosted: 50,
        votesGiven: 300,
        accurateDealsCount: 45,
        accountAgeDays: 180,
      };

      const weight = ScoringAlgorithm.calculateVoteWeight(powerUser);
      expect(weight).toBeCloseTo(1.85, 2);
    });

    it('should cap vote weight at 2.0', () => {
      const eliteUser = {
        trustScore: 100,
        dealsPosted: 100,
        votesGiven: 1000,
        accurateDealsCount: 95,
        accountAgeDays: 365,
      };

      const weight = ScoringAlgorithm.calculateVoteWeight(eliteUser);
      expect(weight).toBeLessThanOrEqual(2.0);
    });
  });

  describe('calculatePriceTruthBonus', () => {
    it('should give +40 for lowest in 90 days', () => {
      expect(ScoringAlgorithm.calculatePriceTruthBonus('lowest_90d')).toBe(40);
    });

    it('should give -50 for inflated prices', () => {
      expect(ScoringAlgorithm.calculatePriceTruthBonus('inflated')).toBe(-50);
    });
  });

  describe('qualifiesForFrontpage', () => {
    const baseDeal = {
      upvotes: 50,
      downvotes: 3,
      weightedUpvotes: 75,
      weightedDownvotes: 4,
      posterTrustScore: 60,
      priceTruthStatus: 'normal' as const,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      upvoteVelocity: 10,
      burstVoteDetected: false,
    };

    it('should qualify good deals', () => {
      const goodDeal = {
        ...baseDeal,
        weightedUpvotes: 150,
        posterTrustScore: 70,
        priceTruthStatus: 'lowest_90d' as const,
      };

      expect(ScoringAlgorithm.qualifiesForFrontpage(goodDeal)).toBe(true);
    });

    it('should reject inflated deals', () => {
      const badDeal = {
        ...baseDeal,
        priceTruthStatus: 'inflated' as const,
      };

      expect(ScoringAlgorithm.qualifiesForFrontpage(badDeal)).toBe(false);
    });

    it('should reject low upvote deals', () => {
      const lowVotes = {
        ...baseDeal,
        upvotes: 15, // Below 30 minimum
      };

      expect(ScoringAlgorithm.qualifiesForFrontpage(lowVotes)).toBe(false);
    });
  });

  describe('detectBurstVoting', () => {
    it('should detect burst voting patterns', () => {
      const burstVotes = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 5 * 1000),
        userId: `user-${i}`,
        userAccountAge: 2,
        userTrustScore: 15,
      }));

      expect(ScoringAlgorithm.detectBurstVoting(burstVotes)).toBe(true);
    });

    it('should not flag normal voting', () => {
      const normalVotes = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 10 * 60 * 1000),
        userId: `user-${i}`,
        userAccountAge: 30,
        userTrustScore: 50,
      }));

      expect(ScoringAlgorithm.detectBurstVoting(normalVotes)).toBe(false);
    });
  });
});
```

### Step 4: Run Tests

```bash
cd backend
npm test
```

---

## Method 3: API Testing with cURL (Integration Test)

### Step 1: Start Your Servers

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### Step 2: Create Test Deals via API

```bash
# Login first
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@deals.com",
    "password": "password123"
  }' | jq '.'

# Save the token
TOKEN="your-token-here"

# Create a test deal
curl -X POST http://localhost:3001/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Deal - iPhone 15",
    "price": 69999,
    "originalPrice": 89999,
    "merchant": "Amazon",
    "url": "https://amazon.in",
    "description": "Testing scoring algorithm"
  }' | jq '.'
```

### Step 3: Vote on the Deal

```bash
DEAL_ID="deal-id-from-response"

# Upvote
curl -X POST http://localhost:3001/api/deals/$DEAL_ID/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"voteType": 1}' | jq '.'

# Check score
curl http://localhost:3001/api/deals/$DEAL_ID | jq '.score'
```

---

## Method 4: Browser DevTools Testing

### Step 1: Open your app at http://localhost:5173

### Step 2: Open DevTools Console (F12)

### Step 3: Test via Console

```javascript
// Get deal data
const deal = {
  upvotes: 80,
  downvotes: 6,
  weightedUpvotes: 120,
  weightedDownvotes: 10,
  posterTrustScore: 70,
  priceTruthStatus: 'lowest_90d',
  createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  upvoteVelocity: 15,
  burstVoteDetected: false
};

// Calculate score (you'd need to import the scoring module)
console.log('Deal Score:', calculateDealScore(deal));
```

---

## Method 5: Postman/Insomnia Collection

### Create a collection with these requests:

**1. Login**
```
POST http://localhost:3001/api/auth/login
Body: {
  "email": "demo@deals.com",
  "password": "password123"
}
```

**2. Get Deals (Frontpage)**
```
GET http://localhost:3001/api/deals?tab=frontpage
```

**3. Create Deal**
```
POST http://localhost:3001/api/deals
Headers: Authorization: Bearer {{token}}
Body: { "title": "...", "price": 1000, ... }
```

**4. Vote**
```
POST http://localhost:3001/api/deals/:id/vote
Headers: Authorization: Bearer {{token}}
Body: { "voteType": 1 }
```

---

## Quick Verification Checklist

After running any test method, verify:

✅ **Vote Weights:**
- New users (< 7 days) get 0.5x-0.6x weight
- Regular users get 1.4x-1.6x weight
- Power users get 1.8x-2.0x weight

✅ **Price Truth:**
- Lowest in 90d deals get +40 bonus
- Inflated deals get -50 penalty

✅ **Frontpage Gates:**
- Only deals with score ≥120 qualify
- Must have ≥30 upvotes
- Must have ≥85% upvote ratio

✅ **Time Decay:**
- 6-hour old deal loses ~16 points
- 24-hour old deal loses ~76 points

✅ **Burst Detection:**
- >40 votes in 5min from new accounts triggers flag

---

## Expected Results

**Good Deal Example:**
```
Title: "iPhone 15 Pro @ ₹69,999 (Best Price!)"
Upvotes: 120, Downvotes: 8
Poster Trust: 75
Price Status: lowest_90d
Age: 4 hours

Expected:
  ✅ Deal Score: ~180
  ✅ Qualifies for Frontpage
  ✅ Tab: "Frontpage"
```

**Spam Deal Example:**
```
Title: "iPhone 15 @ ₹1 lakh (70% OFF!!!)"
Upvotes: 50, Downvotes: 40
Poster Trust: 15
Price Status: inflated
Age: 12 hours

Expected:
  ❌ Deal Score: < 50
  ❌ Does NOT qualify for Frontpage
  ❌ Tab: "New"
```

---

## Troubleshooting

**Issue: Tests fail to import scoring module**
```bash
# Make sure you're in backend directory
cd backend

# Check file exists
ls src/utils/scoring.ts
```

**Issue: TypeScript errors**
```bash
# Rebuild
npm run build
```

**Issue: Can't test via API**
```bash
# Check servers are running
curl http://localhost:3001/health
curl http://localhost:5173
```

---

## Next Steps

1. **Run Method 1** first (Interactive test) - Easiest to see results
2. **Add Method 2** (Jest tests) for automated testing
3. **Use Method 3** (API tests) to verify integration
4. **Create Postman collection** for ongoing testing

---

**Start with the interactive test - it's the easiest way to see the algorithm in action!** 🚀

```bash
cd backend
npx tsx src/test-scoring.ts
```
