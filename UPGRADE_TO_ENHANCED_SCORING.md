# Upgrade to Enhanced Scoring System

## Overview

This guide will help you migrate from the basic scoring system to the advanced India-ready scoring algorithm with trust scores, price tracking, and anti-gaming protections.

## What's New

### Enhanced Features
- ✅ User trust scoring (0-100)
- ✅ Vote weighting based on user reputation
- ✅ Price truth tracking (90-day history)
- ✅ Burst vote detection
- ✅ Weighted vote calculations
- ✅ Frontpage qualification gates
- ✅ Upvote velocity tracking
- ✅ Anti-gaming flags

## Migration Steps

### Option 1: Fresh Start (Recommended for Development)

If you're okay with resetting your database:

```bash
cd backend

# Drop existing database
dropdb deals_db

# Create fresh database
createdb deals_db

# Update schema file
mv src/db/schema.ts src/db/schema.backup.ts
mv src/db/schema.enhanced.ts src/db/schema.ts

# Generate and run new migrations
npm run db:generate
npm run db:migrate

# Seed with sample data
DATABASE_URL="postgres://venkatarishikraavi@localhost:5432/deals_db" npx tsx src/seed.ts
```

### Option 2: Migration Without Data Loss

If you want to keep existing data:

#### Step 1: Backup Current Data

```bash
cd backend

# Backup database
pg_dump deals_db > backup_$(date +%Y%m%d).sql

# Or export specific tables
psql deals_db -c "COPY users TO '/tmp/users_backup.csv' CSV HEADER"
psql deals_db -c "COPY deals TO '/tmp/deals_backup.csv' CSV HEADER"
psql deals_db -c "COPY votes TO '/tmp/votes_backup.csv' CSV HEADER"
```

#### Step 2: Add New Columns to Existing Tables

Create a migration file: `backend/migrations/add_scoring_columns.sql`

```sql
-- Add enhanced fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 20 NOT NULL,
ADD COLUMN IF NOT EXISTS deals_posted INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS votes_given INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS accurate_deals_count INTEGER DEFAULT 0 NOT NULL;

-- Create index on trust_score
CREATE INDEX IF NOT EXISTS trust_score_idx ON users(trust_score);

-- Add enhanced scoring fields to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS weighted_upvotes REAL DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS weighted_downvotes REAL DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS deal_score REAL DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS frontpage_score REAL DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS price_truth_status VARCHAR(20) DEFAULT 'normal' NOT NULL,
ADD COLUMN IF NOT EXISTS price_truth_bonus INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS lowest_price_90d INTEGER,
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS burst_vote_detected BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS upvote_velocity INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_velocity_update TIMESTAMP DEFAULT NOW();

-- Create new indexes
CREATE INDEX IF NOT EXISTS deals_score_idx ON deals(deal_score DESC);
CREATE INDEX IF NOT EXISTS deals_frontpage_score_idx ON deals(frontpage_score DESC);

-- Add vote weight tracking to votes table
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS vote_weight REAL DEFAULT 1.0 NOT NULL,
ADD COLUMN IF NOT EXISTS user_trust_at_vote INTEGER DEFAULT 20 NOT NULL;

-- Create index for vote analysis
CREATE INDEX IF NOT EXISTS votes_deal_created_idx ON votes(deal_id, created_at);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,
  merchant VARCHAR(100) NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS price_history_deal_id_idx ON price_history(deal_id);
CREATE INDEX IF NOT EXISTS price_history_recorded_at_idx ON price_history(recorded_at);
```

#### Step 3: Run the Migration

```bash
cd backend
psql deals_db < migrations/add_scoring_columns.sql
```

#### Step 4: Backfill Data

Create `backend/src/scripts/backfill_scoring.ts`:

```typescript
import { db, users, deals, votes } from '../db/index.js';
import { ScoringAlgorithm } from '../utils/scoring.js';
import { eq } from 'drizzle-orm';

async function backfillUserTrustScores() {
  console.log('Backfilling user trust scores...');

  const allUsers = await db.query.users.findMany();

  for (const user of allUsers) {
    const accountAgeDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const userDeals = await db.query.deals.findMany({
      where: eq(deals.userId, user.id),
    });

    const userVotes = await db.query.votes.findMany({
      where: eq(votes.userId, user.id),
    });

    const trustProfile = {
      trustScore: user.trustScore || 20,
      dealsPosted: userDeals.length,
      votesGiven: userVotes.length,
      accurateDealsCount: userDeals.filter(d => d.upvotes > 20).length,
      accountAgeDays,
    };

    const newTrustScore = ScoringAlgorithm.calculateUserTrustScore(trustProfile);

    await db.update(users)
      .set({
        trustScore: newTrustScore,
        dealsPosted: userDeals.length,
        votesGiven: userVotes.length,
      })
      .where(eq(users.id, user.id));
  }

  console.log(`✅ Updated ${allUsers.length} users`);
}

async function backfillDealScores() {
  console.log('Backfilling deal scores...');

  const allDeals = await db.query.deals.findMany({
    with: {
      user: true,
      votes: {
        with: {
          user: true,
        },
      },
    },
  });

  for (const deal of allDeals) {
    // Calculate weighted votes
    const weightedVotes = ScoringAlgorithm.calculateWeightedVotes(
      deal.votes.map(v => ({
        voteType: v.voteType,
        voteWeight: v.voteWeight || 1.0,
      }))
    );

    // Calculate deal score
    const dealData = {
      upvotes: deal.upvotes,
      downvotes: deal.downvotes,
      weightedUpvotes: weightedVotes.weightedUpvotes,
      weightedDownvotes: weightedVotes.weightedDownvotes,
      posterTrustScore: deal.user.trustScore || 20,
      priceTruthStatus: deal.priceTruthStatus || 'normal',
      createdAt: deal.createdAt,
      upvoteVelocity: 0,
      burstVoteDetected: false,
    };

    const dealScore = ScoringAlgorithm.calculateDealScore(dealData);
    const frontpageScore = ScoringAlgorithm.calculateFrontpageScore(dealData);

    await db.update(deals)
      .set({
        weightedUpvotes: weightedVotes.weightedUpvotes,
        weightedDownvotes: weightedVotes.weightedDownvotes,
        dealScore,
        frontpageScore,
      })
      .where(eq(deals.id, deal.id));
  }

  console.log(`✅ Updated ${allDeals.length} deals`);
}

async function main() {
  console.log('🚀 Starting backfill...');

  await backfillUserTrustScores();
  await backfillDealScores();

  console.log('✨ Backfill complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
```

Run backfill:
```bash
DATABASE_URL="postgres://venkatarishikraavi@localhost:5432/deals_db" npx tsx src/scripts/backfill_scoring.ts
```

#### Step 5: Update Schema File

```bash
cd backend/src/db
mv schema.ts schema.backup.ts
mv schema.enhanced.ts schema.ts
```

## Verification

After migration, verify everything works:

```bash
# Check tables
psql deals_db -c "\d users"
psql deals_db -c "\d deals"
psql deals_db -c "\d votes"
psql deals_db -c "\d price_history"

# Check sample data
psql deals_db -c "SELECT id, username, trust_score FROM users LIMIT 5"
psql deals_db -c "SELECT id, title, deal_score, frontpage_score FROM deals LIMIT 5"

# Restart servers
cd backend && npm run dev
```

## Testing the New Scoring

### 1. Test User Trust Score
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should see `trustScore` field.

### 2. Test Weighted Voting
```bash
# Login as high-trust user
# Vote on a deal
# Check that vote weight is > 1.0
```

### 3. Test Frontpage Gates
```bash
curl http://localhost:3001/api/deals?tab=frontpage
```

Should only show deals with score ≥ 120.

## Rollback (If Needed)

```bash
# Restore from backup
psql deals_db < backup_YYYYMMDD.sql

# Or restore schema
cd backend/src/db
mv schema.backup.ts schema.ts
npm run db:generate
npm run db:migrate
```

## Performance Optimization

After migration, optimize queries:

```sql
-- Analyze tables for query planner
ANALYZE users;
ANALYZE deals;
ANALYZE votes;
ANALYZE price_history;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

## Next Steps

1. **Monitor Performance**
   - Watch query times in logs
   - Check index usage: `EXPLAIN ANALYZE SELECT ...`

2. **Fine-tune Parameters**
   - Adjust frontpage gates based on traffic
   - Tweak vote weights if needed

3. **Enable Advanced Features**
   - Set up price tracking cron job
   - Implement burst vote detection webhook
   - Add real-time score updates

## Support

If you encounter issues:

1. Check logs: `tail -f backend/logs/error.log`
2. Verify migrations: `psql deals_db -c "\dt"`
3. Test API: `curl http://localhost:3001/health`

---

**Your scoring system is now production-ready for the India market!** 🇮🇳🚀
