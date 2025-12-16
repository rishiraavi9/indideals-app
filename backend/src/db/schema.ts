import { pgTable, text, integer, timestamp, boolean, uuid, varchar, index, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  reputation: integer('reputation').default(0).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  googleId: varchar('google_id', { length: 255 }),
  facebookId: varchar('facebook_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  usernameIdx: index('username_idx').on(table.username),
  googleIdIdx: index('google_id_idx').on(table.googleId),
  facebookIdIdx: index('facebook_id_idx').on(table.facebookId),
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

// Deals table
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

  // Festive/Seasonal metadata
  festiveTags: text('festive_tags').array(), // e.g., ['diwali', 'pongal', 'holi', 'christmas']
  seasonalTag: varchar('seasonal_tag', { length: 50 }), // e.g., 'winter', 'summer', 'monsoon'
  isFeatured: boolean('is_featured').default(false).notNull(),

  // Verification fields
  verificationStatus: varchar('verification_status', { length: 20 }).default('pending').notNull(), // 'pending', 'verified', 'failed', 'flagged'
  verified: boolean('verified').default(false).notNull(), // Quick boolean check
  verifiedAt: timestamp('verified_at'),
  lastVerifiedAt: timestamp('last_verified_at'),
  verificationAttempts: integer('verification_attempts').default(0).notNull(),
  urlAccessible: boolean('url_accessible'),
  priceMatch: boolean('price_match'),
  autoFlagged: boolean('auto_flagged').default(false).notNull(),
  flagReason: text('flag_reason'),

  // Foreign keys
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  // Counts (denormalized for performance)
  upvotes: integer('upvotes').default(0).notNull(),
  downvotes: integer('downvotes').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  viewCount: integer('view_count').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('deals_user_id_idx').on(table.userId),
  categoryIdIdx: index('deals_category_id_idx').on(table.categoryId),
  createdAtIdx: index('deals_created_at_idx').on(table.createdAt),
  merchantIdx: index('deals_merchant_idx').on(table.merchant),
  isFeaturedIdx: index('deals_is_featured_idx').on(table.isFeatured),
  verificationStatusIdx: index('deals_verification_status_idx').on(table.verificationStatus),
  verifiedIdx: index('deals_verified_idx').on(table.verified),
}));

// Votes table (tracks individual user votes)
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  voteType: integer('vote_type').notNull(), // 1 for upvote, -1 for downvote
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userDealIdx: index('votes_user_deal_idx').on(table.userId, table.dealId),
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

// Comment Votes table (tracks individual user votes on comments)
export const commentVotes = pgTable('comment_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
  voteType: integer('vote_type').notNull(), // 1 for upvote, -1 for downvote
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCommentIdx: index('comment_votes_user_comment_idx').on(table.userId, table.commentId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  votes: many(votes),
  comments: many(comments),
  commentVotes: many(commentVotes),
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
    relationName: 'comment_replies',
  }),
  replies: many(comments, {
    relationName: 'comment_replies',
  }),
  votes: many(commentVotes),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  user: one(users, {
    fields: [commentVotes.userId],
    references: [users.id],
  }),
  comment: one(comments, {
    fields: [commentVotes.commentId],
    references: [comments.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  deals: many(deals),
}));

// User activity tracking for personalization
export const userActivity = pgTable('user_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  activityType: varchar('activity_type', { length: 20 }).notNull(), // 'view', 'click', 'vote', 'comment'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_activity_user_id_idx').on(table.userId),
  dealIdIdx: index('user_activity_deal_id_idx').on(table.dealId),
  categoryIdIdx: index('user_activity_category_id_idx').on(table.categoryId),
  activityTypeIdx: index('user_activity_type_idx').on(table.activityType),
  createdAtIdx: index('user_activity_created_at_idx').on(table.createdAt),
}));

// Affiliate clicks tracking
export const affiliateClicks = pgTable('affiliate_clicks', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  anonymousId: varchar('anonymous_id', { length: 255 }), // For non-logged-in users
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  referrer: text('referrer'),
  merchant: varchar('merchant', { length: 100 }).notNull(),
  affiliateUrl: text('affiliate_url').notNull(),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
  converted: boolean('converted').default(false).notNull(),
  convertedAt: timestamp('converted_at'),
  estimatedCommission: integer('estimated_commission'), // in paise (₹0.01)
}, (table) => ({
  dealIdIdx: index('affiliate_clicks_deal_id_idx').on(table.dealId),
  userIdIdx: index('affiliate_clicks_user_id_idx').on(table.userId),
  clickedAtIdx: index('affiliate_clicks_clicked_at_idx').on(table.clickedAt),
  merchantIdx: index('affiliate_clicks_merchant_idx').on(table.merchant),
  convertedIdx: index('affiliate_clicks_converted_idx').on(table.converted),
}));

// Affiliate programs configuration
export const affiliatePrograms = pgTable('affiliate_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchant: varchar('merchant', { length: 100 }).notNull().unique(),
  programName: varchar('program_name', { length: 200 }).notNull(),
  affiliateId: varchar('affiliate_id', { length: 200 }), // Your affiliate ID
  commissionRate: integer('commission_rate'), // in basis points (0.01%)
  cookieDuration: integer('cookie_duration'), // in days
  isActive: boolean('is_active').default(true).notNull(),
  apiKey: text('api_key'), // For automated tracking
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index('affiliate_programs_merchant_idx').on(table.merchant),
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
  deal: one(deals, {
    fields: [userActivity.dealId],
    references: [deals.id],
  }),
  category: one(categories, {
    fields: [userActivity.categoryId],
    references: [categories.id],
  }),
}));

// Refresh tokens for JWT authentication
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  revoked: timestamp('revoked'),
});

// Password reset tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  used: timestamp('used'),
});

// Email verification tokens
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  used: timestamp('used'),
});

// Product/Keyword alerts for email notifications
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Alert criteria
  keyword: varchar('keyword', { length: 255 }).notNull(), // e.g., "sony headphones", "iphone 15"
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  minDiscount: integer('min_discount'), // Minimum discount percentage
  maxPrice: integer('max_price'), // Maximum price in paise
  merchant: varchar('merchant', { length: 100 }), // Specific merchant filter

  // Alert settings
  isActive: boolean('is_active').default(true).notNull(),
  frequency: varchar('frequency', { length: 20 }).default('instant').notNull(), // 'instant', 'daily', 'weekly'
  lastNotified: timestamp('last_notified'),
  notificationCount: integer('notification_count').default(0).notNull(),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('alerts_user_id_idx').on(table.userId),
  keywordIdx: index('alerts_keyword_idx').on(table.keyword),
  categoryIdIdx: index('alerts_category_id_idx').on(table.categoryId),
  isActiveIdx: index('alerts_is_active_idx').on(table.isActive),
}));

// Track which deals have been sent for which alerts (prevent duplicate notifications)
export const alertNotifications = pgTable('alert_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  emailStatus: varchar('email_status', { length: 20 }).default('sent').notNull(), // 'sent', 'failed', 'bounced'
}, (table) => ({
  alertDealIdx: index('alert_notifications_alert_deal_idx').on(table.alertId, table.dealId),
  dealIdIdx: index('alert_notifications_deal_id_idx').on(table.dealId),
}));

// Price History - Track price changes over time
export const priceHistory = pgTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  price: integer('price').notNull(),
  originalPrice: integer('original_price'),
  merchant: varchar('merchant', { length: 100 }).notNull(),
  scrapedAt: timestamp('scraped_at').notNull().defaultNow(),
  source: varchar('source', { length: 20 }).notNull(), // 'manual', 'scraper', 'api'
}, (table) => ({
  dealIdIdx: index('price_history_deal_id_idx').on(table.dealId),
  scrapedAtIdx: index('price_history_scraped_at_idx').on(table.scrapedAt),
  merchantIdx: index('price_history_merchant_idx').on(table.merchant),
}));

// Price Alerts - User notifications for price drops
export const priceAlerts = pgTable('price_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  targetPrice: integer('target_price').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  notifiedAt: timestamp('notified_at'),
}, (table) => ({
  userIdIdx: index('price_alerts_user_id_idx').on(table.userId),
  dealIdIdx: index('price_alerts_deal_id_idx').on(table.dealId),
  activeIdx: index('price_alerts_active_idx').on(table.isActive),
}));

// Saved Deals (Wishlist)
export const savedDeals = pgTable('saved_deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  dealId: uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userDealIdx: index('saved_deals_user_deal_idx').on(table.userId, table.dealId),
  uniqueUserDeal: unique().on(table.userId, table.dealId),
}));

// Merchants - Configuration for merchant integrations
export const merchants = pgTable('merchants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logo: text('logo'),
  apiType: varchar('api_type', { length: 20 }), // 'rest', 'graphql', 'scraper'
  apiBaseUrl: text('api_base_url'),
  apiKey: text('api_key'), // Encrypted
  isActive: boolean('is_active').notNull().default(true),
  scrapingConfig: jsonb('scraping_config'), // CSS selectors, etc.
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('merchants_slug_idx').on(table.slug),
  activeIdx: index('merchants_active_idx').on(table.isActive),
}));

// Merchant Products - Track external products
export const merchantProducts = pgTable('merchant_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id', { length: 255 }).notNull(), // Product ID from merchant
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }), // Link to our deal
  productUrl: text('product_url').notNull(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
}, (table) => ({
  merchantProductIdx: index('merchant_products_merchant_external_idx').on(table.merchantId, table.externalId),
  dealIdIdx: index('merchant_products_deal_id_idx').on(table.dealId),
}));

// Coupons
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).notNull(),
  merchant: varchar('merchant', { length: 100 }).notNull(),
  description: text('description').notNull(),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // 'percentage', 'fixed', 'freeShipping'
  discountValue: integer('discount_value'),
  minPurchase: integer('min_purchase'),
  maxDiscount: integer('max_discount'),
  expiresAt: timestamp('expires_at'),
  isVerified: boolean('is_verified').notNull().default(false),
  verifiedAt: timestamp('verified_at'),
  usageCount: integer('usage_count').notNull().default(0),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  merchantIdx: index('coupons_merchant_idx').on(table.merchant),
  expiresAtIdx: index('coupons_expires_at_idx').on(table.expiresAt),
  codeIdx: index('coupons_code_idx').on(table.code),
}));

// Coupon Usage - Track if coupons worked
export const couponUsage = pgTable('coupon_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  worked: boolean('worked'),
  feedback: text('feedback'),
  usedAt: timestamp('used_at').notNull().defaultNow(),
}, (table) => ({
  couponIdIdx: index('coupon_usage_coupon_id_idx').on(table.couponId),
  userIdIdx: index('coupon_usage_user_id_idx').on(table.userId),
}));

// Cashback Programs
export const cashbackPrograms = pgTable('cashback_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: varchar('provider', { length: 100 }).notNull(), // 'cred', 'rakuten', 'paytm'
  merchant: varchar('merchant', { length: 100 }).notNull(),
  cashbackRate: integer('cashback_rate').notNull(), // Basis points (500 = 5%)
  maxCashback: integer('max_cashback'),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  merchantIdx: index('cashback_programs_merchant_idx').on(table.merchant),
  providerIdx: index('cashback_programs_provider_idx').on(table.provider),
  activeIdx: index('cashback_programs_active_idx').on(table.isActive),
}));

// Push Subscriptions for PWA notifications
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('push_subscriptions_user_id_idx').on(table.userId),
  endpointIdx: index('push_subscriptions_endpoint_idx').on(table.endpoint),
}));

// Deal Verification Logs - Track all verification attempts
export const dealVerificationLogs = pgTable('deal_verification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  verificationType: varchar('verification_type', { length: 30 }).notNull(), // 'url_check', 'price_scrape', 'periodic_check'
  status: varchar('status', { length: 20 }).notNull(), // 'success', 'failed', 'warning'
  urlAccessible: boolean('url_accessible'),
  statusCode: integer('status_code'),
  scrapedPrice: integer('scraped_price'),
  scrapedOriginalPrice: integer('scraped_original_price'),
  priceMatch: boolean('price_match'),
  priceDifference: integer('price_difference'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'), // Additional data (response time, headers, etc.)
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  dealIdIdx: index('verification_logs_deal_id_idx').on(table.dealId),
  createdAtIdx: index('verification_logs_created_at_idx').on(table.createdAt),
  statusIdx: index('verification_logs_status_idx').on(table.status),
}));
