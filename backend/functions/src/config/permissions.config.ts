import { OrganizationRole } from '@attendance-x/shared';

// Définition de toutes les permissions disponibles
export const PERMISSIONS = {
  // Permissions d'organisation
  ORGANIZATION: {
    VIEW: 'VIEW_ORGANIZATION',
    UPDATE_SETTINGS: 'UPDATE_ORGANIZATION_SETTINGS',
    DELETE: 'DELETE_ORGANIZATION',
    MANAGE_BILLING: 'MANAGE_BILLING',
    VIEW_USAGE_STATS: 'VIEW_USAGE_STATS',
    EXPORT_DATA: 'EXPORT_DATA'
  },

  // Permissions de gestion des membres
  MEMBERS: {
    VIEW: 'VIEW_MEMBERS',
    INVITE: 'INVITE_MEMBERS',
    REMOVE: 'REMOVE_MEMBERS',
    UPDATE_ROLES: 'UPDATE_MEMBER_ROLES',
    MANAGE: 'MANAGE_MEMBERS'
  },

  // Permissions d'équipes
  TEAMS: {
    VIEW: 'VIEW_TEAMS',
    CREATE: 'CREATE_TEAMS',
    UPDATE: 'UPDATE_TEAMS',
    DELETE: 'DELETE_TEAMS',
    MANAGE: 'MANAGE_TEAMS',
    ASSIGN_MEMBERS: 'ASSIGN_TEAM_MEMBERS'
  },

  // Permissions d'événements
  EVENTS: {
    VIEW: 'VIEW_EVENTS',
    CREATE: 'CREATE_EVENTS',
    UPDATE: 'UPDATE_EVENTS',
    DELETE: 'DELETE_EVENTS',
    MANAGE: 'MANAGE_EVENTS',
    VIEW_ALL: 'VIEW_ALL_EVENTS'
  },

  // Permissions de rendez-vous
  APPOINTMENTS: {
    VIEW: 'VIEW_APPOINTMENTS',
    CREATE: 'CREATE_APPOINTMENTS',
    UPDATE: 'UPDATE_APPOINTMENTS',
    DELETE: 'DELETE_APPOINTMENTS',
    MANAGE: 'MANAGE_APPOINTMENTS',
    VIEW_ALL: 'VIEW_ALL_APPOINTMENTS'
  },

  // Permissions d'analytics
  ANALYTICS: {
    VIEW: 'VIEW_ANALYTICS',
    EXPORT: 'EXPORT_ANALYTICS',
    VIEW_DETAILED: 'VIEW_DETAILED_ANALYTICS'
  },

  // Permissions d'intégrations
  INTEGRATIONS: {
    VIEW: 'VIEW_INTEGRATIONS',
    MANAGE: 'MANAGE_INTEGRATIONS',
    CREATE: 'CREATE_INTEGRATIONS',
    DELETE: 'DELETE_INTEGRATIONS'
  },

  // Permissions de profil utilisateur
  PROFILE: {
    VIEW_OWN: 'VIEW_OWN_PROFILE',
    UPDATE_OWN: 'UPDATE_OWN_PROFILE',
    DELETE_OWN: 'DELETE_OWN_ACCOUNT',
    VIEW_OTHERS: 'VIEW_OTHER_PROFILES'
  },

  // Permissions de présence
  ATTENDANCE: {
    RECORD: 'RECORD_ATTENDANCE',
    VIEW_OWN: 'VIEW_OWN_ATTENDANCE',
    VIEW_ALL: 'VIEW_ALL_ATTENDANCE',
    MANAGE: 'MANAGE_ATTENDANCE'
  },

  // Permissions de notifications
  NOTIFICATIONS: {
    MANAGE: 'MANAGE_NOTIFICATIONS',
    SEND: 'SEND_NOTIFICATIONS',
    VIEW_ALL: 'VIEW_ALL_NOTIFICATIONS'
  }
} as const;

// Permissions par rôle d'organisation
export const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  [OrganizationRole.OWNER]: [
    // Le owner a TOUTES les permissions
    ...Object.values(PERMISSIONS.ORGANIZATION),
    ...Object.values(PERMISSIONS.MEMBERS),
    ...Object.values(PERMISSIONS.TEAMS),
    ...Object.values(PERMISSIONS.EVENTS),
    ...Object.values(PERMISSIONS.APPOINTMENTS),
    ...Object.values(PERMISSIONS.ANALYTICS),
    ...Object.values(PERMISSIONS.INTEGRATIONS),
    ...Object.values(PERMISSIONS.PROFILE),
    ...Object.values(PERMISSIONS.ATTENDANCE),
    ...Object.values(PERMISSIONS.NOTIFICATIONS)
  ],

  [OrganizationRole.ADMIN]: [
    // Permissions d'organisation (sauf suppression)
    PERMISSIONS.ORGANIZATION.VIEW,
    PERMISSIONS.ORGANIZATION.UPDATE_SETTINGS,
    PERMISSIONS.ORGANIZATION.VIEW_USAGE_STATS,
    PERMISSIONS.ORGANIZATION.EXPORT_DATA,

    // Gestion complète des membres
    ...Object.values(PERMISSIONS.MEMBERS),

    // Gestion complète des équipes
    ...Object.values(PERMISSIONS.TEAMS),

    // Gestion complète des événements
    ...Object.values(PERMISSIONS.EVENTS),

    // Gestion complète des rendez-vous
    ...Object.values(PERMISSIONS.APPOINTMENTS),

    // Analytics complètes
    ...Object.values(PERMISSIONS.ANALYTICS),

    // Gestion des intégrations
    ...Object.values(PERMISSIONS.INTEGRATIONS),

    // Profils
    PERMISSIONS.PROFILE.VIEW_OWN,
    PERMISSIONS.PROFILE.UPDATE_OWN,
    PERMISSIONS.PROFILE.VIEW_OTHERS,

    // Présence
    ...Object.values(PERMISSIONS.ATTENDANCE),

    // Notifications
    ...Object.values(PERMISSIONS.NOTIFICATIONS)
  ],

  [OrganizationRole.MANAGER]: [
    // Organisation (lecture seule)
    PERMISSIONS.ORGANIZATION.VIEW,

    // Membres (lecture et invitation)
    PERMISSIONS.MEMBERS.VIEW,
    PERMISSIONS.MEMBERS.INVITE,

    // Équipes (gestion complète)
    ...Object.values(PERMISSIONS.TEAMS),

    // Événements (gestion complète)
    ...Object.values(PERMISSIONS.EVENTS),

    // Rendez-vous (gestion complète)
    ...Object.values(PERMISSIONS.APPOINTMENTS),

    // Analytics (lecture)
    PERMISSIONS.ANALYTICS.VIEW,
    PERMISSIONS.ANALYTICS.EXPORT,

    // Intégrations (lecture)
    PERMISSIONS.INTEGRATIONS.VIEW,

    // Profils
    PERMISSIONS.PROFILE.VIEW_OWN,
    PERMISSIONS.PROFILE.UPDATE_OWN,
    PERMISSIONS.PROFILE.VIEW_OTHERS,

    // Présence
    PERMISSIONS.ATTENDANCE.RECORD,
    PERMISSIONS.ATTENDANCE.VIEW_OWN,
    PERMISSIONS.ATTENDANCE.VIEW_ALL,

    // Notifications
    PERMISSIONS.NOTIFICATIONS.MANAGE
  ],

  [OrganizationRole.MEMBER]: [
    // Organisation (lecture seule)
    PERMISSIONS.ORGANIZATION.VIEW,

    // Membres (lecture seule)
    PERMISSIONS.MEMBERS.VIEW,

    // Équipes (lecture et participation)
    PERMISSIONS.TEAMS.VIEW,

    // Événements (création et gestion des siens)
    PERMISSIONS.EVENTS.VIEW,
    PERMISSIONS.EVENTS.CREATE,
    PERMISSIONS.EVENTS.UPDATE,

    // Rendez-vous (création et gestion des siens)
    PERMISSIONS.APPOINTMENTS.VIEW,
    PERMISSIONS.APPOINTMENTS.CREATE,
    PERMISSIONS.APPOINTMENTS.UPDATE,

    // Intégrations (lecture)
    PERMISSIONS.INTEGRATIONS.VIEW,

    // Profils
    PERMISSIONS.PROFILE.VIEW_OWN,
    PERMISSIONS.PROFILE.UPDATE_OWN,

    // Présence
    PERMISSIONS.ATTENDANCE.RECORD,
    PERMISSIONS.ATTENDANCE.VIEW_OWN,

    // Notifications
    PERMISSIONS.NOTIFICATIONS.MANAGE
  ],

  [OrganizationRole.VIEWER]: [
    // Organisation (lecture seule)
    PERMISSIONS.ORGANIZATION.VIEW,

    // Membres (lecture seule)
    PERMISSIONS.MEMBERS.VIEW,

    // Équipes (lecture seule)
    PERMISSIONS.TEAMS.VIEW,

    // Événements (lecture seule)
    PERMISSIONS.EVENTS.VIEW,

    // Rendez-vous (lecture seule)
    PERMISSIONS.APPOINTMENTS.VIEW,

    // Profils
    PERMISSIONS.PROFILE.VIEW_OWN,
    PERMISSIONS.PROFILE.UPDATE_OWN,

    // Présence
    PERMISSIONS.ATTENDANCE.RECORD,
    PERMISSIONS.ATTENDANCE.VIEW_OWN,

    // Notifications
    PERMISSIONS.NOTIFICATIONS.MANAGE
  ]
};

// Actions critiques qui nécessitent des vérifications supplémentaires
export const CRITICAL_ACTIONS = {
  DELETE_ORGANIZATION: 'DELETE_ORGANIZATION',
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  MANAGE_BILLING: 'MANAGE_BILLING',
  CHANGE_ORGANIZATION_SETTINGS: 'CHANGE_ORGANIZATION_SETTINGS',
  REMOVE_ADMIN: 'REMOVE_ADMIN',
  EXPORT_ALL_DATA: 'EXPORT_ALL_DATA',
  BULK_DELETE_USERS: 'BULK_DELETE_USERS',
  RESET_ORGANIZATION: 'RESET_ORGANIZATION'
} as const;

// Actions qui nécessitent d'être owner
export const OWNER_ONLY_ACTIONS = [
  CRITICAL_ACTIONS.DELETE_ORGANIZATION,
  CRITICAL_ACTIONS.TRANSFER_OWNERSHIP,
  CRITICAL_ACTIONS.MANAGE_BILLING,
  CRITICAL_ACTIONS.RESET_ORGANIZATION
];

// Fonction utilitaire pour obtenir les permissions d'un rôle
export const getPermissionsForRole = (role: OrganizationRole): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

// Fonction utilitaire pour vérifier si une action est critique
export const isCriticalAction = (action: string): boolean => {
  return Object.values(CRITICAL_ACTIONS).includes(action as any);
};

// Fonction utilitaire pour vérifier si une action nécessite d'être owner
export const isOwnerOnlyAction = (action: string): boolean => {
  return OWNER_ONLY_ACTIONS.includes(action as any);
};

// Configuration des ressources et leurs permissions associées
export const RESOURCE_PERMISSIONS = {
  organization: {
    read: PERMISSIONS.ORGANIZATION.VIEW,
    write: PERMISSIONS.ORGANIZATION.UPDATE_SETTINGS,
    delete: PERMISSIONS.ORGANIZATION.DELETE
  },
  members: {
    read: PERMISSIONS.MEMBERS.VIEW,
    write: PERMISSIONS.MEMBERS.MANAGE,
    delete: PERMISSIONS.MEMBERS.REMOVE
  },
  teams: {
    read: PERMISSIONS.TEAMS.VIEW,
    write: PERMISSIONS.TEAMS.MANAGE,
    delete: PERMISSIONS.TEAMS.DELETE
  },
  events: {
    read: PERMISSIONS.EVENTS.VIEW,
    write: PERMISSIONS.EVENTS.MANAGE,
    delete: PERMISSIONS.EVENTS.DELETE
  },
  appointments: {
    read: PERMISSIONS.APPOINTMENTS.VIEW,
    write: PERMISSIONS.APPOINTMENTS.MANAGE,
    delete: PERMISSIONS.APPOINTMENTS.DELETE
  },
  analytics: {
    read: PERMISSIONS.ANALYTICS.VIEW,
    write: PERMISSIONS.ANALYTICS.VIEW_DETAILED,
    export: PERMISSIONS.ANALYTICS.EXPORT
  }
} as const;