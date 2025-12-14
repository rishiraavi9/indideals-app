/**
 * Feature Flags Configuration
 *
 * This file controls which features are enabled/disabled at runtime.
 * Each feature can be toggled via environment variables without code changes.
 *
 * Usage:
 * - Set FEATURE_<NAME>=true in .env to enable a feature
 * - Set FEATURE_<NAME>=false to disable
 * - Omit the variable to use the default value
 */

export interface FeatureFlags {
  // Phase 1: Job Queue Infrastructure
  BULL_QUEUES: boolean;
  PRICE_TRACKING: boolean;
  DEAL_VERIFICATION: boolean;
  EMAIL_ALERTS: boolean;
  DATABASE_CLEANUP: boolean;
  BULL_BOARD_DASHBOARD: boolean;

  // Phase 1B: API Endpoints
  WISHLIST_API: boolean;
  PRICE_HISTORY_API: boolean;
  COUPONS_API: boolean;
  PRICE_ALERTS_API: boolean;

  // Phase 2: User Experience
  BROWSER_EXTENSION_API: boolean;
  PWA_FEATURES: boolean;
  PUSH_NOTIFICATIONS: boolean;
  CASHBACK_DISPLAY: boolean;

  // Phase 3: Advanced Features
  WEBSOCKETS: boolean;
  MERCHANT_SCRAPERS: boolean;
  ML_RECOMMENDATIONS: boolean;
  ADMIN_DASHBOARD: boolean;
  REAL_TIME_UPDATES: boolean;

  // Phase 4: Scale & Performance
  ADVANCED_CACHING: boolean;
  CDN_INTEGRATION: boolean;
  RATE_LIMITING_ADVANCED: boolean;
  MONITORING: boolean;
}

const toBool = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const features: FeatureFlags = {
  // Phase 1: Job Queue Infrastructure (COMPLETED - Default: Enabled)
  BULL_QUEUES: toBool(process.env.FEATURE_BULL_QUEUES, true),
  PRICE_TRACKING: toBool(process.env.FEATURE_PRICE_TRACKING, true),
  DEAL_VERIFICATION: toBool(process.env.FEATURE_DEAL_VERIFICATION, true),
  EMAIL_ALERTS: toBool(process.env.FEATURE_EMAIL_ALERTS, true),
  DATABASE_CLEANUP: toBool(process.env.FEATURE_DATABASE_CLEANUP, true),
  BULL_BOARD_DASHBOARD: toBool(process.env.FEATURE_BULL_BOARD_DASHBOARD, true),

  // Phase 1B: API Endpoints (IN PROGRESS - Default: Enabled for development)
  WISHLIST_API: toBool(process.env.FEATURE_WISHLIST_API, true),
  PRICE_HISTORY_API: toBool(process.env.FEATURE_PRICE_HISTORY_API, true),
  COUPONS_API: toBool(process.env.FEATURE_COUPONS_API, true),
  PRICE_ALERTS_API: toBool(process.env.FEATURE_PRICE_ALERTS_API, true),

  // Phase 2: User Experience (NOT IMPLEMENTED - Default: Disabled)
  BROWSER_EXTENSION_API: toBool(process.env.FEATURE_BROWSER_EXTENSION_API, false),
  PWA_FEATURES: toBool(process.env.FEATURE_PWA_FEATURES, false),
  PUSH_NOTIFICATIONS: toBool(process.env.FEATURE_PUSH_NOTIFICATIONS, false),
  CASHBACK_DISPLAY: toBool(process.env.FEATURE_CASHBACK_DISPLAY, false),

  // Phase 3: Advanced Features (NOT IMPLEMENTED - Default: Disabled)
  WEBSOCKETS: toBool(process.env.FEATURE_WEBSOCKETS, false),
  MERCHANT_SCRAPERS: toBool(process.env.FEATURE_MERCHANT_SCRAPERS, false),
  ML_RECOMMENDATIONS: toBool(process.env.FEATURE_ML_RECOMMENDATIONS, false),
  ADMIN_DASHBOARD: toBool(process.env.FEATURE_ADMIN_DASHBOARD, false),
  REAL_TIME_UPDATES: toBool(process.env.FEATURE_REAL_TIME_UPDATES, false),

  // Phase 4: Scale & Performance (NOT IMPLEMENTED - Default: Disabled)
  ADVANCED_CACHING: toBool(process.env.FEATURE_ADVANCED_CACHING, false),
  CDN_INTEGRATION: toBool(process.env.FEATURE_CDN_INTEGRATION, false),
  RATE_LIMITING_ADVANCED: toBool(process.env.FEATURE_RATE_LIMITING_ADVANCED, false),
  MONITORING: toBool(process.env.FEATURE_MONITORING, false),
};

/**
 * Helper function to check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return features[feature];
};

/**
 * Helper function to get all enabled features
 */
export const getEnabledFeatures = (): string[] => {
  return Object.entries(features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
};

/**
 * Helper function to get all disabled features
 */
export const getDisabledFeatures = (): string[] => {
  return Object.entries(features)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
};

/**
 * Middleware to check if a feature is enabled before processing request
 */
export const requireFeature = (feature: keyof FeatureFlags) => {
  return (req: any, res: any, next: any) => {
    if (!isFeatureEnabled(feature)) {
      return res.status(503).json({
        error: 'Feature not available',
        message: `The ${feature} feature is currently disabled. Contact support if you believe this is an error.`,
        feature,
      });
    }
    next();
  };
};

/**
 * Log feature flags on startup
 */
export const logFeatureFlags = () => {
  const enabled = getEnabledFeatures();
  const disabled = getDisabledFeatures();

  console.log('\n🚩 Feature Flags:');
  console.log(`  ✅ Enabled (${enabled.length}):`, enabled.join(', '));
  if (disabled.length > 0) {
    console.log(`  ❌ Disabled (${disabled.length}):`, disabled.join(', '));
  }
  console.log('');
};
