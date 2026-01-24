import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // in milliseconds
  onIdle: () => void;
  onActive?: () => void;
  events?: string[];
  element?: Document | Element;
  startOnMount?: boolean;
  stopOnIdle?: boolean;
}

export const useIdleTimer = ({
  timeout,
  onIdle,
  onActive,
  events = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown'
  ],
  element,
  startOnMount = true,
  stopOnIdle = false
}: UseIdleTimerOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);
  const lastActiveRef = useRef(Date.now());

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isIdleRef.current) {
      isIdleRef.current = false;
      onActive?.();
    }

    lastActiveRef.current = Date.now();

    timeoutRef.current = setTimeout(() => {
      isIdleRef.current = true;
      onIdle();
    }, timeout);
  }, [timeout, onIdle, onActive]);

  const pause = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (!timeoutRef.current && !isIdleRef.current) {
      reset();
    }
  }, [reset]);

  const start = useCallback(() => {
    reset();
  }, [reset]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isIdleRef.current = false;
  }, []);

  const getRemainingTime = useCallback(() => {
    if (isIdleRef.current) return 0;
    return Math.max(0, timeout - (Date.now() - lastActiveRef.current));
  }, [timeout]);

  const getElapsedTime = useCallback(() => {
    return Date.now() - lastActiveRef.current;
  }, []);

  const isIdle = useCallback(() => {
    return isIdleRef.current;
  }, []);

  const getLastActiveTime = useCallback(() => {
    return lastActiveRef.current;
  }, []);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const targetElement = element || document;

    const handleActivity = () => {
      if (!stopOnIdle || !isIdleRef.current) {
        reset();
      }
    };

    if (targetElement && events.length > 0) {
      events.forEach(event => {
        targetElement.addEventListener(event, handleActivity, true);
      });
    }

    if (startOnMount) {
      start();
    }

    return () => {
      if (targetElement && events.length > 0) {
        events.forEach(event => {
          targetElement.removeEventListener(event, handleActivity, true);
        });
      }
      stop();
    };
  }, [element, events, reset, start, stop, startOnMount, stopOnIdle]);

  return {
    start,
    stop,
    reset,
    pause,
    resume,
    getRemainingTime,
    getElapsedTime,
    isIdle,
    getLastActiveTime
  };
};