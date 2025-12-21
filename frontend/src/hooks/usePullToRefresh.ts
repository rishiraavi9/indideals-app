import { useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  containerRef: RefObject<HTMLElement | null>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  containerRef,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only enable pull-to-refresh when at top of page
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // Only pull down, not up
    if (diff > 0 && window.scrollY <= 0) {
      // Apply resistance
      const progress = Math.min(diff * 0.5, maxPull);
      setPullProgress(progress);

      // Prevent default scroll when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing, startY, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullProgress >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullProgress(threshold);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullProgress(0);
      }
    } else {
      setPullProgress(0);
    }
  }, [isPulling, pullProgress, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current || document;

    container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener);
      container.removeEventListener('touchmove', handleTouchMove as EventListener);
      container.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullProgress,
    isPulling,
  };
}
