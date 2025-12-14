import { Capacitor } from '@capacitor/core';
// import { PushNotifications } from '@capacitor/push-notifications'; // Disabled - requires Firebase
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

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
 */
export const initializeCapacitor = async () => {
  if (!isNativePlatform()) {
    console.log('Running on web platform, skipping native initialization');
    return;
  }

  console.log(`Initializing Capacitor on ${getPlatform()}`);

  // Initialize status bar
  await initStatusBar();

  // Initialize splash screen
  await initSplashScreen();

  // Skip push notifications - requires Firebase setup
  // await initPushNotifications();

  // Initialize app state listeners
  initAppStateListeners();

  console.log('Capacitor initialization complete');
};

/**
 * Configure status bar appearance
 */
const initStatusBar = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#2563eb' }); // Blue-600
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    console.error('Error initializing status bar:', error);
  }
};

/**
 * Hide splash screen after app is ready
 */
const initSplashScreen = async () => {
  try {
    // Hide splash screen after a short delay
    setTimeout(async () => {
      await SplashScreen.hide();
    }, 1000);
  } catch (error) {
    console.error('Error hiding splash screen:', error);
  }
};

/**
 * Initialize push notifications
 * Disabled - requires Firebase setup
 */
/* const initPushNotifications = async () => {
  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token:', token.value);
        // Send token to backend
        sendPushTokenToBackend(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Listen for push notifications received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        // Show in-app notification or update UI
        showInAppNotification(notification);
      });

      // Listen for push notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
        // Navigate to relevant screen based on notification data
        handlePushNotificationAction(notification);
      });
    } else {
      console.log('Push notification permission not granted');
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
}; */

/**
 * Send push token to backend
 * Disabled - requires Firebase setup
 */
/* const sendPushTokenToBackend = async (token: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        token,
        platform: getPlatform(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to send push token to backend');
    }
  } catch (error) {
    console.error('Error sending push token:', error);
  }
}; */

/**
 * Show in-app notification (custom implementation)
 * Disabled - requires Firebase setup
 */
/* const showInAppNotification = (notification: any) => {
  // TODO: Implement custom in-app notification UI
  console.log('Showing in-app notification:', notification);
}; */

/**
 * Handle push notification action
 * Disabled - requires Firebase setup
 */
/* const handlePushNotificationAction = (notification: any) => {
  // TODO: Navigate to relevant screen based on notification.data
  console.log('Handling push notification action:', notification);

  // Example: Navigate to deal page if notification contains dealId
  if (notification.data?.dealId) {
    window.location.href = `/deal/${notification.data.dealId}`;
  }
}; */

/**
 * Initialize app state listeners (pause/resume)
 */
const initAppStateListeners = () => {
  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Active:', isActive);

    if (isActive) {
      // App came to foreground - refresh data
      console.log('App resumed');
    } else {
      // App went to background - save state
      console.log('App paused');
    }
  });

  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      // Exit app on back button when at root
      App.exitApp();
    } else {
      // Navigate back
      window.history.back();
    }
  });
};

/**
 * Share content using native share dialog
 */
export const shareContent = async (options: {
  title: string;
  text: string;
  url: string;
}) => {
  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: 'Share this deal',
    });
  } catch (error) {
    console.error('Error sharing content:', error);
    // Fallback to Web Share API if on web
    if ('share' in navigator) {
      await navigator.share(options);
    }
  }
};

/**
 * Trigger haptic feedback
 */
export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isNativePlatform()) return;

  try {
    const impactStyle =
      style === 'light'
        ? ImpactStyle.Light
        : style === 'heavy'
        ? ImpactStyle.Heavy
        : ImpactStyle.Medium;

    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    console.error('Error triggering haptic:', error);
  }
};

/**
 * Vibrate device (alternative to haptics)
 */
export const vibrate = async (duration: number = 200) => {
  if (!isNativePlatform()) {
    // Fallback to web vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
    return;
  }

  try {
    await Haptics.vibrate({ duration });
  } catch (error) {
    console.error('Error vibrating:', error);
  }
};

/**
 * Get app info (version, build number)
 */
export const getAppInfo = async () => {
  try {
    const info = await App.getInfo();
    return {
      version: info.version,
      build: info.build,
      platform: getPlatform(),
    };
  } catch (error) {
    console.error('Error getting app info:', error);
    return null;
  }
};

/**
 * Exit the app (Android only)
 */
export const exitApp = () => {
  if (getPlatform() === 'android') {
    App.exitApp();
  }
};
