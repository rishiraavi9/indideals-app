# 🎯 Scoring Algorithm - Quick Reference Card

## Core Formula

```
DealScore = WeightedUpvotes - WeightedDownvotes + TrustBoost + PriceTruth - TimeDecay
```

---

## Vote Weights

| Trust Score | Vote Weight | User Level |
|-------------|-------------|------------|
| 0-20 | 1.0-1.2 | New |
| 40-60 | 1.4-1.6 | Regular |
| 80-100 | 1.8-2.0 | Power User ⭐ |

**Downvote multiplier:** 1.2x

---

## Trust Boost

```
TrustBoost = PosterTrustScore × 0.3
```

| Poster Trust | Boost |
|--------------|-------|
| 20 | +6 |
| 50 | +15 |
| 80 | +24 |
| 100 | +30 |

---

## Price Truth Bonus

| Status | Bonus | Meaning |
|--------|-------|---------|
| `lowest_90d` | **+40** | Lowest price in 90 days |
| `below_avg` | **+20** | Below 30-day average |
| `normal` | **0** | Normal pricing |
| `inflated` | **−50** | Fake discount ❌ |

---

## Time Decay

```
TimeDecay = (Hours ^ 1.2) × 2
```

| Age | Decay |
|-----|-------|
| 1h | -2 |
| 6h | -16 |
| 12h | -37 |
| 24h | -76 |

---

## Frontpage Gates

Must pass **ALL** of these:

✅ Score ≥ **120**
✅ Upvotes ≥ **30**
✅ Ratio ≥ **85%**
✅ Poster Trust ≥ **40**
✅ Not Inflated

---

## Frontpage Ranking

```
FrontpageScore = DealScore + (Velocity × 5) - (Age × 1.5)
```

**Velocity** = Upvotes in last 30 min

---

## User Trust Calculation

```
Trust = 20 (base)
  + AccountAge (max +20)
  + Deals Posted (max +25)
  + Votes Given (max +15)
  + Accuracy (max +20)
```

**Max:** 100

---

## Anti-Gaming

### Burst Detection
- **Trigger:** >40 votes in <5 min from new accounts
- **Action:** Freeze + Flag + Weight × 0.5

### New Account Penalty
- **< 7 days:** Vote weight × 0.5

---

## Tab Classification

| Tab | Criteria |
|-----|----------|
| **Frontpage** | Passes all gates |
| **Popular** | Score ≥ 50 |
| **New** | Everything else |

---

## Example Calculation

**Deal:** iPhone @ ₹45,999

**Inputs:**
- 120 upvotes (weight 1.5 avg) = **+180**
- 10 downvotes (weight 1.4 avg) = **-16.8**
- Poster trust 75 = **+22.5**
- Lowest in 90d = **+40**
- 8 hours old = **-23**

**Score:** 180 - 16.8 + 22.5 + 40 - 23 = **202.7**

**Result:** ✅ **FRONTPAGE**

---

## API Usage

```typescript
import { ScoringAlgorithm } from './utils/scoring';

// Calculate vote weight
const weight = ScoringAlgorithm.calculateVoteWeight(userProfile);

// Calculate deal score
const score = ScoringAlgorithm.calculateDealScore(dealData);

// Check frontpage eligibility
const qualified = ScoringAlgorithm.qualifiesForFrontpage(dealData);
```

---

## Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Frontpage min score | 120 |
| Frontpage min upvotes | 30 |
| Frontpage min ratio | 85% |
| Popular threshold | 50 |
| New account days | 7 |
| Burst vote threshold | 40 in 5min |
| Max trust score | 100 |
| Max vote weight | 2.0 |
| Downvote multiplier | 1.2 |

---

**Print this out and keep it handy!** 📌
