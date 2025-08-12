// shared/src/types/user.types.ts - Types pour les utilisateurs

import { OrganizationRole } from './organization.types';
import { UserRole } from './role.types';
import { InvitationStatus } from './notification.types';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  
  // System role and status
  role: UserRole;
  status: UserStatus;
  permissions: Record<string, boolean>;
  
  // Contexte d'organisation
  organizationId?: string;
  organizationRole?: OrganizationRole;
  isOrganizationAdmin: boolean;
  joinedOrganizationAt?: Date;
  
  // Profil utilisateur
  profile: UserProfile;
  preferences: UserPreferences;
  
  // Métadonnées système
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  
  // Sécurité
  twoFactorEnabled: boolean;
  lastPasswordChange?: Date;
  
  // Métadonnées
  metadata: Record<string, any>;
}

export interface UserProfile {
  jobTitle?: string;
  department?: string;
  location?: string;
  manager?: string;
  employeeId?: string;
  startDate?: Date;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
}

export interface UserPreferences {
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    digest: 'daily' | 'weekly' | 'monthly' | 'never';
  };
  privacy?: {
    showProfile: boolean;
    showActivity: boolean;
    allowDirectMessages: boolean;
  };
  accessibility?: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
}

export interface CreateUserRequest {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  password: string;
  sendInvitation?: boolean;
  organizationId?: string;
  organizationRole?: OrganizationRole;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserOrganizationRequest {
  organizationId: string;
  organizationRole: OrganizationRole;
  profile?: {
    jobTitle?: string;
    department?: string;
    manager?: string;
    employeeId?: string;
    startDate?: Date;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: {
    type: 'web' | 'mobile' | 'tablet';
    browser?: string;
    os?: string;
    ip: string;
    userAgent: string;
  };
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface UserActivity {
  id: string;
  userId: string;
  organizationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface UserStats {
  totalEvents: number;
  attendedEvents: number;
  attendanceRate: number;
  totalAppointments: number;
  completedAppointments: number;
  lastActivity: Date;
  joinedDaysAgo: number;
  organizationRole?: OrganizationRole;
}

// Énumérations pour les statuts utilisateur
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  DELETED = 'deleted',
  BLOCKED = 'blocked'
}

export enum UserType {
  REGULAR = 'regular',
  ADMIN = 'admin',
  SYSTEM = 'system',
  SERVICE = 'service'
}

// Interface pour les requêtes authentifiées
export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  sessionId?: string;
  organizationId?: string;
}

// Interface pour la réponse de connexion
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  needsOrganization: boolean;
  organizationSetupRequired?: boolean;
  permissions?: Record<string, boolean>;
  sessionId?: string;
  organizationInvitations?: Array<{
    id: string;
    organizationName: string;
    role: OrganizationRole;
    invitedBy: string;
    expiresAt: Date;
  }>;
}

// Interface pour la réponse d'inscription
export interface RegisterResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  needsEmailVerification: boolean;
  needsOrganization: boolean;
}

// Interface pour la vérification d'email
export interface EmailVerificationRequest {
  token: string;
}

// Interface pour la réinitialisation de mot de passe
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

// Interface pour le changement de mot de passe
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Interface pour l'authentification à deux facteurs
export interface TwoFactorSetupRequest {
  password: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
  backupCode?: string;
}

// Interface pour les invitations utilisateur
export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: InvitationStatus;
  acceptedAt?: Date;
  message?: string;
}

// Permissions utilisateur par défaut
export const USER_PERMISSIONS = {
  // Profil utilisateur
  VIEW_OWN_PROFILE: 'view_own_profile',
  UPDATE_OWN_PROFILE: 'update_own_profile',
  DELETE_OWN_ACCOUNT: 'delete_own_account',
  
  // Événements
  VIEW_EVENTS: 'view_events',
  CREATE_EVENTS: 'create_events',
  UPDATE_OWN_EVENTS: 'update_own_events',
  DELETE_OWN_EVENTS: 'delete_own_events',
  
  // Rendez-vous
  VIEW_APPOINTMENTS: 'view_appointments',
  CREATE_APPOINTMENTS: 'create_appointments',
  UPDATE_OWN_APPOINTMENTS: 'update_own_appointments',
  DELETE_OWN_APPOINTMENTS: 'delete_own_appointments',
  
  // Présence
  RECORD_ATTENDANCE: 'record_attendance',
  VIEW_OWN_ATTENDANCE: 'view_own_attendance',
  
  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
  
  // Intégrations
  VIEW_INTEGRATIONS: 'view_integrations',
  MANAGE_OWN_INTEGRATIONS: 'manage_own_integrations'
} as const;

export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];

// Permissions par rôle d'organisation (en plus des permissions utilisateur de base)
export const ORGANIZATION_USER_PERMISSIONS: Record<OrganizationRole, UserPermission[]> = {
  [OrganizationRole.OWNER]: Object.values(USER_PERMISSIONS),
  [OrganizationRole.ADMIN]: Object.values(USER_PERMISSIONS),
  [OrganizationRole.MANAGER]: [
    USER_PERMISSIONS.VIEW_OWN_PROFILE,
    USER_PERMISSIONS.UPDATE_OWN_PROFILE,
    USER_PERMISSIONS.VIEW_EVENTS,
    USER_PERMISSIONS.CREATE_EVENTS,
    USER_PERMISSIONS.UPDATE_OWN_EVENTS,
    USER_PERMISSIONS.DELETE_OWN_EVENTS,
    USER_PERMISSIONS.VIEW_APPOINTMENTS,
    USER_PERMISSIONS.CREATE_APPOINTMENTS,
    USER_PERMISSIONS.UPDATE_OWN_APPOINTMENTS,
    USER_PERMISSIONS.DELETE_OWN_APPOINTMENTS,
    USER_PERMISSIONS.RECORD_ATTENDANCE,
    USER_PERMISSIONS.VIEW_OWN_ATTENDANCE,
    USER_PERMISSIONS.MANAGE_NOTIFICATIONS,
    USER_PERMISSIONS.VIEW_INTEGRATIONS
  ],
  [OrganizationRole.MEMBER]: [
    USER_PERMISSIONS.VIEW_OWN_PROFILE,
    USER_PERMISSIONS.UPDATE_OWN_PROFILE,
    USER_PERMISSIONS.VIEW_EVENTS,
    USER_PERMISSIONS.CREATE_EVENTS,
    USER_PERMISSIONS.UPDATE_OWN_EVENTS,
    USER_PERMISSIONS.VIEW_APPOINTMENTS,
    USER_PERMISSIONS.CREATE_APPOINTMENTS,
    USER_PERMISSIONS.UPDATE_OWN_APPOINTMENTS,
    USER_PERMISSIONS.RECORD_ATTENDANCE,
    USER_PERMISSIONS.VIEW_OWN_ATTENDANCE,
    USER_PERMISSIONS.MANAGE_NOTIFICATIONS
  ],
  [OrganizationRole.VIEWER]: [
    USER_PERMISSIONS.VIEW_OWN_PROFILE,
    USER_PERMISSIONS.UPDATE_OWN_PROFILE,
    USER_PERMISSIONS.VIEW_EVENTS,
    USER_PERMISSIONS.VIEW_APPOINTMENTS,
    USER_PERMISSIONS.RECORD_ATTENDANCE,
    USER_PERMISSIONS.VIEW_OWN_ATTENDANCE,
    USER_PERMISSIONS.MANAGE_NOTIFICATIONS
  ]
};  