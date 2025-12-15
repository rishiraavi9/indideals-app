/**
 * Feature flags configuration
 * Control feature availability across the application
 */

export const FEATURE_FLAGS = {
  // Ad system - disable for MVP Phase 1
  ADS_ENABLED: false as boolean,

  // Future feature flags can be added here
  // ANALYTICS_ENABLED: true,
  // SOCIAL_SHARING_ENABLED: true,
  // NOTIFICATIONS_ENABLED: true,
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 * @param feature - The feature flag to check
 * @returns boolean indicating if the feature is enabled
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURE_FLAGS[feature] === true;
}
