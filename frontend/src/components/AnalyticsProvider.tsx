import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SESSION_KEY = 'dda_session_id';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionId = sessionId + '-' + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Analytics Provider Component
 * Automatically tracks page views when wrapped around the app
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const location = useLocation();
  const pageViewIdRef = useRef<string | null>(null);
  const pageLoadTimeRef = useRef<number>(Date.now());

  /**
   * Track page view
   */
  const trackPageView = useCallback(async (path: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/analytics/pageview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          path,
          referrer: document.referrer || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        pageViewIdRef.current = data.pageViewId;
        pageLoadTimeRef.current = Date.now();
      }
    } catch (error) {
      // Silent fail - analytics shouldn't break the app
      console.debug('Analytics: Failed to track page view', error);
    }
  }, []);

  /**
   * Update page view duration when leaving
   */
  const updateDuration = useCallback(async () => {
    if (!pageViewIdRef.current) return;

    const duration = Math.round((Date.now() - pageLoadTimeRef.current) / 1000);
    if (duration < 1) return;

    try {
      // Use sendBeacon for reliable delivery on page unload
      const data = JSON.stringify({ duration });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${API_URL}/analytics/pageview/${pageViewIdRef.current}/duration`,
          new Blob([data], { type: 'application/json' })
        );
      } else {
        await fetch(`${API_URL}/analytics/pageview/${pageViewIdRef.current}/duration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true,
        });
      }
    } catch (error) {
      console.debug('Analytics: Failed to update duration', error);
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);

    // Update duration when navigating away
    return () => {
      updateDuration();
    };
  }, [location.pathname, trackPageView, updateDuration]);

  // Update duration on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateDuration();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateDuration();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateDuration]);

  return <>{children}</>;
}

/**
 * Hook for tracking custom events
 */
export function useTrackEvent() {
  const location = useLocation();

  const trackEvent = useCallback(async (
    eventType: string,
    eventName: string,
    options?: {
      dealId?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    try {
      const token = getAuthToken();
      await fetch(`${API_URL}/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: getSessionId(),
          eventType,
          eventName,
          dealId: options?.dealId,
          metadata: options?.metadata,
          path: location.pathname,
        }),
      });
    } catch (error) {
      console.debug('Analytics: Failed to track event', error);
    }
  }, [location.pathname]);

  return {
    trackEvent,
    // Convenience methods
    trackDealClick: (dealId: string, merchant?: string) =>
      trackEvent('click', 'get_deal_click', { dealId, metadata: { merchant } }),
    trackDealSave: (dealId: string) =>
      trackEvent('click', 'save_deal', { dealId }),
    trackAlertCreate: (dealId: string, targetPrice?: number) =>
      trackEvent('click', 'create_alert', { dealId, metadata: { targetPrice } }),
    trackSearch: (query: string, resultsCount?: number) =>
      trackEvent('search', 'search', { metadata: { query, resultsCount } }),
    trackShare: (dealId: string, platform?: string) =>
      trackEvent('click', 'share_deal', { dealId, metadata: { platform } }),
  };
}

export default AnalyticsProvider;
