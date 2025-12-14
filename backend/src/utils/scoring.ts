/**
 * Advanced Deal Scoring Algorithm for India Market
 * Based on Slickdeals-style scoring with anti-gaming protections
 */

export interface UserTrustProfile {
  trustScore: number; // 0-100
  dealsPosted: number;
  votesGiven: number;
  accurateDealsCount: number;
  accountAgeDays: number;
}

export interface DealData {
  upvotes: number;
  downvotes: number;
  weightedUpvotes: number;
  weightedDownvotes: number;
  posterTrustScore: number;
  priceTruthStatus: 'lowest_90d' | 'below_avg' | 'normal' | 'inflated';
  createdAt: Date;
  upvoteVelocity: number;
  burstVoteDetected: boolean;
}

// ============================================================================
// 1. VOTE WEIGHT CALCULATION
// ============================================================================

/**
 * Calculate vote weight based on user trust score
 * VoteWeight = 1 + (TrustScore / 100)
 */
export function calculateVoteWeight(userTrust: UserTrustProfile): number {
  const { trustScore, accountAgeDays } = userTrust;

  let baseWeight = 1 + (trustScore / 100);

  // New account penalty (< 7 days)
  if (accountAgeDays < 7) {
    baseWeight *= 0.5;
  }

  // Cap at 2.0
  return Math.min(baseWeight, 2.0);
}

/**
 * Calculate upvote and downvote weights
 * Downvotes hit slightly harder (1.2x multiplier)
 */
export function getVoteWeights(voteWeight: number) {
  return {
    upvoteWeight: voteWeight,
    downvoteWeight: voteWeight * 1.2,
  };
}

// ============================================================================
// 2. TRUST BOOST (Poster Reputation)
// ============================================================================

/**
 * TrustBoost = PosterTrustScore × 0.3
 */
export function calculateTrustBoost(posterTrustScore: number): number {
  return posterTrustScore * 0.3;
}

// ============================================================================
// 3. PRICE TRUTH BONUS
// ============================================================================

/**
 * Price Truth Bonus (Killer Feature)
 * +40  if Lowest in 90 days
 * +20  if Below 30-day avg
 * 0    if Normal
 * −50  if Inflated before sale
 */
export function calculatePriceTruthBonus(status: string): number {
  switch (status) {
    case 'lowest_90d':
      return 40;
    case 'below_avg':
      return 20;
    case 'normal':
      return 0;
    case 'inflated':
      return -50;
    default:
      return 0;
  }
}

// ============================================================================
// 4. TIME DECAY (Freshness Control)
// ============================================================================

/**
 * TimeDecay = (HoursSincePost ^ 1.2) × 2
 */
export function calculateTimeDecay(createdAt: Date): number {
  const now = new Date();
  const hoursSincePost = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return Math.pow(hoursSincePost, 1.2) * 2;
}

// ============================================================================
// 5. CORE DEAL SCORE
// ============================================================================

/**
 * DealScore =
 *   (WeightedUpvotes × UpvoteWeight)
 *   − (WeightedDownvotes × DownvoteWeight)
 *   + TrustBoost
 *   + PriceTruthBonus
 *   − TimeDecay
 */
export function calculateDealScore(deal: DealData): number {
  const trustBoost = calculateTrustBoost(deal.posterTrustScore);
  const priceTruthBonus = calculatePriceTruthBonus(deal.priceTruthStatus);
  const timeDecay = calculateTimeDecay(deal.createdAt);

  const score =
    deal.weightedUpvotes -
    deal.weightedDownvotes +
    trustBoost +
    priceTruthBonus -
    timeDecay;

  return Math.max(0, score); // Never negative
}

// ============================================================================
// 6. FRONTPAGE QUALIFICATION
// ============================================================================

export interface FrontpageGates {
  minScore: number; // 120
  minUpvotes: number; // 30
  minUpvoteRatio: number; // 0.85 (85%)
  minPosterTrust: number; // 40
  allowInflated: boolean; // false
}

export const DEFAULT_FRONTPAGE_GATES: FrontpageGates = {
  minScore: 120,
  minUpvotes: 30,
  minUpvoteRatio: 0.85,
  minPosterTrust: 40,
  allowInflated: false,
};

/**
 * Check if deal qualifies for Frontpage
 */
export function qualifiesForFrontpage(
  deal: DealData,
  gates: FrontpageGates = DEFAULT_FRONTPAGE_GATES
): boolean {
  const totalVotes = deal.upvotes + deal.downvotes;
  const upvoteRatio = totalVotes > 0 ? deal.upvotes / totalVotes : 0;
  const dealScore = calculateDealScore(deal);

  return (
    dealScore >= gates.minScore &&
    deal.upvotes >= gates.minUpvotes &&
    upvoteRatio >= gates.minUpvoteRatio &&
    deal.posterTrustScore >= gates.minPosterTrust &&
    (gates.allowInflated || deal.priceTruthStatus !== 'inflated')
  );
}

// ============================================================================
// 7. FRONTPAGE RANKING SCORE
// ============================================================================

/**
 * FrontpageScore =
 *   DealScore
 *   + (UpvoteVelocity × 5)
 *   − (AgePenalty × 1.5)
 */
export function calculateFrontpageScore(deal: DealData): number {
  const dealScore = calculateDealScore(deal);
  const hoursSincePost = (Date.now() - deal.createdAt.getTime()) / (1000 * 60 * 60);
  const agePenalty = hoursSincePost * 1.5;

  return dealScore + deal.upvoteVelocity * 5 - agePenalty;
}

// ============================================================================
// 8. ANTI-GAMING: BURST VOTE DETECTION
// ============================================================================

export interface VoteActivity {
  timestamp: Date;
  userId: string;
  userAccountAge: number; // days
  userTrustScore: number;
}

/**
 * Detect burst voting patterns
 * If >40 votes in <5 min from new accounts → BURST DETECTED
 */
export function detectBurstVoting(votes: VoteActivity[]): boolean {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentVotes = votes.filter((v) => v.timestamp > fiveMinAgo);

  if (recentVotes.length <= 40) {
    return false;
  }

  // Count votes from new/suspicious accounts
  const suspiciousVotes = recentVotes.filter(
    (v) => v.userAccountAge < 7 || v.userTrustScore < 30
  );

  return suspiciousVotes.length > 20; // More than half from suspicious accounts
}

// ============================================================================
// 9. USER TRUST SCORE CALCULATION
// ============================================================================

/**
 * Calculate user trust score (0-100)
 * Based on:
 * - Account age
 * - Deals posted
 * - Vote history
 * - Accurate deals ratio
 */
export function calculateUserTrustScore(user: UserTrustProfile): number {
  let trust = 20; // Base score for new users

  // Account age bonus (max +20)
  const ageBonus = Math.min(user.accountAgeDays / 15, 20);
  trust += ageBonus;

  // Deals posted bonus (max +25)
  const dealsBonus = Math.min(user.dealsPosted * 2.5, 25);
  trust += dealsBonus;

  // Vote participation bonus (max +15)
  const voteBonus = Math.min(user.votesGiven / 10, 15);
  trust += voteBonus;

  // Accuracy bonus (max +20)
  if (user.dealsPosted > 0) {
    const accuracyRatio = user.accurateDealsCount / user.dealsPosted;
    trust += accuracyRatio * 20;
  }

  return Math.min(Math.round(trust), 100);
}

// ============================================================================
// 10. TAB CLASSIFICATION
// ============================================================================

/**
 * Determine which tab a deal belongs to
 */
export function classifyDealTab(deal: DealData): 'Frontpage' | 'Popular' | 'New' {
  if (qualifiesForFrontpage(deal)) {
    return 'Frontpage';
  }

  const dealScore = calculateDealScore(deal);
  if (dealScore >= 50) {
    return 'Popular';
  }

  return 'New';
}

// ============================================================================
// HELPER: Update weighted vote counts
// ============================================================================

/**
 * Recalculate weighted upvotes and downvotes from vote records
 */
export function calculateWeightedVotes(
  votes: Array<{ voteType: number; voteWeight: number }>
) {
  let weightedUpvotes = 0;
  let weightedDownvotes = 0;

  for (const vote of votes) {
    if (vote.voteType === 1) {
      weightedUpvotes += vote.voteWeight;
    } else if (vote.voteType === -1) {
      weightedDownvotes += vote.voteWeight;
    }
  }

  return { weightedUpvotes, weightedDownvotes };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ScoringAlgorithm = {
  calculateVoteWeight,
  getVoteWeights,
  calculateTrustBoost,
  calculatePriceTruthBonus,
  calculateTimeDecay,
  calculateDealScore,
  calculateFrontpageScore,
  qualifiesForFrontpage,
  detectBurstVoting,
  calculateUserTrustScore,
  classifyDealTab,
  calculateWeightedVotes,
};
