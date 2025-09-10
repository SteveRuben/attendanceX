// shared/types/integration.types.ts

// shared/types/integration.types.ts
import type { BaseEntity } from "./common.types";

export enum IntegrationProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
  APPLE = 'apple',
  SLACK = 'slack'
}

export enum IntegrationStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

export enum SyncType {
  CALENDAR = 'calendar',
  CONTACTS = 'contacts',
  EMAIL = 'email',
  FILES = 'files',
  TASKS = 'tasks',
  PRESENCE = 'presence'
}

export enum SyncStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PARTIAL = 'partial',
  IN_PROGRESS = 'in_progress',
  CANCELLED = 'cancelled'
}

export interface SyncSettings {
  calendar: boolean;
  contacts: boolean;
  email: boolean;
  files: boolean;
  tasks: boolean;
  presence: boolean;
  autoSync: boolean;
  syncFrequency: number; // en minutes
}

export interface IntegrationMetadata {
  userEmail: string;
  userName: string;
  profilePicture?: string;
  organizationName?: string;
  timeZone?: string;
  locale?: string;
}

export interface UserIntegration extends BaseEntity {
  userId: string;
  organizationId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connectedAt: Date;
  lastSyncAt?: Date;
  lastErrorAt?: Date;
  permissions: string[];
  syncSettings: SyncSettings;
  metadata: IntegrationMetadata;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export interface SyncHistory extends BaseEntity {
  integrationId: string;
  userId: string;
  syncType: SyncType;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errors: string[];
  duration?: number; // en millisecondes
  dataSize?: number; // en bytes
}

export interface IntegrationPolicy extends BaseEntity {
  organizationId: string;
  provider: IntegrationProvider;
  allowed: boolean;
  requiredPermissions: string[];
  restrictions: string[];
  maxConnections?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireApproval: boolean;
  createdBy: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt: Date;
  scope: string;
  idToken?: string;
}

export interface EncryptedTokens {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  encryptedIdToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope: string;
  keyId: string; // ID de la clé de chiffrement utilisée
}

// Requests et Responses pour les APIs
export interface ConnectIntegrationRequest {
  provider: IntegrationProvider;
  scopes: string[];
  syncSettings: Partial<SyncSettings>;
  redirectUri?: string;
}

export interface ConnectIntegrationResponse {
  authUrl: string;
  state: string;
  codeVerifier?: string; // Pour PKCE
}

export interface CompleteOAuthRequest {
  provider: IntegrationProvider;
  code: string;
  state: string;
  codeVerifier?: string;
}

export interface UpdateIntegrationSettingsRequest {
  syncSettings?: Partial<SyncSettings>;
  permissions?: string[];
}

export interface IntegrationSyncRequest {
  syncTypes?: SyncType[];
  force?: boolean;
}

export interface IntegrationUsageStats {
  totalIntegrations: number;
  activeIntegrations: number;
  integrationsByProvider: Record<IntegrationProvider, number>;
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncDuration: number;
  };
  lastSyncAt?: Date;
}

// Configuration des providers
export interface ProviderConfig {
  provider: IntegrationProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  userInfoUrl?: string;
  enabled: boolean;
}

// Événements d'intégration pour les webhooks/notifications
export interface IntegrationEvent {
  type: 'connected' | 'disconnected' | 'sync_completed' | 'sync_failed' | 'token_expired';
  integrationId: string;
  userId: string;
  provider: IntegrationProvider;
  timestamp: Date;
  data?: Record<string, any>;
}

// Types pour les données synchronisées
export interface SyncedCalendarEvent {
  externalId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  isAllDay: boolean;
  recurrence?: string;
  lastModified: Date;
}

export interface SyncedContact {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  lastModified: Date;
}

export interface SyncedFile {
  externalId: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  downloadUrl?: string;
  lastModified: Date;
}

// Erreurs spécifiques aux intégrations
export enum IntegrationErrorCode {
  OAUTH_ERROR = 'OAUTH_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  DATA_FORMAT_ERROR = 'DATA_FORMAT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  POLICY_VIOLATION = 'POLICY_VIOLATION'
}

export interface IntegrationError {
  code: IntegrationErrorCode;
  message: string;
  details?: Record<string, any>;
  retryable: boolean;
  retryAfter?: number; // en secondes
}