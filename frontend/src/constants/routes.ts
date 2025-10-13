export enum NavigationKey {
  DASHBOARD = 'dashboard',
  ATTENDANCE = 'attendance',
  QR_CHECKIN = 'qr_checkin',
  EVENTS = 'events',
  EVENTS_DASHBOARD = 'events_dashboard',
  EVENTS_CALENDAR = 'events_calendar',
  CREATE_EVENT = 'create_event',
  EVENT_DETAILS = 'event_details',
  EDIT_EVENT = 'edit_event',
  CAMPAIGNS = 'campaigns',
  TEMPLATES = 'templates',
  ANALYTICS = 'analytics',
  MANAGER = 'manager',
  ADMIN = 'admin',
  USERS = 'users',
  INTEGRATIONS = 'integrations',
  REPORTS = 'reports',
  ML_DASHBOARD = 'ml_dashboard',
  CAMPAIGN_NEW = 'campaign_new',
  CAMPAIGN_EDIT = 'campaign_edit',
  CAMPAIGN_ANALYTICS = 'campaign_analytics',
  CAMPAIGN_ADVANCED_ANALYTICS = 'campaign_advanced_analytics',
  CAMPAIGN_UNSUBSCRIBE = 'campaign_unsubscribe',
  CAMPAIGN_AUTOMATION = 'campaign_automation',
  CAMPAIGN_SETTINGS = 'campaign_settings',
  CAMPAIGN_COMPLIANCE = 'campaign_compliance',
  TEMPLATE_NEW = 'template_new',
  TEMPLATE_EDIT = 'template_edit',
}

export const ROUTES = {
  DASHBOARD: '/dashboard',
  ATTENDANCE: '/presence',
  QR_CHECKIN: '/presence/qr',

  EVENTS: '/events',
  EVENTS_DASHBOARD: '/events/dashboard',
  EVENTS_CALENDAR: '/events/calendar',
  EVENTS_CREATE: '/events/create',
  EVENTS_DETAILS: (id: string) => `/events/${id}`,
  EVENTS_DETAILS_PATTERN: '/events/:id',
  EVENTS_EDIT: (id: string) => `/events/${id}/edit`,
  EVENTS_EDIT_PATTERN: '/events/:id/edit',

  CAMPAIGNS: '/campaigns',
  CAMPAIGNS_NEW: '/campaigns/new',
  CAMPAIGNS_EDIT: (id: string) => `/campaigns/${id}/edit`,
  CAMPAIGNS_EDIT_PATTERN: '/campaigns/:campaignId/edit',
  CAMPAIGNS_ANALYTICS_OVERVIEW: '/campaigns/analytics',
  CAMPAIGNS_ANALYTICS: (id: string) => `/campaigns/${id}/analytics`,
  CAMPAIGNS_ANALYTICS_PATTERN: '/campaigns/:campaignId/analytics',
  CAMPAIGNS_ADVANCED_ANALYTICS: '/campaigns/advanced-analytics',
  CAMPAIGNS_ADVANCED_ANALYTICS_SPECIFIC: (id: string) => `/campaigns/${id}/advanced-analytics`,
  CAMPAIGNS_ADVANCED_ANALYTICS_SPECIFIC_PATTERN: '/campaigns/:campaignId/advanced-analytics',
  CAMPAIGNS_UNSUBSCRIBE: '/campaigns/unsubscribe',
  CAMPAIGNS_AUTOMATION: '/campaigns/automation',
  CAMPAIGNS_SETTINGS: '/campaigns/settings',
  CAMPAIGNS_COMPLIANCE: '/campaigns/compliance',

  TEMPLATES: '/campaigns/templates',
  TEMPLATES_NEW: '/campaigns/templates/new',
  TEMPLATES_EDIT: (id: string) => `/campaigns/templates/${id}/edit`,
  TEMPLATES_EDIT_PATTERN: '/campaigns/templates/:templateId/edit',

  MANAGER: '/manager',
  ADMIN: '/admin',
  USERS: '/admin/users',
  INTEGRATIONS: '/integrations',
  REPORTS: '/reports',
  ML_DASHBOARD: '/analytics/ml',
} as const;

export function getNavigationKeyForRoute(pathname: string): NavigationKey | null {
  const normalizedPath = pathname.replace(/^\/organization\/[^/]+/, '');

  switch (normalizedPath) {
    case ROUTES.DASHBOARD:
      return NavigationKey.DASHBOARD;

    case ROUTES.ATTENDANCE:
      return NavigationKey.ATTENDANCE;

    case ROUTES.QR_CHECKIN:
      return NavigationKey.QR_CHECKIN;

    case ROUTES.EVENTS:
      return NavigationKey.EVENTS;
    case ROUTES.EVENTS_DASHBOARD:
      return NavigationKey.EVENTS_DASHBOARD;
    case ROUTES.EVENTS_CALENDAR:
      return NavigationKey.EVENTS_CALENDAR;
    case ROUTES.EVENTS_CREATE:
      return NavigationKey.CREATE_EVENT;
    case ROUTES.MANAGER:
      return NavigationKey.MANAGER;

    case ROUTES.ADMIN:
      return NavigationKey.ADMIN;

    case ROUTES.USERS:
      return NavigationKey.USERS;

    case ROUTES.INTEGRATIONS:
      return NavigationKey.INTEGRATIONS;

    case ROUTES.REPORTS:
      return NavigationKey.REPORTS;

    case ROUTES.ML_DASHBOARD:
      return NavigationKey.ML_DASHBOARD;

    case ROUTES.CAMPAIGNS:
    case ROUTES.CAMPAIGNS_NEW:
    case ROUTES.CAMPAIGNS_UNSUBSCRIBE:
    case ROUTES.CAMPAIGNS_AUTOMATION:
    case ROUTES.CAMPAIGNS_SETTINGS:
    case ROUTES.CAMPAIGNS_COMPLIANCE:
      return NavigationKey.CAMPAIGNS;

    case ROUTES.CAMPAIGNS_ANALYTICS_OVERVIEW:
    case ROUTES.CAMPAIGNS_ADVANCED_ANALYTICS:
      return NavigationKey.ANALYTICS;

    case ROUTES.TEMPLATES:
    case ROUTES.TEMPLATES_NEW:
      return NavigationKey.TEMPLATES;
  }

  if (pathname.match(/^\/events\/[^/]+\/edit$/)) {
    return NavigationKey.EVENTS;
  }

  if (pathname.match(/^\/events\/[^/]+$/)) {
    return NavigationKey.EVENTS;
  }

  if (normalizedPath.match(/^\/campaigns\/templates\/[^/]+\/edit$/)) {
    return NavigationKey.TEMPLATES;
  }

  if (normalizedPath.match(/^\/campaigns\/[^/]+\/advanced-analytics$/)) {
    return NavigationKey.ANALYTICS;
  }

  if (normalizedPath.match(/^\/campaigns\/[^/]+\/analytics$/)) {
    return NavigationKey.ANALYTICS;
  }

  if (normalizedPath.match(/^\/campaigns\/[^/]+\/edit$/)) {
    return NavigationKey.CAMPAIGNS;
  }

  return null;
}

