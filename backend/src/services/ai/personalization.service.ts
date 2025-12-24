import { db } from '../../db/index.js';
import {
  deals,
  votes,
  userActivity,
  categories,
  savedDeals,
  userProfiles,
  userSimilarityCache,
} from '../../db/schema.js';
import { eq, and, desc, gte, sql, inArray, ne } from 'drizzle-orm';

/**
 * Personalization Service (Cost-Free)
 *
 * Provides personalized deal recommendations using local algorithms:
 * 1. User Profile Building - Aggregate preferences from activity
 * 2. Content-Based Filtering - Match deals to user preferences
 * 3. Collaborative Filtering - Find similar users, recommend their liked deals
 * 4. Hybrid Scoring - 60% collaborative + 40% content-based
 *
 * All algorithms run locally - NO external API calls.
 */

interface CategoryWeight {
  categoryId: string;
  categoryName?: string;
  weight: number;
}

interface MerchantWeight {
  merchant: string;
  weight: number;
}

interface PriceRangePreference {
  min: number;
  max: number;
  avg: number;
}

export interface UserProfile {
  userId: string;
  preferredCategories: CategoryWeight[];
  preferredMerchants: MerchantWeight[];
  preferredPriceRange: PriceRangePreference;
  avgLikedDiscount: number;
  activityVector: number[];
  totalInteractions: number;
}

interface ScoredDeal {
  dealId: string;
  contentScore: number;
  collaborativeScore: number;
  hybridScore: number;
  matchReasons: string[];
}

export class PersonalizationService {
  // Feature vector dimensions for cosine similarity
  private static readonly VECTOR_DIMENSIONS = 20;

  // Weight for hybrid scoring (collaborative vs content)
  private static readonly COLLABORATIVE_WEIGHT = 0.6;
  private static readonly CONTENT_WEIGHT = 0.4;

  /**
   * Build or update a user's preference profile from their activity
   */
  static async buildUserProfile(userId: string): Promise<UserProfile> {
    // Get user's voting history
    const userVotes = await db
      .select({
        dealId: votes.dealId,
        voteType: votes.voteType,
        categoryId: deals.categoryId,
        merchant: deals.merchant,
        price: deals.price,
        discountPercentage: deals.discountPercentage,
      })
      .from(votes)
      .innerJoin(deals, eq(votes.dealId, deals.id))
      .where(eq(votes.userId, userId))
      .limit(500);

    // Get user's activity (views, clicks)
    const activities = await db
      .select({
        dealId: userActivity.dealId,
        categoryId: userActivity.categoryId,
        activityType: userActivity.activityType,
      })
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .limit(1000);

    // Get saved deals
    const saved = await db
      .select({
        dealId: savedDeals.dealId,
        categoryId: deals.categoryId,
        merchant: deals.merchant,
        price: deals.price,
      })
      .from(savedDeals)
      .innerJoin(deals, eq(savedDeals.dealId, deals.id))
      .where(eq(savedDeals.userId, userId))
      .limit(200);

    // Calculate category preferences
    const categoryScores = new Map<string, number>();

    // Weight from upvotes (highest weight)
    userVotes
      .filter(v => v.voteType === 1 && v.categoryId)
      .forEach(v => {
        const current = categoryScores.get(v.categoryId!) || 0;
        categoryScores.set(v.categoryId!, current + 3);
      });

    // Weight from saved deals
    saved
      .filter(s => s.categoryId)
      .forEach(s => {
        const current = categoryScores.get(s.categoryId!) || 0;
        categoryScores.set(s.categoryId!, current + 2);
      });

    // Weight from views/clicks
    activities
      .filter(a => a.categoryId)
      .forEach(a => {
        const weight = a.activityType === 'click' ? 1.5 : 0.5;
        const current = categoryScores.get(a.categoryId!) || 0;
        categoryScores.set(a.categoryId!, current + weight);
      });

    // Negative weight from downvotes
    userVotes
      .filter(v => v.voteType === -1 && v.categoryId)
      .forEach(v => {
        const current = categoryScores.get(v.categoryId!) || 0;
        categoryScores.set(v.categoryId!, current - 2);
      });

    // Normalize category weights
    const totalCategoryScore = Array.from(categoryScores.values())
      .filter(v => v > 0)
      .reduce((sum, v) => sum + v, 0) || 1;

    const preferredCategories: CategoryWeight[] = Array.from(categoryScores.entries())
      .filter(([_, score]) => score > 0)
      .map(([categoryId, score]) => ({
        categoryId,
        weight: Math.round((score / totalCategoryScore) * 100),
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // Calculate merchant preferences
    const merchantScores = new Map<string, number>();

    userVotes
      .filter(v => v.voteType === 1)
      .forEach(v => {
        const current = merchantScores.get(v.merchant) || 0;
        merchantScores.set(v.merchant, current + 3);
      });

    saved.forEach(s => {
      const current = merchantScores.get(s.merchant) || 0;
      merchantScores.set(s.merchant, current + 2);
    });

    userVotes
      .filter(v => v.voteType === -1)
      .forEach(v => {
        const current = merchantScores.get(v.merchant) || 0;
        merchantScores.set(v.merchant, current - 2);
      });

    const totalMerchantScore = Array.from(merchantScores.values())
      .filter(v => v > 0)
      .reduce((sum, v) => sum + v, 0) || 1;

    const preferredMerchants: MerchantWeight[] = Array.from(merchantScores.entries())
      .filter(([_, score]) => score > 0)
      .map(([merchant, score]) => ({
        merchant,
        weight: Math.round((score / totalMerchantScore) * 100),
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    // Calculate price range preferences from upvoted deals
    const upvotedPrices = userVotes
      .filter(v => v.voteType === 1 && v.price)
      .map(v => v.price);

    const savedPrices = saved.filter(s => s.price).map(s => s.price);
    const allPrices = [...upvotedPrices, ...savedPrices];

    let preferredPriceRange: PriceRangePreference = { min: 0, max: 100000, avg: 5000 };
    if (allPrices.length > 0) {
      const sortedPrices = allPrices.sort((a, b) => a - b);
      preferredPriceRange = {
        min: sortedPrices[Math.floor(sortedPrices.length * 0.1)] || 0,
        max: sortedPrices[Math.floor(sortedPrices.length * 0.9)] || 100000,
        avg: Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
      };
    }

    // Calculate average liked discount
    const likedDiscounts = userVotes
      .filter(v => v.voteType === 1 && v.discountPercentage)
      .map(v => v.discountPercentage!);

    const avgLikedDiscount = likedDiscounts.length > 0
      ? Math.round(likedDiscounts.reduce((a, b) => a + b, 0) / likedDiscounts.length)
      : 30;

    // Build activity vector for similarity computation
    const activityVector = this.buildActivityVector(
      preferredCategories,
      preferredMerchants,
      preferredPriceRange,
      avgLikedDiscount
    );

    const totalInteractions = userVotes.length + activities.length + saved.length;

    const profile: UserProfile = {
      userId,
      preferredCategories,
      preferredMerchants,
      preferredPriceRange,
      avgLikedDiscount,
      activityVector,
      totalInteractions,
    };

    // Save profile to database
    await this.saveUserProfile(profile);

    return profile;
  }

  /**
   * Build a normalized feature vector for similarity computation
   */
  private static buildActivityVector(
    categories: CategoryWeight[],
    merchants: MerchantWeight[],
    priceRange: PriceRangePreference,
    avgDiscount: number
  ): number[] {
    const vector: number[] = new Array(this.VECTOR_DIMENSIONS).fill(0);

    // Dimensions 0-9: Category weights (normalized)
    categories.slice(0, 10).forEach((cat, i) => {
      vector[i] = cat.weight / 100;
    });

    // Dimensions 10-14: Merchant weights (top 5)
    merchants.slice(0, 5).forEach((m, i) => {
      vector[10 + i] = m.weight / 100;
    });

    // Dimension 15: Price range (normalized to 0-1, max 50000)
    vector[15] = Math.min(priceRange.avg / 50000, 1);

    // Dimension 16: Price range width preference
    vector[16] = Math.min((priceRange.max - priceRange.min) / 50000, 1);

    // Dimension 17: Discount preference (normalized)
    vector[17] = avgDiscount / 100;

    // Dimension 18-19: Reserved for future use
    vector[18] = 0;
    vector[19] = 0;

    // Normalize vector to unit length
    return this.normalizeVector(vector);
  }

  /**
   * Normalize a vector to unit length (L2 normalization)
   */
  private static normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find users similar to a given user
   */
  static async findSimilarUsers(
    userId: string,
    limit: number = 20
  ): Promise<{ userId: string; similarity: number }[]> {
    // Get the user's profile
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (!userProfile || !userProfile.activityVector) {
      return [];
    }

    const userVector = userProfile.activityVector as number[];

    // Get all other user profiles with activity vectors
    const otherProfiles = await db
      .select({
        userId: userProfiles.userId,
        activityVector: userProfiles.activityVector,
        totalInteractions: userProfiles.totalInteractions,
      })
      .from(userProfiles)
      .where(
        and(
          ne(userProfiles.userId, userId),
          gte(userProfiles.totalInteractions, 5) // Only users with enough activity
        )
      )
      .limit(500);

    // Calculate similarities
    const similarities = otherProfiles
      .filter(p => p.activityVector)
      .map(profile => ({
        userId: profile.userId,
        similarity: this.cosineSimilarity(userVector, profile.activityVector as number[]),
      }))
      .filter(s => s.similarity > 0.1) // Only keep meaningful similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Cache the similarities
    await this.cacheSimilarUsers(userId, similarities);

    return similarities;
  }

  /**
   * Cache similar users for faster lookups
   */
  private static async cacheSimilarUsers(
    userId: string,
    similarities: { userId: string; similarity: number }[]
  ): Promise<void> {
    // Delete old cache entries
    await db
      .delete(userSimilarityCache)
      .where(eq(userSimilarityCache.userId, userId));

    // Insert new cache entries
    if (similarities.length > 0) {
      await db.insert(userSimilarityCache).values(
        similarities.map(s => ({
          userId,
          similarUserId: s.userId,
          similarityScore: Math.round(s.similarity * 100),
        } as any))
      );
    }
  }

  /**
   * Get cached similar users
   */
  static async getCachedSimilarUsers(
    userId: string
  ): Promise<{ userId: string; similarity: number }[]> {
    const cached = await db
      .select({
        similarUserId: userSimilarityCache.similarUserId,
        similarityScore: userSimilarityCache.similarityScore,
      })
      .from(userSimilarityCache)
      .where(eq(userSimilarityCache.userId, userId))
      .orderBy(desc(userSimilarityCache.similarityScore))
      .limit(20);

    return cached.map(c => ({
      userId: c.similarUserId,
      similarity: c.similarityScore / 100,
    }));
  }

  /**
   * Score a deal for a user using content-based filtering
   */
  private static scoreContentBased(
    deal: {
      categoryId: string | null;
      merchant: string;
      price: number;
      discountPercentage: number | null;
    },
    profile: UserProfile
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Category match
    if (deal.categoryId) {
      const categoryPref = profile.preferredCategories.find(
        c => c.categoryId === deal.categoryId
      );
      if (categoryPref) {
        score += categoryPref.weight * 0.4;
        reasons.push(`Matches preferred category (${categoryPref.weight}% preference)`);
      }
    }

    // Merchant match
    const merchantPref = profile.preferredMerchants.find(
      m => m.merchant.toLowerCase() === deal.merchant.toLowerCase()
    );
    if (merchantPref) {
      score += merchantPref.weight * 0.3;
      reasons.push(`From preferred merchant ${deal.merchant}`);
    }

    // Price range match
    const { min, max, avg } = profile.preferredPriceRange;
    if (deal.price >= min && deal.price <= max) {
      // Calculate how close to preferred average
      const priceDistance = Math.abs(deal.price - avg) / avg;
      const priceScore = Math.max(0, 1 - priceDistance) * 20;
      score += priceScore;
      if (priceScore > 10) {
        reasons.push('In your preferred price range');
      }
    }

    // Discount match
    if (deal.discountPercentage) {
      const discountDiff = Math.abs(deal.discountPercentage - profile.avgLikedDiscount);
      if (discountDiff <= 10) {
        score += 10;
        reasons.push(`${deal.discountPercentage}% off (you like ~${profile.avgLikedDiscount}%)`);
      } else if (deal.discountPercentage > profile.avgLikedDiscount) {
        score += 15;
        reasons.push(`${deal.discountPercentage}% off - better than usual!`);
      }
    }

    // Cap at 100
    return { score: Math.min(score, 100), reasons };
  }

  /**
   * Get deals liked by similar users that this user hasn't seen
   */
  static async getCollaborativeRecommendations(
    userId: string,
    limit: number = 50
  ): Promise<{ dealId: string; score: number; fromUserCount: number }[]> {
    // Get similar users
    let similarUsers = await this.getCachedSimilarUsers(userId);

    if (similarUsers.length === 0) {
      similarUsers = await this.findSimilarUsers(userId);
    }

    if (similarUsers.length === 0) {
      return [];
    }

    // Get deals the current user has already interacted with
    const userInteractedDeals = await db
      .select({ dealId: votes.dealId })
      .from(votes)
      .where(eq(votes.userId, userId));

    const interactedSet = new Set(userInteractedDeals.map(d => d.dealId));

    // Get deals upvoted by similar users
    const similarUserIds = similarUsers.map(s => s.userId);
    const similarUserVotes = await db
      .select({
        dealId: votes.dealId,
        userId: votes.userId,
        voteType: votes.voteType,
      })
      .from(votes)
      .where(
        and(
          inArray(votes.userId, similarUserIds),
          eq(votes.voteType, 1) // Only upvotes
        )
      );

    // Score deals based on how many similar users liked them
    const dealScores = new Map<string, { score: number; userCount: number }>();

    similarUserVotes.forEach(vote => {
      if (interactedSet.has(vote.dealId)) return; // Skip deals user has seen

      const similarity = similarUsers.find(s => s.userId === vote.userId)?.similarity || 0;
      const current = dealScores.get(vote.dealId) || { score: 0, userCount: 0 };

      dealScores.set(vote.dealId, {
        score: current.score + (similarity * 100),
        userCount: current.userCount + 1,
      });
    });

    // Sort by score and return
    return Array.from(dealScores.entries())
      .map(([dealId, { score, userCount }]) => ({
        dealId,
        score: Math.round(score),
        fromUserCount: userCount,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get personalized deal recommendations using hybrid scoring
   */
  static async getPersonalizedDeals(
    userId: string,
    options: {
      limit?: number;
      categoryId?: string;
      excludeExpired?: boolean;
    } = {}
  ): Promise<ScoredDeal[]> {
    const { limit = 30, categoryId, excludeExpired = true } = options;

    // Get or build user profile
    let [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    let userProfile: UserProfile;

    if (!profile || profile.totalInteractions < 3) {
      // Build profile if not exists or too few interactions
      userProfile = await this.buildUserProfile(userId);
    } else {
      userProfile = {
        userId: profile.userId,
        preferredCategories: (profile.preferredCategories || []) as CategoryWeight[],
        preferredMerchants: (profile.preferredMerchants || []) as MerchantWeight[],
        preferredPriceRange: (profile.preferredPriceRange || { min: 0, max: 100000, avg: 5000 }) as PriceRangePreference,
        avgLikedDiscount: profile.avgLikedDiscount || 30,
        activityVector: (profile.activityVector || []) as number[],
        totalInteractions: profile.totalInteractions,
      };
    }

    // If user has very little activity, return trending deals instead
    if (userProfile.totalInteractions < 3) {
      return this.getTrendingDeals(limit);
    }

    // Get collaborative recommendations
    const collaborativeRecs = await this.getCollaborativeRecommendations(userId, limit * 2);
    const collaborativeMap = new Map(collaborativeRecs.map(r => [r.dealId, r]));

    // Get recent deals to score
    const recentDeals = await db
      .select({
        id: deals.id,
        categoryId: deals.categoryId,
        merchant: deals.merchant,
        price: deals.price,
        discountPercentage: deals.discountPercentage,
        isExpired: deals.isExpired,
        upvotes: deals.upvotes,
        createdAt: deals.createdAt,
      })
      .from(deals)
      .where(
        excludeExpired ? eq(deals.isExpired, false) : undefined
      )
      .orderBy(desc(deals.createdAt))
      .limit(200);

    // Filter by category if specified
    const filteredDeals = categoryId
      ? recentDeals.filter(d => d.categoryId === categoryId)
      : recentDeals;

    // Score each deal
    const scoredDeals: ScoredDeal[] = filteredDeals.map(deal => {
      // Content-based score
      const { score: contentScore, reasons } = this.scoreContentBased(
        {
          categoryId: deal.categoryId,
          merchant: deal.merchant,
          price: deal.price,
          discountPercentage: deal.discountPercentage,
        },
        userProfile
      );

      // Collaborative score
      const collabRec = collaborativeMap.get(deal.id);
      const collaborativeScore = collabRec ? collabRec.score : 0;

      if (collabRec && collabRec.fromUserCount > 0) {
        reasons.push(`Liked by ${collabRec.fromUserCount} similar users`);
      }

      // Hybrid score
      const hybridScore = Math.round(
        (collaborativeScore * this.COLLABORATIVE_WEIGHT) +
        (contentScore * this.CONTENT_WEIGHT)
      );

      // Boost for high community engagement
      const popularityBoost = Math.min(deal.upvotes * 0.5, 10);

      return {
        dealId: deal.id,
        contentScore,
        collaborativeScore,
        hybridScore: hybridScore + popularityBoost,
        matchReasons: reasons,
      };
    });

    // Sort by hybrid score and return top results
    return scoredDeals
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, limit);
  }

  /**
   * Get trending deals (fallback for new users)
   */
  private static async getTrendingDeals(limit: number): Promise<ScoredDeal[]> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const trending = await db
      .select({
        id: deals.id,
        upvotes: deals.upvotes,
        viewCount: deals.viewCount,
      })
      .from(deals)
      .where(
        and(
          eq(deals.isExpired, false),
          gte(deals.createdAt, threeDaysAgo)
        )
      )
      .orderBy(desc(deals.upvotes))
      .limit(limit);

    return trending.map(deal => ({
      dealId: deal.id,
      contentScore: 0,
      collaborativeScore: 0,
      hybridScore: deal.upvotes + Math.floor(deal.viewCount / 10),
      matchReasons: ['Trending deal'],
    }));
  }

  /**
   * Save user profile to database
   */
  private static async saveUserProfile(profile: UserProfile): Promise<void> {
    const existing = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, profile.userId))
      .limit(1);

    const profileData = {
      preferredCategories: profile.preferredCategories,
      preferredMerchants: profile.preferredMerchants,
      preferredPriceRange: profile.preferredPriceRange,
      avgLikedDiscount: profile.avgLikedDiscount,
      activityVector: profile.activityVector,
      totalInteractions: profile.totalInteractions,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(userProfiles)
        .set(profileData as any)
        .where(eq(userProfiles.userId, profile.userId));
    } else {
      await db.insert(userProfiles).values({
        userId: profile.userId,
        ...profileData,
      } as any);
    }
  }

  /**
   * Update all user profiles (batch job)
   */
  static async updateAllProfiles(): Promise<number> {
    // Get users with recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await db
      .select({ userId: votes.userId })
      .from(votes)
      .where(gte(votes.createdAt, thirtyDaysAgo))
      .groupBy(votes.userId)
      .limit(1000);

    let updated = 0;
    for (const { userId } of activeUsers) {
      try {
        await this.buildUserProfile(userId);
        updated++;
      } catch (error) {
        console.error(`Failed to build profile for user ${userId}:`, error);
      }
    }

    return updated;
  }

  /**
   * Update similarity cache for all users (batch job)
   */
  static async updateSimilarityCache(): Promise<number> {
    // Get users with profiles
    const usersWithProfiles = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(gte(userProfiles.totalInteractions, 5))
      .limit(500);

    let updated = 0;
    for (const { userId } of usersWithProfiles) {
      try {
        await this.findSimilarUsers(userId);
        updated++;
      } catch (error) {
        console.error(`Failed to compute similarity for user ${userId}:`, error);
      }
    }

    return updated;
  }

  /**
   * Get explanation for why a deal was recommended
   */
  static async explainRecommendation(
    userId: string,
    dealId: string
  ): Promise<{
    reasons: string[];
    contentScore: number;
    collaborativeScore: number;
  }> {
    // Get user profile
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      return {
        reasons: ['New user - showing popular deals'],
        contentScore: 0,
        collaborativeScore: 0,
      };
    }

    // Get the deal
    const [deal] = await db
      .select({
        categoryId: deals.categoryId,
        merchant: deals.merchant,
        price: deals.price,
        discountPercentage: deals.discountPercentage,
      })
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return {
        reasons: ['Deal not found'],
        contentScore: 0,
        collaborativeScore: 0,
      };
    }

    const userProfile: UserProfile = {
      userId: profile.userId,
      preferredCategories: (profile.preferredCategories || []) as CategoryWeight[],
      preferredMerchants: (profile.preferredMerchants || []) as MerchantWeight[],
      preferredPriceRange: (profile.preferredPriceRange || { min: 0, max: 100000, avg: 5000 }) as PriceRangePreference,
      avgLikedDiscount: profile.avgLikedDiscount || 30,
      activityVector: (profile.activityVector || []) as number[],
      totalInteractions: profile.totalInteractions,
    };

    const { score: contentScore, reasons } = this.scoreContentBased(deal, userProfile);

    // Check collaborative
    const collaborativeRecs = await this.getCollaborativeRecommendations(userId, 100);
    const collabRec = collaborativeRecs.find(r => r.dealId === dealId);

    if (collabRec) {
      reasons.push(`${collabRec.fromUserCount} users with similar taste liked this`);
    }

    return {
      reasons,
      contentScore,
      collaborativeScore: collabRec?.score || 0,
    };
  }
}

export const personalizationService = PersonalizationService;
