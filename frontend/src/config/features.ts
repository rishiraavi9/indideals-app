/**
 * Feature flags and app configuration
 * Fetches config from backend API for server-controlled settings
 */

export type ImageStrategy = 'placeholder' | 'merchant-fallback' | 'proxy-cache';

export interface AppConfig {
  // Feature flags
  adsEnabled: boolean;
  imageFallbackEnabled: boolean;
  imageProxyEnabled: boolean;

  // Config values
  imageStrategy: ImageStrategy;
}

// Default config (used before API response)
const defaultConfig: AppConfig = {
  adsEnabled: true,
  imageFallbackEnabled: true,
  imageProxyEnabled: true,
  imageStrategy: 'placeholder',
};

// Cached config
let cachedConfig: AppConfig = { ...defaultConfig };
let configLoaded = false;

/**
 * Fetch config from backend API
 */
export async function loadConfig(): Promise<AppConfig> {
  if (configLoaded) return cachedConfig;

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/config`);

    if (response.ok) {
      const data = await response.json();
      cachedConfig = {
        adsEnabled: data.features?.adsEnabled ?? defaultConfig.adsEnabled,
        imageFallbackEnabled: data.features?.imageFallbackEnabled ?? defaultConfig.imageFallbackEnabled,
        imageProxyEnabled: data.features?.imageProxyEnabled ?? defaultConfig.imageProxyEnabled,
        imageStrategy: data.features?.imageStrategy ?? defaultConfig.imageStrategy,
      };
      configLoaded = true;
    }
  } catch (error) {
    console.warn('Failed to load config from API, using defaults:', error);
  }

  return cachedConfig;
}

/**
 * Get current config (sync - returns cached or default)
 */
export function getConfig(): AppConfig {
  return cachedConfig;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof Omit<AppConfig, 'imageStrategy'>): boolean {
  return cachedConfig[feature] === true;
}

/**
 * Get image strategy
 */
export function getImageStrategy(): ImageStrategy {
  return cachedConfig.imageStrategy;
}

// Legacy exports for backwards compatibility
export const FEATURE_FLAGS = {
  get ADS_ENABLED() {
    return cachedConfig.adsEnabled;
  },
};

export type FeatureFlag = 'ADS_ENABLED';

// Auto-load config on module import
loadConfig();
