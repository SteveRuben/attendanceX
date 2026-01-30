import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AUTO_LOGOUT_CONFIG } from '@/config/autoLogout';

interface SessionStatus {
  isActive: boolean;
  remainingTime: number; // in seconds
  totalTime: number; // in seconds
  percentageRemaining: number; // 0-100
  isWarning: boolean; // true when in warning period
  timeUntilWarning: number; // seconds until warning shows
}

export const useSessionStatus = () => {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SessionStatus>({
    isActive: false,
    remainingTime: 0,
    totalTime: AUTO_LOGOUT_CONFIG.TIMEOUT / 1000,
    percentageRemaining: 100,
    isWarning: false,
    timeUntilWarning: 0
  });

  const [lastActivity, setLastActivity] = useState(Date.now());

  // Update last activity time on user interaction
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Listen to the same events as the idle timer
    AUTO_LOGOUT_CONFIG.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      AUTO_LOGOUT_CONFIG.ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Update status every second
  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(prev => ({ ...prev, isActive: false }));
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = Math.max(0, AUTO_LOGOUT_CONFIG.TIMEOUT - elapsed);
      const remainingSeconds = Math.ceil(remaining / 1000);
      const totalSeconds = AUTO_LOGOUT_CONFIG.TIMEOUT / 1000;
      const warningSeconds = AUTO_LOGOUT_CONFIG.WARNING_TIME / 1000;
      
      setStatus({
        isActive: remaining > 0,
        remainingTime: remainingSeconds,
        totalTime: totalSeconds,
        percentageRemaining: (remaining / AUTO_LOGOUT_CONFIG.TIMEOUT) * 100,
        isWarning: remainingSeconds <= warningSeconds && remainingSeconds > 0,
        timeUntilWarning: Math.max(0, remainingSeconds - warningSeconds)
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity]);

  return status;
};