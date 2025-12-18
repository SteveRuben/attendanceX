// shared/types/push.types.ts

/**
 * Types pour le système de notifications push
 * Compatible avec Firebase Cloud Messaging (FCM)
 */

/**
 * Plateforme de l'appareil
 */
 type PushPlatform = "ios" | "android" | "web";

/**
 * Priorité de la notification
 */
 type PushPriority = "high" | "normal";

/**
 * Actions pour les notifications web
 */
 interface PushAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Structure d'une notification push
 */
 interface PushNotification {
  /** Titre de la notification */
  title: string;
  
  /** Corps du message */
  body: string;
  
  /** URL de l'image (optionnel) */
  imageUrl?: string;
  
  /** Icône de la notification */
  icon?: string;
  
  /** Couleur de la notification (Android) */
  color?: string;
  
  /** Action au clic (Android) */
  clickAction?: string;
  
  /** Badge count (iOS) */
  badge?: number;
  
  /** Son de notification */
  sound?: string;
  
  /** Priorité de la notification */
  priority?: PushPriority;
  
  /** Time To Live en secondes */
  ttl?: number;
  
  /** Actions pour notifications web */
  actions?: PushAction[];
  
  /** Données additionnelles */
  data?: Record<string, any>;
}

/**
 * Token push d'un appareil
 */
 interface PushToken {
  /** ID unique du token */
  id?: string;
  
  /** ID de l'utilisateur propriétaire */
  userId: string;
  
  /** Token FCM */
  token: string;
  
  /** Informations sur l'appareil */
  deviceInfo: {
    /** Plateforme */
    platform: PushPlatform;
    
    /** ID unique de l'appareil */
    deviceId?: string;
    
    /** Nom de l'appareil */
    deviceName?: string;
    
    /** Version de l'application */
    appVersion?: string;
    
    /** Version de l'OS */
    osVersion?: string;
    
    /** Modèle de l'appareil */
    deviceModel?: string;
  };
  
  /** Date de création */
  createdAt: Date;
  
  /** Date de dernière mise à jour */
  updatedAt: Date;
  
  /** Date de dernière utilisation */
  lastUsed: Date;
  
  /** Token actif ou non */
  active: boolean;
  
  /** Message d'erreur si applicable */
  error?: string;
  
  /** Timezone de l'appareil */
  timezone?: string;
  
  /** Langue préférée */
  language?: string;
}

/**
 * Résultat d'envoi de notification simple
 */
 interface PushResult {
  /** Succès global */
  success: boolean;
  
  /** Nombre de succès */
  successCount: number;
  
  /** Nombre d'échecs */
  failureCount: number;
  
  /** ID du message FCM */
  messageId?: string | null;
  
  /** Tokens en échec avec leurs erreurs */
  failedTokens: Array<{
    token: string;
    error: string;
  }>;
  
  /** Timestamp de l'envoi */
  sentAt?: Date;
  
  /** Durée de traitement en ms */
  processingTime?: number;
}

/**
 * Résultat d'envoi de notification en batch
 */
 interface BatchPushResult {
  /** Succès global */
  success: boolean;
  
  /** Nombre total de tokens */
  totalTokens: number;
  
  /** Nombre total de succès */
  successCount: number;
  
  /** Nombre total d'échecs */
  failureCount: number;
  
  /** Nombre de batches traités */
  batches: number;
  
  /** Résultats détaillés par batch */
  batchResults: PushResult[];
  
  /** Tous les tokens en échec */
  failedTokens: Array<{
    token: string;
    error: string;
  }>;
  
  /** Timestamp de début */
  startedAt?: Date;
  
  /** Timestamp de fin */
  completedAt?: Date;
  
  /** Durée totale de traitement en ms */
  totalProcessingTime?: number;
}

/**
 * Types d'erreurs push
 */
 type PushErrorCode = 
  | "no_tokens"
  | "invalid_token" 
  | "invalid_notification"
  | "fcm_error"
  | "batch_error"
  | "rate_limit_exceeded"
  | "auth_error"
  | "network_error"
  | "quota_exceeded"
  | "invalid_parameters";

/**
 * Erreur spécifique aux notifications push
 */
export class PushError extends Error {
  public readonly code: PushErrorCode;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string, 
    code: PushErrorCode, 
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "PushError";
    this.code = code;
    this.details = details ?? {};
    this.timestamp = new Date();
  }

  /**
   * Sérialise l'erreur pour logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Template de notification
 */
 interface PushTemplate {
  /** ID unique du template */
  id: string;
  
  /** Nom du template */
  name: string;
  
  /** Template du titre */
  titleTemplate: string;
  
  /** Template du corps */
  bodyTemplate: string;
  
  /** Variables disponibles */
  variables: string[];
  
  /** Configuration par défaut */
  defaultConfig?: Partial<PushNotification>;
  
  /** Plateforme cible */
  platform?: PushPlatform;
  
  /** Type de notification */
  type: string;
  
  /** Template actif */
  active: boolean;
  
  /** Date de création */
  createdAt: Date;
  
  /** Date de mise à jour */
  updatedAt: Date;
}

/**
 * Notification programmée
 */
 interface ScheduledPushNotification {
  /** ID unique */
  id: string;
  
  /** Tokens cibles */
  tokens: string[];
  
  /** Notification à envoyer */
  notification: PushNotification;
  
  /** Date d'envoi programmée */
  scheduleTime: Date;
  
  /** Statut */
  status: "pending" | "sent" | "failed" | "cancelled";
  
  /** Résultat d'envoi */
  result?: PushResult | BatchPushResult;
  
  /** Date de création */
  createdAt: Date;
  
  /** Date de traitement */
  processedAt?: Date;
  
  /** Erreur si applicable */
  error?: string;
  
  /** Récurrence */
  recurrence?: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date;
  };
}

/**
 * Métriques de notification push
 */
 interface PushMetrics {
  /** ID unique */
  id: string;
  
  /** ID utilisateur */
  userId: string;
  
  /** Type de notification */
  type: string;
  
  /** Plateforme */
  platform: PushPlatform;
  
  /** Date d'envoi */
  sentAt: Date;
  
  /** Statut */
  status: "sent" | "delivered" | "opened" | "failed";
  
  /** Nombre de succès */
  successCount: number;
  
  /** Nombre d'échecs */
  failureCount: number;
  
  /** Temps de traitement en ms */
  processingTime?: number;
  
  /** Date d'ouverture */
  openedAt?: Date;
  
  /** Données de contexte */
  context?: Record<string, any>;
}

/**
 * Request pour enregistrer un token
 */
 interface RegisterPushTokenRequest {
  /** Token FCM */
  token: string;
  
  /** Informations sur l'appareil */
  deviceInfo: PushToken["deviceInfo"];
  
  /** Timezone */
  timezone?: string;
  
  /** Langue */
  language?: string;
}

/**
 * Request pour envoyer une notification
 */
 interface SendPushNotificationRequest {
  /** Tokens destinataires */
  tokens?: string[];
  
  /** IDs utilisateurs destinataires */
  userIds?: string[];
  
  /** Notification à envoyer */
  notification: PushNotification;
  
  /** Envoi immédiat ou programmé */
  scheduleTime?: Date;
  
  /** Template à utiliser */
  templateId?: string;
  
  /** Variables pour le template */
  templateVariables?: Record<string, string>;
}

/**
 * Request pour envoi par topic
 */
 interface SendPushByTopicRequest {
  /** Topic FCM */
  topic: string;
  
  /** Condition pour topics multiples */
  condition?: string;
  
  /** Notification à envoyer */
  notification: PushNotification;
}

/**
 * Response d'envoi de notification
 */
 interface SendPushNotificationResponse {
  /** Résultat d'envoi */
  result: PushResult | BatchPushResult;
  
  /** ID de la tâche si programmée */
  taskId?: string;
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Configuration du service push
 */
 interface PushServiceConfig {
  /** Configuration FCM */
  fcm: {
    /** Clé serveur */
    serverKey: string;
    
    /** Project ID */
    projectId: string;
    
    /** URL de l'API */
    apiUrl?: string;
  };
  
  /** Limites */
  limits: {
    /** Tokens max par batch */
    maxTokensPerBatch: number;
    
    /** Notifications max par utilisateur/heure */
    maxNotificationsPerUserPerHour: number;
    
    /** TTL par défaut */
    defaultTtl: number;
  };
  
  /** Templates par défaut */
  defaultTemplates: PushTemplate[];
  
  /** Configuration de retry */
  retry: {
    /** Nombre max de tentatives */
    maxAttempts: number;
    
    /** Délai initial en ms */
    initialDelay: number;
    
    /** Facteur multiplicateur */
    backoffFactor: number;
  };
}

/**
 * Filtre pour rechercher des tokens
 */
 interface PushTokenFilter {
  /** ID utilisateur */
  userId?: string;
  
  /** Plateforme */
  platform?: PushPlatform;
  
  /** Actif seulement */
  activeOnly?: boolean;
  
  /** Dernière utilisation après */
  lastUsedAfter?: Date;
  
  /** Version app minimum */
  minAppVersion?: string;
}

/**
 * Statistiques push
 */
 interface PushStats {
  /** Tokens totaux */
  totalTokens: number;
  
  /** Tokens actifs */
  activeTokens: number;
  
  /** Répartition par plateforme */
  byPlatform: Record<PushPlatform, number>;
  
  /** Notifications envoyées aujourd'hui */
  sentToday: number;
  
  /** Taux de succès */
  successRate: number;
  
  /** Dernière mise à jour */
  updatedAt: Date;
}

export type {
  PushPlatform,
  PushPriority,
  PushAction,
  PushNotification,
  PushToken,
  PushResult,
  BatchPushResult,
  PushErrorCode,
  PushTemplate,
  ScheduledPushNotification,
  PushMetrics,
  RegisterPushTokenRequest,
  SendPushNotificationRequest,
  SendPushByTopicRequest,
  SendPushNotificationResponse,
  PushServiceConfig,
  PushTokenFilter,
  PushStats
};