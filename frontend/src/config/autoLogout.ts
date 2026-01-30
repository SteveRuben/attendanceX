/**
 * Auto-logout configuration
 */

export const AUTO_LOGOUT_CONFIG = {
  // Session timeout in milliseconds (3 minutes)
  TIMEOUT: 3 * 60 * 1000,
  
  // Warning time before logout in milliseconds (30 seconds)
  WARNING_TIME: 30 * 1000,
  
  // Whether auto-logout is enabled
  ENABLED: true,
  
  // Routes where auto-logout should be disabled
  EXCLUDED_ROUTES: [
    '/auth/login',
    '/auth/register', 
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/', // Landing page
  ],
  
  // Events that should reset the idle timer
  ACTIVITY_EVENTS: [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown',
    'wheel'
  ]
} as const;

/**
 * Get timeout in different units
 */
export const getTimeout = () => ({
  milliseconds: AUTO_LOGOUT_CONFIG.TIMEOUT,
  seconds: AUTO_LOGOUT_CONFIG.TIMEOUT / 1000,
  minutes: AUTO_LOGOUT_CONFIG.TIMEOUT / (1000 * 60)
});

/**
 * Get warning time in different units  
 */
export const getWarningTime = () => ({
  milliseconds: AUTO_LOGOUT_CONFIG.WARNING_TIME,
  seconds: AUTO_LOGOUT_CONFIG.WARNING_TIME / 1000,
  minutes: AUTO_LOGOUT_CONFIG.WARNING_TIME / (1000 * 60)
});

/**
 * Check if a route should be excluded from auto-logout
 */
export const isExcludedRoute = (pathname: string): boolean => {
  return AUTO_LOGOUT_CONFIG.EXCLUDED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
};