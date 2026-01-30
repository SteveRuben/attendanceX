import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useIdleTimer } from './useIdleTimer';
import { AUTO_LOGOUT_CONFIG, isExcludedRoute } from '@/config/autoLogout';

interface UseAutoLogoutOptions {
  timeout?: number; // in milliseconds, default 3 minutes
  warningTime?: number; // in milliseconds, default 30 seconds before logout
  enabled?: boolean;
  excludeRoutes?: string[]; // routes where auto-logout should be disabled
}

export const useAutoLogout = ({
  timeout = AUTO_LOGOUT_CONFIG.TIMEOUT,
  warningTime = AUTO_LOGOUT_CONFIG.WARNING_TIME,
  enabled = AUTO_LOGOUT_CONFIG.ENABLED,
  excludeRoutes = AUTO_LOGOUT_CONFIG.EXCLUDED_ROUTES
}: UseAutoLogoutOptions = {}) => {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Check if current route should be excluded
  const shouldExclude = useCallback(() => {
    return isExcludedRoute(router.pathname) || 
           excludeRoutes.some(route => router.pathname.startsWith(route));
  }, [router.pathname, excludeRoutes]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    try {
      console.log('🔒 Auto-logout: Session expired due to inactivity');
      await logout();
      router.push('/auth/login?reason=session_expired');
    } catch (error) {
      console.error('Auto-logout error:', error);
      // Force redirect even if logout fails
      router.push('/auth/login?reason=session_expired');
    }
  }, [logout, router]);

  // Handle idle state
  const handleIdle = useCallback(() => {
    if (!enabled || !isAuthenticated || shouldExclude()) {
      return;
    }
    
    console.log('🕐 User idle detected, logging out...');
    handleLogout();
  }, [enabled, isAuthenticated, shouldExclude, handleLogout]);

  // Handle activity (user is active again)
  const handleActive = useCallback(() => {
    setShowWarning(false);
    setRemainingTime(0);
    console.log('👆 User activity detected, resetting idle timer');
  }, []);

  // Initialize idle timer
  const {
    getRemainingTime,
    reset: resetTimer,
    pause: pauseTimer,
    resume: resumeTimer,
    isIdle
  } = useIdleTimer({
    timeout,
    onIdle: handleIdle,
    onActive: handleActive,
    events: AUTO_LOGOUT_CONFIG.ACTIVITY_EVENTS,
    startOnMount: enabled && isAuthenticated && !shouldExclude()
  });

  // Warning timer effect
  useEffect(() => {
    if (!enabled || !isAuthenticated || shouldExclude()) {
      return;
    }

    const warningInterval = setInterval(() => {
      const remaining = getRemainingTime();
      
      if (remaining <= warningTime && remaining > 0) {
        if (!showWarning) {
          console.log(`⚠️ Session warning: ${Math.ceil(remaining / 1000)}s remaining`);
        }
        setShowWarning(true);
        setRemainingTime(remaining);
      } else if (remaining <= 0) {
        setShowWarning(false);
        setRemainingTime(0);
      } else {
        setShowWarning(false);
        setRemainingTime(0);
      }
    }, 1000);

    return () => clearInterval(warningInterval);
  }, [enabled, isAuthenticated, shouldExclude, getRemainingTime, warningTime, showWarning]);

  // Pause/resume timer based on route changes
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      pauseTimer();
      return;
    }

    if (shouldExclude()) {
      console.log('⏸️ Auto-logout paused for excluded route:', router.pathname);
      pauseTimer();
    } else {
      console.log('▶️ Auto-logout resumed for route:', router.pathname);
      resumeTimer();
    }
  }, [enabled, isAuthenticated, shouldExclude, pauseTimer, resumeTimer, router.pathname]);

  // Extend session (reset timer)
  const extendSession = useCallback(() => {
    console.log('🔄 Session extended by user');
    resetTimer();
    setShowWarning(false);
    setRemainingTime(0);
  }, [resetTimer]);

  // Manual logout
  const logoutNow = useCallback(() => {
    console.log('🚪 Manual logout from auto-logout warning');
    handleLogout();
  }, [handleLogout]);

  return {
    showWarning,
    remainingTime: Math.ceil(remainingTime / 1000), // return in seconds
    extendSession,
    logoutNow,
    isIdle: isIdle()
  };
};