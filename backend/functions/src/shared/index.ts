// shared/src/index.ts

// Export de tous les types
export * from './types';

// Export des constantes
export * from './constants';

// Export des validators
export * from './validators';

// Export des utilitaires (domain-specific)
export * from './utils/auth';
// Export specific items from utils/common to avoid ValidationError conflict
export { AuthenticationError, ConflictError, ForbiddenError } from './utils/common/errors';
export * from './utils/common/array-utils';
export * from './utils/common/object-utils';
export * from './utils/common/string-utils';
export * from './utils/formatting';
export * from './utils/validation';

// Re-export des types les plus utilisés pour faciliter l'import
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest
} from './types/user.types';

export type {
  Event,
  CreateEventRequest,
  UpdateEventRequest
} from './types/event.types';

export type {
  AttendanceRecord,
  MarkAttendanceRequest
} from './types/attendance.types';

export type {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationSettings,
  OrganizationBranding,
  OrganizationStats,
  OrganizationSubscription,
  OrganizationContactInfo,
  OrganizationFeatures,
  OrganizationTemplate,
  OrganizationAuditLog
} from './types/organization.types';

export type {
  Notification,
  CreateNotificationRequest,
  SendNotificationRequest,
  BulkNotificationRequest,
  NotificationPreferences
} from './types/notification.types';

export type {
  Team,
  TeamSettings,
  TeamMember,
  CreateTeamRequest,
  UpdateTeamRequest,
  TeamStats,
  OrganizationUser
} from './types/team.types';

export {
  TeamRole
} from './types/team.types';

export type {
  EventParticipant,
  ParticipantStatus,
  ImportSource,
  ParticipantNotificationPreferences,
  ParticipantImportRow,
  ParticipantEventRole,
  ParticipantImportState,
  ImportStatus,
  ImportError,
  ImportDuplicate,
  DuplicateAction,
  ImportNotificationSettings,
  CreateParticipantRequest,
  UpdateParticipantRequest,
  BulkParticipantImportRequest
} from './types/participant.types';

export type {
  ApiResponse,
  PaginatedResponse,
  BaseEntity
} from './types/common.types';

export type {
  UserIntegration,
  SyncHistory,
  IntegrationPolicy,
  OAuthTokens,
  EncryptedTokens,
  ConnectIntegrationRequest,
  ConnectIntegrationResponse,
  CompleteOAuthRequest,
  UpdateIntegrationSettingsRequest,
  IntegrationSyncRequest,
  IntegrationUsageStats,
  ProviderConfig,
  IntegrationEvent,
  SyncedCalendarEvent,
  SyncedContact,
  SyncedFile,
  IntegrationError
} from './types/integration.types';

export type {
  EmailCampaign,
  CampaignTemplate,
  CampaignDelivery,
  CampaignDeliveryStats,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CreateCampaignTemplateRequest,
  UpdateCampaignTemplateRequest,
  CampaignPreviewRequest,
  TemplatePreviewRequest,
  TemplateShareRequest,
  TemplateDuplicationRequest,
  TemplateUsageStats,
  RecipientPreviewRequest,
  UnsubscribeRequest
} from './types/email-campaign.types';

// Export des énums les plus utilisés
export {
  UserRole,
  UserStatus,
  EventType,
  EventStatus,
  AttendanceStatus,
  AttendanceMethod,
  NotificationType,
  NotificationChannel,
  OrganizationRole,
  OrganizationStatus,
  OrganizationSector,
  OrganizationInvitationStatus,
  IntegrationProvider,
  IntegrationStatus,
  SyncType,
  SyncStatus,
  IntegrationErrorCode,
  CampaignType,
  CampaignStatus,
  CampaignTemplateCategory,
  CampaignDeliveryStatus,
  EmailCampaignErrorCodes
} from './types';

// Version du package
export const VERSION = '1.0.0';