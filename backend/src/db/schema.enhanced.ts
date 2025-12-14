import { pgTable, text, integer, timestamp, boolean, uuid, varchar, index, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table with trust scoring
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),

  // Enhanced reputation system
  reputation: integer('reputation').default(0).notNull(),
  trustScore: integer('trust_score').default(20).notNull(), // 0-100
  dealsPosted: integer('deals_posted').default(0).notNull(),
  votesGiven: integer('votes_given').default(0).notNull(),
  accurateDealsCount: integer('accurate_deals_count').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  usernameIdx: index('username_idx').on(table.username),
  trustScoreIdx: index('trust_score_idx').on(table.trustScore),
}));

// Categories table
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Deals table with enhanced scoring
export const deals = pgTable('deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  originalPrice: integer('original_price'),
  discountPercentage: integer('discount_percentage'),
  merchant: varchar('merchant', { length: 100 }).notNull(),
  url: text('url'),
  imageUrl: text('image_url'),
  expiresAt: timestamp('expires_at'),
  isExpired: boolean('is_expired').default(false).notNull(),

  // Foreign keys
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  // Vote counts (denormalized)
  upvotes: integer('upvotes').default(0).notNull(),
  downvotes: integer('downvotes').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),

  // Enhanced scoring fields
  weightedUpvotes: real('weighted_upvotes').default(0).notNull(),
  weightedDownvotes: real('weighted_downvotes').default(0).notNull(),
  dealScore: real('deal_score').default(0).notNull(),
  frontpageScore: real('frontpage_score').default(0).notNull(),

  // Price truth tracking
  priceTruthStatus: varchar('price_truth_status', { length: 20 }).default('normal').notNull(), // lowest_90d, below_avg, normal, inflated
  priceTruthBonus: integer('price_truth_bonus').default(0).notNull(),
  lowestPriceIn90Days: integer('lowest_price_90d'),

  // Anti-gaming
  isFlagged: boolean('is_flagged').default(false).notNull(),
  flagReason: text('flag_reason'),
  burstVoteDetected: boolean('burst_vote_detected').default(false).notNull(),

  // Velocity tracking
  upvoteVelocity: integer('upvote_velocity').default(0).notNull(), // votes in last 30 min
  lastVelocityUpdate: timestamp('last_velocity_update').defaultNow(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('deals_user_id_idx').on(table.userId),
  categoryIdIdx: index('deals_category_id_idx').on(table.categoryId),
  createdAtIdx: index('deals_created_at_idx').on(table.createdAt),
  merchantIdx: index('deals_merchant_idx').on(table.merchant),
  dealScoreIdx: index('deals_score_idx').on(table.dealScore),
  frontpageScoreIdx: index('deals_frontpage_score_idx').on(table.frontpageScore),
}));

// Votes table with weight tracking
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  voteType: integer('vote_type').notNull(), // 1 for upvote, -1 for downvote
  voteWeight: real('vote_weight').default(1.0).notNull(), // calculated at vote time
  userTrustAtVote: integer('user_trust_at_vote').default(20).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userDealIdx: index('votes_user_deal_idx').on(table.userId, table.dealId),
  dealCreatedIdx: index('votes_deal_created_idx').on(table.dealId, table.createdAt),
}));

// Price history table (for price truth tracking)
export const priceHistory = pgTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  price: integer('price').notNull(),
  merchant: varchar('merchant', { length: 100 }).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => ({
  dealIdIdx: index('price_history_deal_id_idx').on(table.dealId),
  recordedAtIdx: index('price_history_recorded_at_idx').on(table.recordedAt),
}));

// Comments table
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id').references((): any => comments.id, { onDelete: 'cascade' }),
  upvotes: integer('upvotes').default(0).notNull(),
  downvotes: integer('downvotes').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealIdIdx: index('comments_deal_id_idx').on(table.dealId),
  userIdIdx: index('comments_user_id_idx').on(table.userId),
  parentIdIdx: index('comments_parent_id_idx').on(table.parentId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  votes: many(votes),
  comments: many(comments),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  user: one(users, {
    fields: [deals.userId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [deals.categoryId],
    references: [categories.id],
  }),
  votes: many(votes),
  comments: many(comments),
  priceHistory: many(priceHistory),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [votes.dealId],
    references: [deals.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  deal: one(deals, {
    fields: [priceHistory.dealId],
    references: [deals.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [comments.dealId],
    references: [deals.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  deals: many(deals),
}));
