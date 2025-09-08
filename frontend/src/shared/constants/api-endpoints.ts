// shared/src/constants/api-endpoints.ts
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REGISTER: '/api/v1/auth/register',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
    ENABLE_2FA: '/api/v1/auth/enable-2fa',
    DISABLE_2FA: '/api/v1/auth/disable-2fa',
    VERIFY_2FA: '/api/v1/auth/verify-2fa'
  },
  
  // User endpoints
  USERS: {
    BASE: '/api/v1/users',
    PROFILE: '/api/v1/users/profile',
    UPDATE_PROFILE: '/api/v1/users/profile',
    SEARCH: '/api/v1/users/search',
    INVITE: '/api/v1/users/invite',
    BULK_INVITE: '/api/v1/users/bulk-invite',
    PREFERENCES: '/api/v1/users/preferences',
    AVATAR: '/api/v1/users/avatar',
    BY_ID: (id: string) => `/api/v1/users/${id}`,
    ACTIVATE: (id: string) => `/api/v1/users/${id}/activate`,
    DEACTIVATE: (id: string) => `/api/v1/users/${id}/deactivate`,
    RESET_PASSWORD: (id: string) => `/api/v1/users/${id}/reset-password`
  },
  
  // Event endpoints
  EVENTS: {
    BASE: '/api/v1/events',
    SEARCH: '/api/v1/events/search',
    MY_EVENTS: '/api/v1/events/my',
    PUBLIC: '/api/v1/events/public',
    UPCOMING: '/api/v1/events/upcoming',
    BY_ID: (id: string) => `/api/v1/events/${id}`,
    PARTICIPANTS: (id: string) => `/api/v1/events/${id}/participants`,
    ADD_PARTICIPANT: (id: string) => `/api/v1/events/${id}/participants`,
    REMOVE_PARTICIPANT: (id: string, userId: string) => `/api/v1/events/${id}/participants/${userId}`,
    QR_CODE: (id: string) => `/api/v1/events/${id}/qr-code`,
    DUPLICATE: (id: string) => `/api/v1/events/${id}/duplicate`,
    CANCEL: (id: string) => `/api/v1/events/${id}/cancel`,
    RESTORE: (id: string) => `/api/v1/events/${id}/restore`
  },
  
  // Attendance endpoints
  ATTENDANCES: {
    BASE: '/api/v1/attendances',
    MARK: '/api/v1/attendances/mark',
    VALIDATE: '/api/v1/attendances/validate',
    BULK_VALIDATE: '/api/v1/attendances/bulk-validate',
    BY_EVENT: (eventId: string) => `/api/v1/attendances/event/${eventId}`,
    BY_USER: (userId: string) => `/api/v1/attendances/user/${userId}`,
    STATISTICS: '/api/v1/attendances/statistics',
    EXPORT: '/api/v1/attendances/export',
    BY_ID: (id: string) => `/api/v1/attendances/${id}`,
    QR_SCAN: '/api/v1/attendances/qr-scan',
    GEOLOCATION: '/api/v1/attendances/geolocation'
  },
  
  // Notification endpoints
  NOTIFICATIONS: {
    BASE: '/api/v1/notifications',
    SEND: '/api/v1/notifications/send',
    MARK_READ: '/api/v1/notifications/mark-read',
    MARK_ALL_READ: '/api/v1/notifications/mark-all-read',
    PREFERENCES: '/api/v1/notifications/preferences',
    TEMPLATES: '/api/v1/notifications/templates',
    STATISTICS: '/api/v1/notifications/statistics',
    BY_ID: (id: string) => `/api/v1/notifications/${id}`,
    TEST_EMAIL: '/api/v1/notifications/test-email',
    TEST_SMS: '/api/v1/notifications/test-sms'
  },
  
  // Report endpoints
  REPORTS: {
    BASE: '/api/v1/reports',
    GENERATE: '/api/v1/reports/generate',
    ATTENDANCE_SUMMARY: '/api/v1/reports/attendance-summary',
    EVENT_DETAIL: '/api/v1/reports/event-detail',
    USER_ATTENDANCE: '/api/v1/reports/user-attendance',
    DEPARTMENT_ANALYTICS: '/api/v1/reports/department-analytics',
    MONTHLY_SUMMARY: '/api/v1/reports/monthly-summary',
    CUSTOM: '/api/v1/reports/custom',
    BY_ID: (id: string) => `/api/v1/reports/${id}`,
    DOWNLOAD: (id: string) => `/api/v1/reports/${id}/download`
  },
  
  // Admin endpoints
  ADMIN: {
    DASHBOARD: '/api/v1/admin/dashboard',
    SETTINGS: '/api/v1/admin/settings',
    AUDIT_LOGS: '/api/v1/admin/audit-logs',
    SYSTEM_INFO: '/api/v1/admin/system-info',
    SMS_PROVIDERS: '/api/v1/admin/sms-providers',
    EMAIL_PROVIDERS: '/api/v1/admin/email-providers',
    BACKUP: '/api/v1/admin/backup',
    MAINTENANCE: '/api/v1/admin/maintenance'
  }
} as const;