# Feature Flags Management Guide

## Overview

The IndiaDeals platform now uses **feature flags** to enable/disable features at runtime without code changes. This allows for:

- **Gradual Rollouts**: Enable features for testing before production
- **A/B Testing**: Enable features for specific user groups
- **Quick Rollbacks**: Disable problematic features instantly
- **Resource Management**: Disable expensive features when needed
- **Controlled Releases**: Enable new phases as they're completed

---

## How It Works

### Configuration File

Feature flags are defined in [/backend/src/config/features.ts](backend/src/config/features.ts).

Each feature can be controlled via environment variables:

```bash
# Enable a feature
FEATURE_WISHLIST_API=true

# Disable a feature
FEATURE_PRICE_TRACKING=false

# Omit the variable to use the default value
```

### Default States

- ✅ **Phase 1 (Completed)**: Enabled by default
- ✅ **Phase 1B (Implemented)**: Enabled by default
- ❌ **Phase 2-4 (Not Implemented)**: Disabled by default

---

## Available Feature Flags

### Phase 1: Job Queue Infrastructure (COMPLETED)

| Feature Flag | Default | Description |
|--------------|---------|-------------|
| `FEATURE_BULL_QUEUES` | ✅ true | Master switch for all Bull.js job queues |
| `FEATURE_PRICE_TRACKING` | ✅ true | Hourly price monitoring and history |
| `FEATURE_DEAL_VERIFICATION` | ✅ true | Auto-verify deals every 6 hours |
| `FEATURE_EMAIL_ALERTS` | ✅ true | Instant/daily/weekly email alerts |
| `FEATURE_DATABASE_CLEANUP` | ✅ true | Daily database maintenance at 2 AM |
| `FEATURE_BULL_BOARD_DASHBOARD` | ✅ true | Queue monitoring dashboard |

### Phase 1B: API Endpoints (IMPLEMENTED)

| Feature Flag | Default | Description |
|--------------|---------|-------------|
| `FEATURE_WISHLIST_API` | ✅ true | Save deals, manage wishlist |
| `FEATURE_PRICE_HISTORY_API` | ✅ true | Get price history for deals |
| `FEATURE_COUPONS_API` | ✅ true | Submit, verify, search coupons |
| `FEATURE_PRICE_ALERTS_API` | ✅ true | Set target price notifications |

### Phase 2: User Experience (NOT IMPLEMENTED)

| Feature Flag | Default | Description |
|--------------|---------|-------------|
| `FEATURE_BROWSER_EXTENSION_API` | ❌ false | Browser extension support |
| `FEATURE_PWA_FEATURES` | ❌ false | Progressive Web App features |
| `FEATURE_PUSH_NOTIFICATIONS` | ❌ false | Push notifications (web/mobile) |
| `FEATURE_CASHBACK_DISPLAY` | ❌ false | Show cashback on deals |

### Phase 3: Advanced Features (NOT IMPLEMENTED)

| Feature Flag | Default | Description |
|--------------|---------|-------------|
| `FEATURE_WEBSOCKETS` | ❌ false | Real-time WebSocket connections |
| `FEATURE_MERCHANT_SCRAPERS` | ❌ false | Automated merchant scraping |
| `FEATURE_ML_RECOMMENDATIONS` | ❌ false | ML-based deal recommendations |
| `FEATURE_ADMIN_DASHBOARD` | ❌ false | Admin panel UI |
| `FEATURE_REAL_TIME_UPDATES` | ❌ false | Live updates via Socket.io |

### Phase 4: Scale & Performance (NOT IMPLEMENTED)

| Feature Flag | Default | Description |
|--------------|---------|-------------|
| `FEATURE_ADVANCED_CACHING` | ❌ false | Enhanced Redis caching |
| `FEATURE_CDN_INTEGRATION` | ❌ false | CDN for images/assets |
| `FEATURE_RATE_LIMITING_ADVANCED` | ❌ false | Advanced rate limiting |
| `FEATURE_MONITORING` | ❌ false | Sentry/Prometheus monitoring |

---

## Usage Examples

### Enable/Disable Features

**In your `.env` file:**

```bash
# Disable all job queues (maintenance mode)
FEATURE_BULL_QUEUES=false

# Disable only price tracking
FEATURE_PRICE_TRACKING=false

# Enable new feature for testing
FEATURE_CASHBACK_DISPLAY=true
```

**Restart the server to apply changes:**

```bash
npm run dev
# or
pm2 restart deals-backend
```

### Check Enabled Features on Startup

The server logs all feature flags when it starts:

```
🚩 Feature Flags:
  ✅ Enabled (10): BULL_QUEUES, PRICE_TRACKING, DEAL_VERIFICATION, ...
  ❌ Disabled (13): BROWSER_EXTENSION_API, PWA_FEATURES, ...
```

---

## API Behavior When Features Are Disabled

When a feature is disabled, API endpoints return a `503 Service Unavailable` response:

```bash
curl http://localhost:3001/api/wishlist
```

**Response (if `FEATURE_WISHLIST_API=false`):**

```json
{
  "error": "Feature not available",
  "message": "The WISHLIST_API feature is currently disabled. Contact support if you believe this is an error.",
  "feature": "WISHLIST_API"
}
```

---

## Implementation Details

### Middleware Protection

All Phase 1B routes are protected by feature flag middleware:

```typescript
// Example: Wishlist routes
import { requireFeature } from '../config/features.js';

router.use(requireFeature('WISHLIST_API'));
```

### Job Processor Registration

Job processors only register if their feature is enabled:

```typescript
if (isFeatureEnabled('PRICE_TRACKING')) {
  priceTrackerQueue.process(async (job) => {
    await processPriceTracker(job);
  });
}
```

### Conditional Route Registration

Routes are registered only if features are enabled:

```typescript
if (isFeatureEnabled('BULL_BOARD_DASHBOARD')) {
  app.use('/admin/queues', bullBoardRouter);
}
```

---

## New API Endpoints (Phase 1B)

### Wishlist API

**Requires:** `FEATURE_WISHLIST_API=true` (default)

```bash
# Save deal to wishlist
POST /api/wishlist
{
  "dealId": "uuid",
  "notes": "optional notes"
}

# Get user's wishlist
GET /api/wishlist?limit=20&offset=0

# Check if deal is in wishlist
GET /api/wishlist/check/:dealId

# Update wishlist notes
PATCH /api/wishlist/:dealId
{
  "notes": "updated notes"
}

# Remove from wishlist
DELETE /api/wishlist/:dealId
```

### Price History API

**Requires:** `FEATURE_PRICE_HISTORY_API=true` (default)

```bash
# Get price history
GET /api/price-history/deals/:dealId?days=30

# Manually record price (admin)
POST /api/price-history/deals/:dealId
{
  "price": 299900,  # in paise (₹2999.00)
  "originalPrice": 499900,
  "merchant": "Amazon",
  "source": "manual"
}
```

### Price Alerts API

**Requires:** `FEATURE_PRICE_ALERTS_API=true` (default)

```bash
# Create price alert
POST /api/price-history/deals/:dealId/alerts
{
  "targetPrice": 250000  # in paise (₹2500.00)
}

# Get user's price alerts
GET /api/price-history/alerts?active=true

# Update price alert
PATCH /api/price-history/alerts/:alertId
{
  "targetPrice": 200000,
  "isActive": true
}

# Delete price alert
DELETE /api/price-history/alerts/:alertId
```

### Coupons API

**Requires:** `FEATURE_COUPONS_API=true` (default)

```bash
# Search coupons
GET /api/coupons?merchant=Amazon&verified=true&active=true

# Search by merchant name
GET /api/coupons/search?merchant=Flipkart

# Submit new coupon
POST /api/coupons
{
  "code": "SAVE20",
  "merchant": "Amazon",
  "description": "Get 20% off on electronics",
  "discountType": "percentage",
  "discountValue": 20,
  "minPurchase": 50000,  # ₹500
  "maxDiscount": 100000,  # ₹1000
  "expiresAt": "2025-12-31T23:59:59Z"
}

# Verify coupon (mark as working/not working)
PUT /api/coupons/:couponId/verify
{
  "worked": true,
  "feedback": "Worked perfectly on electronics"
}

# Get coupon statistics
GET /api/coupons/:couponId/stats

# Delete coupon
DELETE /api/coupons/:couponId
```

---

## Testing Feature Flags

### Test Scenario 1: Disable Wishlist

```bash
# 1. Add to .env
echo "FEATURE_WISHLIST_API=false" >> backend/.env

# 2. Restart server
npm run dev

# 3. Try to access wishlist
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/wishlist

# Expected: 503 Service Unavailable
```

### Test Scenario 2: Disable Job Queues

```bash
# 1. Add to .env
echo "FEATURE_BULL_QUEUES=false" >> backend/.env

# 2. Restart server
npm run dev

# 3. Check logs - no job processors should register
# Expected output:
# ✅ Enabled (9): PRICE_TRACKING, ..., WISHLIST_API, ...
# ❌ Disabled (14): BULL_QUEUES, ...
# (No job processor registration logs)
```

### Test Scenario 3: Enable Future Feature

```bash
# 1. Add to .env
echo "FEATURE_CASHBACK_DISPLAY=true" >> backend/.env

# 2. Restart server
npm run dev

# 3. Check logs
# Expected: CASHBACK_DISPLAY in enabled list
```

---

## Production Recommendations

### Gradual Rollout Strategy

1. **Test in Development**
   ```bash
   FEATURE_NEW_FEATURE=true npm run dev
   ```

2. **Enable in Staging**
   ```bash
   # In staging .env
   FEATURE_NEW_FEATURE=true
   ```

3. **Canary Release (10% of users)**
   - Use feature flag service (LaunchDarkly, Unleash, etc.)
   - Or environment-based routing

4. **Full Production Rollout**
   ```bash
   # In production .env
   FEATURE_NEW_FEATURE=true
   ```

5. **Monitor & Rollback if Needed**
   ```bash
   # Quick rollback - just flip the flag
   FEATURE_NEW_FEATURE=false
   pm2 restart deals-backend
   ```

### Emergency Procedures

**Disable All Non-Critical Features:**

```bash
# In .env
FEATURE_BULL_QUEUES=false
FEATURE_PRICE_TRACKING=false
FEATURE_DEAL_VERIFICATION=false
FEATURE_WISHLIST_API=false
FEATURE_COUPONS_API=false

# Core features keep working:
# - User authentication
# - Deal posting/viewing
# - Search
# - Comments/voting
```

**Performance Issues? Disable Heavy Features:**

```bash
FEATURE_PRICE_TRACKING=false    # Stops hourly scraping
FEATURE_DEAL_VERIFICATION=false # Stops 6-hour checks
FEATURE_ML_RECOMMENDATIONS=false
```

---

## Helper Functions

### Check if Feature is Enabled

```typescript
import { isFeatureEnabled } from '../config/features.js';

if (isFeatureEnabled('WEBSOCKETS')) {
  // Initialize WebSocket server
}
```

### Get All Enabled Features

```typescript
import { getEnabledFeatures } from '../config/features.js';

const enabled = getEnabledFeatures();
// Returns: ['BULL_QUEUES', 'PRICE_TRACKING', ...]
```

### Protect Route with Middleware

```typescript
import { requireFeature } from '../config/features.js';

router.get('/api/new-feature',
  requireFeature('NEW_FEATURE'),
  controller.handleRequest
);
```

---

## Monitoring Feature Usage

### Log Feature Status on Startup

Automatically logged when server starts:

```
🚩 Feature Flags:
  ✅ Enabled (10): ...
  ❌ Disabled (13): ...
```

### Create Feature Status Endpoint (Optional)

```typescript
// Add to server
app.get('/api/features', (req, res) => {
  res.json({
    enabled: getEnabledFeatures(),
    disabled: getDisabledFeatures(),
  });
});
```

---

## Future Enhancements

### User-Level Feature Flags

```typescript
// Check user-specific flags
const isEnabledForUser = (userId: string, feature: string) => {
  // Check if user is in beta group
  return betaUsers.includes(userId) && isFeatureEnabled(feature);
};
```

### Percentage Rollouts

```typescript
// Enable for 10% of users
const isEnabledForPercentage = (userId: string, percentage: number) => {
  const hash = hashUserId(userId);
  return hash % 100 < percentage;
};
```

### Remote Feature Flags (LaunchDarkly/Unleash)

```typescript
import { LaunchDarkly } from 'launchdarkly-node-server-sdk';

const client = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY);

const isEnabled = await client.variation(
  'new-feature',
  { key: userId },
  false
);
```

---

## Troubleshooting

### Feature Not Working After Enabling

1. **Check .env file**
   ```bash
   cat backend/.env | grep FEATURE_
   ```

2. **Restart server**
   ```bash
   npm run dev
   # or
   pm2 restart deals-backend
   ```

3. **Check server logs**
   ```
   🚩 Feature Flags:
     ✅ Enabled (X): YOUR_FEATURE, ...
   ```

### 503 Error on API Endpoint

**Cause:** Feature flag is disabled

**Solution:** Enable the feature in `.env`:

```bash
# Find the feature name in error response
# Then enable it
FEATURE_WISHLIST_API=true
```

### Job Processor Not Running

**Cause:** `FEATURE_BULL_QUEUES=false` or specific job disabled

**Solution:** Enable required features:

```bash
FEATURE_BULL_QUEUES=true
FEATURE_PRICE_TRACKING=true  # or whichever job you need
```

---

## Summary

✅ **Benefits:**
- Enable/disable features without code changes
- Gradual rollouts and testing
- Quick rollbacks in emergencies
- Resource management
- Controlled phase releases

✅ **Current Status:**
- Phase 1: 6 features (all enabled by default)
- Phase 1B: 4 features (all enabled by default)
- Phase 2-4: 13 features (all disabled, not yet implemented)

✅ **Next Steps:**
- Implement Phase 2 features
- Add frontend feature flag integration
- Set up remote feature flag service (optional)
- Add user-level targeting (optional)

---

For more details, see:
- [/backend/src/config/features.ts](backend/src/config/features.ts) - Feature flag definitions
- [/IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Full implementation docs
- [/PHASE_1_COMPLETE.md](PHASE_1_COMPLETE.md) - Phase 1 completion summary
