import { Capacitor } from '@capacitor/core';

/**
 * Check if running on native platform (iOS/Android)
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get current platform
 */
export const getPlatform = () => {
  return Capacitor.getPlatform(); // 'ios', 'android', or 'web'
};

/**
 * Initialize Capacitor plugins and native features
 * Note: Native plugins have been disabled due to compatibility issues
 */
export const initializeCapacitor = async () => {
  if (!isNativePlatform()) {
    console.log('Running on web platform, skipping native initialization');
    return;
  }

  console.log(`Initializing Capacitor on ${getPlatform()}`);
  console.log('Capacitor initialization complete');
};

/**
 * Share content using native share dialog or Web Share API
 */
export const shareContent = async (options: {
  title: string;
  text: string;
  url: string;
}) => {
  try {
    // Use Web Share API (works on web and native)
    if (navigator.share) {
      await navigator.share(options);
    } else if (navigator.clipboard) {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${options.title}\n${options.text}\n${options.url}`);
      alert('Link copied to clipboard!');
    }
  } catch (error) {
    console.error('Error sharing content:', error);
  }
};

/**
 * Trigger haptic feedback (uses web vibration API as fallback)
 */
export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  try {
    // Use web vibration API as fallback
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 10 : style === 'heavy' ? 50 : 25;
      navigator.vibrate(duration);
    }
  } catch (error) {
    console.error('Error triggering haptic:', error);
  }
};

/**
 * Vibrate device using web API
 */
export const vibrate = async (duration: number = 200) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch (error) {
    console.error('Error vibrating:', error);
  }
};

/**
 * Get app info (version, build number)
 */
export const getAppInfo = async () => {
  return {
    version: '1.0.0',
    build: '1',
    platform: getPlatform(),
  };
};

/**
 * Exit the app (Android only - uses history.back as fallback)
 */
export const exitApp = () => {
  if (getPlatform() === 'android') {
    // On Android, going back from the first page will exit the app
    window.history.back();
  }
};
