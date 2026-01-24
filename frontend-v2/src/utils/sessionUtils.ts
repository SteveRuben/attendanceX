/**
 * Session management utilities
 */

/**
 * Get session expiry reason from URL params
 */
export const getSessionExpiryReason = (searchParams: URLSearchParams): string | null => {
  const reason = searchParams.get('reason');
  
  switch (reason) {
    case 'session_expired':
      return 'Your session has expired due to inactivity. Please log in again.';
    case 'token_invalid':
      return 'Your session is no longer valid. Please log in again.';
    case 'manual_logout':
      return 'You have been logged out successfully.';
    default:
      return null;
  }
};

/**
 * Format remaining time for display
 */
export const formatRemainingTime = (seconds: number): string => {
  if (seconds <= 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get time-based greeting message for session warnings
 */
export const getSessionWarningMessage = (remainingSeconds: number): string => {
  if (remainingSeconds <= 10) {
    return 'Your session will expire very soon!';
  } else if (remainingSeconds <= 30) {
    return 'Your session is about to expire.';
  } else {
    return 'Your session will expire soon due to inactivity.';
  }
};

/**
 * Check if user should see session warning based on remaining time
 */
export const shouldShowSessionWarning = (remainingSeconds: number, warningThreshold: number): boolean => {
  return remainingSeconds > 0 && remainingSeconds <= warningThreshold;
};

/**
 * Log session events for debugging
 */
export const logSessionEvent = (event: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 Session: ${event}`, data || '');
  }
};