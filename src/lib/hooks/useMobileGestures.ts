// New file: Mobile gestures hook for swipe and pinch-to-zoom

"use client";

import { useRef, useEffect, useCallback } from 'react';

interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onDoubleTap?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export function useMobileGestures(
  elementRef: React.RefObject<HTMLElement>,
  handlers: GestureHandlers,
  options = {
    swipeThreshold: 50,
    swipeVelocity: 0.3,
    doubleTapDelay: 300
  }
) {
  const touchStart = useRef<TouchPoint | null>(null);
  const lastTap = useRef<number>(0);
  const initialPinchDistance = useRef<number | null>(null);

  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };

      // Check for double tap
      const currentTime = Date.now();
      if (currentTime - lastTap.current < options.doubleTapDelay) {
        handlers.onDoubleTap?.();
      }
      lastTap.current = currentTime;
    } else if (e.touches.length === 2) {
      initialPinchDistance.current = getDistance(e.touches);
    }
  }, [handlers, options.doubleTapDelay]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current) {
      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / initialPinchDistance.current;
      handlers.onPinchZoom?.(scale);
    }
  }, [handlers]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    };

    const dx = touchEnd.x - touchStart.current.x;
    const dy = touchEnd.y - touchStart.current.y;
    const dt = touchEnd.time - touchStart.current.time;

    const velocity = Math.abs(dx) / dt;
    const distance = Math.abs(dx);

    // Detect horizontal swipe
    if (distance > options.swipeThreshold && velocity > options.swipeVelocity) {
      if (dx > 0) {
        handlers.onSwipeRight?.();
      } else {
        handlers.onSwipeLeft?.();
      }
    }

    // Detect vertical swipe
    if (Math.abs(dy) > options.swipeThreshold && Math.abs(dy) > Math.abs(dx)) {
      if (dy > 0) {
        handlers.onSwipeDown?.();
      } else {
        handlers.onSwipeUp?.();
      }
    }

    touchStart.current = null;
    initialPinchDistance.current = null;
  }, [handlers, options]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isTouching: touchStart.current !== null
  };
}
