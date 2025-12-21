import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

interface HapticsAPI {
  impact: (options: { style: string }) => Promise<void>;
  notification: (options: { type: string }) => Promise<void>;
  selectionStart: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  selectionEnd: () => Promise<void>;
}

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins: {
        Haptics?: HapticsAPI;
      };
    };
  }
}

export function useHaptics() {
  const triggerHaptic = useCallback(async (style: HapticStyle = 'light') => {
    try {
      // Try Capacitor Haptics first (native app)
      if (window.Capacitor?.isNativePlatform?.() && window.Capacitor?.Plugins?.Haptics) {
        const haptics = window.Capacitor.Plugins.Haptics;

        switch (style) {
          case 'light':
            await haptics.impact({ style: 'light' });
            break;
          case 'medium':
            await haptics.impact({ style: 'medium' });
            break;
          case 'heavy':
            await haptics.impact({ style: 'heavy' });
            break;
          case 'selection':
            await haptics.selectionStart();
            await haptics.selectionChanged();
            await haptics.selectionEnd();
            break;
          case 'success':
            await haptics.notification({ type: 'success' });
            break;
          case 'warning':
            await haptics.notification({ type: 'warning' });
            break;
          case 'error':
            await haptics.notification({ type: 'error' });
            break;
        }
        return;
      }

      // Fallback to Web Vibration API
      if ('vibrate' in navigator) {
        switch (style) {
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(20);
            break;
          case 'heavy':
            navigator.vibrate(30);
            break;
          case 'selection':
            navigator.vibrate([5, 5, 5]);
            break;
          case 'success':
            navigator.vibrate([10, 50, 10]);
            break;
          case 'warning':
            navigator.vibrate([20, 30, 20]);
            break;
          case 'error':
            navigator.vibrate([30, 20, 30, 20, 30]);
            break;
        }
      }
    } catch (error) {
      // Haptics not supported, fail silently
      console.debug('Haptics not available:', error);
    }
  }, []);

  const selectionFeedback = useCallback(async () => {
    await triggerHaptic('selection');
  }, [triggerHaptic]);

  const impactFeedback = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    await triggerHaptic(style);
  }, [triggerHaptic]);

  const notificationFeedback = useCallback(async (type: 'success' | 'warning' | 'error') => {
    await triggerHaptic(type);
  }, [triggerHaptic]);

  return {
    triggerHaptic,
    selectionFeedback,
    impactFeedback,
    notificationFeedback,
  };
}
