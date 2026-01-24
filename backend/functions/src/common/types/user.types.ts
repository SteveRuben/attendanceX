// shared/src/types/user.types.ts - Types pour les utilisateurs

import { TenantRole } from './index';
import { InvitationStatus } from './notification.types';
import { TenantScopedEntity, TenantMembership } from './tenant.types';

export interface User extends TenantScopedEntity {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  phone?: string;
  
  // User status (no intrinsic role - roles are defined in TenantMembership)
  status: UserStatus;
  
  // Multi-tenant context
  tenantMemberships: TenantMembership[];
  activeTenantId: string;
  
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

export interface UserAccountInfo {
  membership: TenantMembership;
  organization: {
    id: string;
    name: string;
  };
  lastLogin: string;
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
  password: string;
  sendInvitation?: boolean;
  tenantId?: string;
  pendingTenantName?: string;
  tenantRole?: TenantRole;
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

export interface UpdateUserTenantRequest {
  tenantId: string;
  tenantRole: TenantRole;
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
  tenantId?: string;
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
  tenantRole?: TenantRole;
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
  permissions: Record<string, boolean>;
  sessionId?: string;
  tenantId?: string;
  tenantRole?: TenantRole; // Role comes from TenantMembership, not User
}

// Interface pour la réponse de connexion
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  permissions?: Record<string, boolean>;
  sessionId?: string;
}

// Interface pour la réponse d'inscription
export interface RegisterResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  needsEmailVerification: boolean;
  needsTenant: boolean;
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
  tenantId?: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: InvitationStatus;
  acceptedAt?: Date;
  message?: string;
  tenantRole?: TenantRole; // Role for the tenant membership, not intrinsic user role
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

