import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationTemplate,
} from "@attendance-x/shared";

/**
 * Configuration des canaux de notification
 */
export interface NotificationChannelConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  settings: {
    rateLimitPerMinute?: number;
    rateLimitPerHour?: number;
    rateLimitPerDay?: number;
    defaultProvider?: string;
    urgentOnly?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
    [key: string]: any;
  };
}

export const notificationChannels: Record<NotificationChannel, NotificationChannelConfig> = {
  [NotificationChannel.EMAIL]: {
    id: NotificationChannel.EMAIL,
    name: "Email",
    enabled: process.env.ENABLE_EMAIL_NOTIFICATIONS !== "false",
    priority: 1,
    settings: {
      rateLimitPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || "50", 10),
      rateLimitPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || "1000", 10),
      rateLimitPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_PER_DAY || "10000", 10),
      defaultProvider: process.env.DEFAULT_EMAIL_PROVIDER || "sendgrid",
      maxRetries: 3,
      retryDelayMs: 60000, // 1 minute
      trackOpens: true,
      trackClicks: true,
      unsubscribeLink: true,
    },
  },

  [NotificationChannel.SMS]: {
    id: NotificationChannel.SMS,
    name: "SMS",
    enabled: process.env.ENABLE_SMS_NOTIFICATIONS === "true",
    priority: 2,
    settings: {
      rateLimitPerMinute: parseInt(process.env.SMS_RATE_LIMIT_PER_MINUTE || "10", 10),
      rateLimitPerHour: parseInt(process.env.SMS_RATE_LIMIT_PER_HOUR || "100", 10),
      rateLimitPerDay: parseInt(process.env.SMS_RATE_LIMIT_PER_DAY || "1000", 10),
      defaultProvider: process.env.DEFAULT_SMS_PROVIDER || "twilio",
      urgentOnly: process.env.SMS_URGENT_ONLY === "true",
      maxRetries: 2,
      retryDelayMs: 30000, // 30 seconds
      maxLength: 160,
    },
  },

  [NotificationChannel.PUSH]: {
    id: NotificationChannel.PUSH,
    name: "Notification Push",
    enabled: process.env.ENABLE_PUSH_NOTIFICATIONS !== "false",
    priority: 3,
    settings: {
      rateLimitPerMinute: parseInt(process.env.PUSH_RATE_LIMIT_PER_MINUTE || "100", 10),
      rateLimitPerHour: parseInt(process.env.PUSH_RATE_LIMIT_PER_HOUR || "1000", 10),
      rateLimitPerDay: parseInt(process.env.PUSH_RATE_LIMIT_PER_DAY || "5000", 10),
      fcmServerKey: process.env.FCM_SERVER_KEY || "",
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || "",
      maxRetries: 3,
      retryDelayMs: 10000, // 10 seconds
      ttl: 86400, // 24 hours
    },
  },

  [NotificationChannel.IN_APP]: {
    id: NotificationChannel.IN_APP,
    name: "Notification dans l'app",
    enabled: true,
    priority: 4,
    settings: {
      maxUnreadNotifications: parseInt(process.env.MAX_UNREAD_NOTIFICATIONS || "100", 10),
      autoDeleteAfterDays: parseInt(process.env.NOTIFICATION_AUTO_DELETE_DAYS || "30", 10),
      realTimeEnabled: true,
      soundEnabled: true,
      badgeEnabled: true,
    },
  },

  [NotificationChannel.WEBHOOK]: {
    id: NotificationChannel.WEBHOOK,
    name: "Webhook",
    enabled: process.env.ENABLE_WEBHOOK_NOTIFICATIONS === "true",
    priority: 5,
    settings: {
      rateLimitPerMinute: parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_MINUTE || "60", 10),
      rateLimitPerHour: parseInt(process.env.WEBHOOK_RATE_LIMIT_PER_HOUR || "1000", 10),
      defaultTimeout: parseInt(process.env.WEBHOOK_TIMEOUT_MS || "5000", 10),
      maxRetries: 3,
      retryDelayMs: 5000,
      verifySSL: process.env.WEBHOOK_VERIFY_SSL !== "false",
    },
  },
};

/**
 * Configuration des types de notification avec templates
 */
export interface NotificationTypeConfig {
  id: string;
  name: string;
  description: string;
  defaultChannels: NotificationChannel[];
  priority: NotificationPriority;
  urgent: boolean;
  userConfigurable: boolean;
  category: string;
  templates: {
    title: string;
    message: string;
    emailSubject?: string;
    emailTemplate?: string;
    smsTemplate?: string;
    pushTitle?: string;
    pushBody?: string;
    webhookPayload?: Record<string, any>;
  };
  variables: string[];
  rateLimits?: {
    perUserPerHour?: number;
    perUserPerDay?: number;
    perEventPerDay?: number;
  };
}

export const notificationTypes: Record<NotificationType, NotificationTypeConfig> = {
  // 📅 Événements
  [NotificationType.EVENT_REMINDER]: {
    id: NotificationType.EVENT_REMINDER,
    name: "Rappel d'événement",
    description: "Rappel automatique avant le début d'un événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Rappel : {{eventTitle}}",
      message: "L'événement {{eventTitle}} commence {{timeUntil}} à {{eventLocation}}",
      emailSubject: "Rappel : {{eventTitle}} commence bientôt",
      emailTemplate: "event_reminder",
      smsTemplate: "Rappel : {{eventTitle}} commence {{timeUntil}} à {{eventLocation}}",
      pushTitle: "Rappel d'événement",
      pushBody: "{{eventTitle}} commence {{timeUntil}}",
    },
    variables: ["eventTitle", "timeUntil", "eventLocation", "eventDate", "qrCodeUrl"],
    rateLimits: {
      perEventPerDay: 3, // Max 3 rappels par événement par jour
    },
  },

  [NotificationType.EVENT_CREATED]: {
    id: NotificationType.EVENT_CREATED,
    name: "Nouvel événement",
    description: "Notification lors de la création d'un nouvel événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Nouvel événement : {{eventTitle}}",
      message: "Un nouvel événement {{eventTitle}} a été créé pour le {{eventDate}}",
      emailSubject: "Nouvel événement : {{eventTitle}}",
      emailTemplate: "event_created",
      smsTemplate: "Nouvel événement : {{eventTitle}} le {{eventDate}} à {{eventLocation}}",
      pushTitle: "Nouvel événement",
      pushBody: "{{eventTitle}} - {{eventDate}}",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "organizerName", "description"],
  },

  [NotificationType.EVENT_UPDATED]: {
    id: NotificationType.EVENT_UPDATED,
    name: "Événement modifié",
    description: "Notification lors de la modification d'un événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Modification : {{eventTitle}}",
      message: "L'événement {{eventTitle}} a été modifié. Consultez les nouvelles informations.",
      emailSubject: "Modification d'événement : {{eventTitle}}",
      emailTemplate: "event_updated",
      smsTemplate: "Modification : {{eventTitle}} - Nouvelles informations disponibles",
      pushTitle: "Événement modifié",
      pushBody: "{{eventTitle}} a été modifié",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "changes", "organizerName"],
  },

  [NotificationType.EVENT_CANCELLED]: {
    id: NotificationType.EVENT_CANCELLED,
    name: "Événement annulé",
    description: "Notification d'annulation d'événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "events",
    templates: {
      title: "ANNULATION : {{eventTitle}}",
      message: "L'événement {{eventTitle}} prévu le {{eventDate}} a été annulé.",
      emailSubject: "ANNULATION : {{eventTitle}}",
      emailTemplate: "event_cancelled",
      smsTemplate: "ANNULATION : {{eventTitle}} prévu le {{eventDate}} a été annulé. Raison : {{reason}}",
      pushTitle: "Événement annulé",
      pushBody: "{{eventTitle}} a été annulé",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "reason", "organizerName"],
  },

  [NotificationType.EVENT_STARTING_SOON]: {
    id: NotificationType.EVENT_STARTING_SOON,
    name: "Événement imminent",
    description: "Notification quand un événement commence bientôt",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "{{eventTitle}} commence maintenant",
      message: "L'événement {{eventTitle}} commence dans {{timeUntil}}",
      pushTitle: "Événement imminent",
      pushBody: "{{eventTitle}} commence dans {{timeUntil}}",
    },
    variables: ["eventTitle", "timeUntil", "eventLocation"],
  },

  // ✅ Présences
  [NotificationType.ATTENDANCE_MARKED]: {
    id: NotificationType.ATTENDANCE_MARKED,
    name: "Présence enregistrée",
    description: "Confirmation d'enregistrement de présence",
    defaultChannels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "attendance",
    templates: {
      title: "Présence enregistrée",
      message: "Votre présence à {{eventTitle}} a été enregistrée avec succès",
      emailSubject: "Confirmation de présence : {{eventTitle}}",
      emailTemplate: "attendance_marked",
      smsTemplate: "Présence confirmée pour {{eventTitle}} le {{checkInTime}}",
      pushTitle: "Présence confirmée",
      pushBody: "Présence enregistrée pour {{eventTitle}}",
    },
    variables: ["eventTitle", "checkInTime", "eventLocation", "status"],
  },

  [NotificationType.ATTENDANCE_REQUIRED]: {
    id: NotificationType.ATTENDANCE_REQUIRED,
    name: "Présence requise",
    description: "Rappel pour marquer sa présence",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "attendance",
    templates: {
      title: "Marquage de présence requis",
      message: "N'oubliez pas de marquer votre présence pour {{eventTitle}}",
      pushTitle: "Présence requise",
      pushBody: "Marquez votre présence pour {{eventTitle}}",
    },
    variables: ["eventTitle", "eventLocation", "timeRemaining"],
  },

  [NotificationType.ATTENDANCE_REMINDER]: {
    id: NotificationType.ATTENDANCE_REMINDER,
    name: "Rappel de présence",
    description: "Rappel pour les participants absents",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "attendance",
    templates: {
      title: "Rappel de présence",
      message: "Vous êtes attendu à {{eventTitle}}. Merci de confirmer votre présence.",
      emailSubject: "Rappel de présence : {{eventTitle}}",
      emailTemplate: "attendance_reminder",
      smsTemplate: "Rappel : Votre présence est attendue à {{eventTitle}}",
      pushTitle: "Rappel de présence",
      pushBody: "Votre présence est attendue à {{eventTitle}}",
    },
    variables: ["eventTitle", "eventLocation", "eventTime"],
  },

  // 📩 Invitations et inscriptions
  [NotificationType.INVITATION_RECEIVED]: {
    id: NotificationType.INVITATION_RECEIVED,
    name: "Invitation reçue",
    description: "Notification d'invitation à un événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "invitations",
    templates: {
      title: "Invitation : {{eventTitle}}",
      message: "Vous êtes invité à {{eventTitle}} le {{eventDate}}",
      emailSubject: "Invitation : {{eventTitle}}",
      emailTemplate: "invitation_received",
      pushTitle: "Nouvelle invitation",
      pushBody: "Invitation à {{eventTitle}}",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "organizerName", "invitationLink"],
  },

  [NotificationType.REGISTRATION_CONFIRMED]: {
    id: NotificationType.REGISTRATION_CONFIRMED,
    name: "Inscription confirmée",
    description: "Confirmation d'inscription à un événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "registration",
    templates: {
      title: "Inscription confirmée",
      message: "Votre inscription à {{eventTitle}} est confirmée",
      emailSubject: "Inscription confirmée : {{eventTitle}}",
      emailTemplate: "registration_confirmed",
      pushTitle: "Inscription confirmée",
      pushBody: "Inscription confirmée pour {{eventTitle}}",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "registrationDetails"],
  },

  // 📊 Rapports
  [NotificationType.REPORT_READY]: {
    id: NotificationType.REPORT_READY,
    name: "Rapport prêt",
    description: "Notification quand un rapport est généré",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "reports",
    templates: {
      title: "Rapport disponible",
      message: "Votre rapport {{reportName}} est prêt à être téléchargé",
      emailSubject: "Rapport prêt : {{reportName}}",
      emailTemplate: "report_ready",
      pushTitle: "Rapport disponible",
      pushBody: "{{reportName}} est prêt",
    },
    variables: ["reportName", "reportType", "downloadLink", "generatedAt"],
  },

  // 🔔 Système
  [NotificationType.SYSTEM_ALERT]: {
    id: NotificationType.SYSTEM_ALERT,
    name: "Alerte système",
    description: "Alertes système importantes",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "system",
    templates: {
      title: "Alerte système",
      message: "{{alertMessage}}",
      emailSubject: "Alerte système : {{alertType}}",
      emailTemplate: "system_alert",
      pushTitle: "Alerte système",
      pushBody: "{{alertMessage}}",
    },
    variables: ["alertType", "alertMessage", "severity", "actionRequired"],
  },

  [NotificationType.SYSTEM_MAINTENANCE]: {
    id: NotificationType.SYSTEM_MAINTENANCE,
    name: "Maintenance système",
    description: "Notifications de maintenance planifiée",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "system",
    templates: {
      title: "Maintenance programmée",
      message: "Maintenance système programmée le {{maintenanceDate}} de {{startTime}} à {{endTime}}",
      emailSubject: "Maintenance programmée : {{maintenanceDate}}",
      emailTemplate: "system_maintenance",
      pushTitle: "Maintenance programmée",
      pushBody: "Maintenance le {{maintenanceDate}}",
    },
    variables: ["maintenanceDate", "startTime", "endTime", "duration", "impact"],
  },

  // 👤 Utilisateur
  [NotificationType.WELCOME]: {
    id: NotificationType.WELCOME,
    name: "Bienvenue",
    description: "Message de bienvenue pour nouveaux utilisateurs",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "user",
    templates: {
      title: "Bienvenue sur {{appName}}",
      message: "Bienvenue {{userName}} ! Votre compte a été créé avec succès.",
      emailSubject: "Bienvenue sur {{appName}}",
      emailTemplate: "welcome",
      pushTitle: "Bienvenue !",
      pushBody: "Bienvenue sur {{appName}}",
    },
    variables: ["userName", "appName", "verificationLink", "supportEmail"],
  },

  [NotificationType.PASSWORD_RESET]: {
    id: NotificationType.PASSWORD_RESET,
    name: "Réinitialisation mot de passe",
    description: "Lien de réinitialisation de mot de passe",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Réinitialisation de mot de passe",
      message: "Cliquez sur le lien pour réinitialiser votre mot de passe",
      emailSubject: "Réinitialisation de votre mot de passe",
      emailTemplate: "password_reset",
      smsTemplate: "Code de réinitialisation : {{resetCode}}",
    },
    variables: ["userName", "resetLink", "resetCode", "expiresAt"],
  },

  [NotificationType.ACCOUNT_LOCKED]: {
    id: NotificationType.ACCOUNT_LOCKED,
    name: "Compte verrouillé",
    description: "Notification de verrouillage de compte",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Compte verrouillé",
      message: "Votre compte a été temporairement verrouillé pour des raisons de sécurité",
      emailSubject: "Compte verrouillé - Action requise",
      emailTemplate: "account_locked",
      smsTemplate: "Votre compte AttendanceX a été verrouillé. Contactez le support.",
    },
    variables: ["userName", "lockReason", "unlockTime", "supportContact"],
  },

  [NotificationType.SECURITY_ALERT]: {
    id: NotificationType.SECURITY_ALERT,
    name: "Alerte sécurité",
    description: "Alertes de sécurité importantes",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
    priority: NotificationPriority.URGENT,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Alerte de sécurité",
      message: "Activité suspecte détectée sur votre compte",
      emailSubject: "Alerte de sécurité - Vérification requise",
      emailTemplate: "security_alert",
      smsTemplate: "Alerte sécurité AttendanceX : {{alertMessage}}",
      pushTitle: "Alerte de sécurité",
      pushBody: "Activité suspecte détectée",
    },
    variables: ["alertMessage", "ipAddress", "location", "timestamp", "actionRequired"],
  },

  // 📝 Divers
  [NotificationType.FEEDBACK_REQUEST]: {
    id: NotificationType.FEEDBACK_REQUEST,
    name: "Demande de feedback",
    description: "Demande d'évaluation après un événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "feedback",
    templates: {
      title: "Votre avis compte",
      message: "Comment s'est passé {{eventTitle}} ? Donnez-nous votre avis.",
      emailSubject: "Votre avis sur {{eventTitle}}",
      emailTemplate: "feedback_request",
      pushTitle: "Donnez votre avis",
      pushBody: "Comment s'est passé {{eventTitle}} ?",
    },
    variables: ["eventTitle", "feedbackLink", "organizerName"],
  },

  [NotificationType.APPROVAL_NEEDED]: {
    id: NotificationType.APPROVAL_NEEDED,
    name: "Approbation requise",
    description: "Demande d'approbation pour une action",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "approval",
    templates: {
      title: "Approbation requise",
      message: "{{requestType}} nécessite votre approbation",
      emailSubject: "Approbation requise : {{requestType}}",
      emailTemplate: "approval_needed",
      pushTitle: "Approbation requise",
      pushBody: "{{requestType}} attend votre approbation",
    },
    variables: ["requestType", "requestDetails", "requesterName", "approvalLink"],
  },

  [NotificationType.DEADLINE_APPROACHING]: {
    id: NotificationType.DEADLINE_APPROACHING,
    name: "Échéance proche",
    description: "Rappel d'échéance imminente",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "reminders",
    templates: {
      title: "Échéance dans {{timeRemaining}}",
      message: "{{deadlineType}} expire dans {{timeRemaining}}",
      emailSubject: "Rappel : {{deadlineType}} expire bientôt",
      emailTemplate: "deadline_approaching",
      pushTitle: "Échéance proche",
      pushBody: "{{deadlineType}} expire dans {{timeRemaining}}",
    },
    variables: ["deadlineType", "timeRemaining", "actionRequired", "deadlineDate"],
  },
};

/**
 * Configuration générale des notifications
 */
export const notificationConfig = {
  // Canaux par défaut
  defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],

  // Rate limiting global
  globalRateLimits: {
    perUserPerMinute: parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_MINUTE || "10", 10),
    perUserPerHour: parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_HOUR || "50", 10),
    perUserPerDay: parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_DAY || "200", 10),
    perEventPerDay: parseInt(process.env.NOTIFICATION_RATE_LIMIT_PER_EVENT_PER_DAY || "10", 10),
  },

  // Batching et groupement
  batching: {
    enabled: process.env.NOTIFICATION_BATCHING_ENABLED !== "false",
    intervalMinutes: parseInt(process.env.NOTIFICATION_BATCH_INTERVAL_MINUTES || "15", 10),
    maxNotificationsPerBatch: parseInt(process.env.MAX_NOTIFICATIONS_PER_BATCH || "5", 10),
    batchByType: true,
    batchByChannel: false,
  },

  // Préférences utilisateur
  userPreferences: {
    enabled: process.env.USER_NOTIFICATION_PREFERENCES_ENABLED !== "false",
    defaultOptIn: process.env.DEFAULT_NOTIFICATION_OPT_IN !== "false",
    allowGlobalDisable: true,
    allowChannelCustomization: true,
    allowTypeCustomization: true,
    quietHoursEnabled: true,
    defaultQuietHours: {
      start: "22:00",
      end: "07:00",
      timezone: "Europe/Paris",
    },
  },

  // Interface utilisateur
  ui: {
    maxUnreadNotifications: parseInt(process.env.MAX_UNREAD_NOTIFICATIONS || "100", 10),
    markReadAfterViewSeconds: parseInt(process.env.MARK_READ_AFTER_VIEW_SECONDS || "3", 10),
    showNotificationPreview: true,
    groupNotifications: true,
    soundEnabled: true,
    badgeEnabled: true,
  },

  // Nettoyage automatique
  cleanup: {
    purgeReadAfterDays: parseInt(process.env.PURGE_READ_NOTIFICATIONS_AFTER_DAYS || "30", 10),
    purgeAllAfterDays: parseInt(process.env.PURGE_ALL_NOTIFICATIONS_AFTER_DAYS || "90", 10),
    cleanupIntervalHours: parseInt(process.env.NOTIFICATION_CLEANUP_INTERVAL_HOURS || "24", 10),
    maxNotificationsPerUser: parseInt(process.env.MAX_NOTIFICATIONS_PER_USER || "1000", 10),
  },

  // Retry et failover
  retry: {
    maxAttempts: parseInt(process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS || "3", 10),
    backoffMultiplier: parseFloat(process.env.NOTIFICATION_RETRY_BACKOFF_MULTIPLIER || "2.0"),
    initialDelayMs: parseInt(process.env.NOTIFICATION_RETRY_INITIAL_DELAY_MS || "1000", 10),
    maxDelayMs: parseInt(process.env.NOTIFICATION_RETRY_MAX_DELAY_MS || "30000", 10),
  },

  // Analytics et monitoring
  analytics: {
    trackDelivery: true,
    trackOpens: true,
    trackClicks: true,
    trackUnsubscribes: true,
    generateReports: true,
    retentionDays: parseInt(process.env.NOTIFICATION_ANALYTICS_RETENTION_DAYS || "365", 10),
  },

  // Templates
  templates: {
    defaultLanguage: process.env.DEFAULT_NOTIFICATION_LANGUAGE || "fr",
    supportedLanguages: (process.env.SUPPORTED_NOTIFICATION_LANGUAGES || "fr,en").split(","),
    variablePrefix: "{{",
    variableSuffix: "}}",
    allowCustomTemplates: true,
    templateCacheEnabled: true,
    templateCacheTTL: parseInt(process.env.TEMPLATE_CACHE_TTL_SECONDS || "3600", 10),
  },

  // Sécurité
  security: {
    validateTemplateVariables: true,
    sanitizeContent: true,
    preventSpam: true,
    requireOptIn: false,
    encryptSensitiveData: true,
    auditLog: true,
  },
};

/**
 * Templates par défaut par catégorie
 */
export const notificationCategories = {
  events: {
    name: "Événements",
    description: "Notifications liées aux événements",
    icon: "calendar",
    color: "#3b82f6",
    defaultEnabled: true,
  },
  attendance: {
    name: "Présences",
    description: "Notifications de présence et absences",
    icon: "check-circle",
    color: "#10b981",
    defaultEnabled: true,
  },
  invitations: {
    name: "Invitations",
    description: "Invitations et inscriptions",
    icon: "mail",
    color: "#8b5cf6",
    defaultEnabled: true,
  },
  registration: {
    name: "Inscriptions",
    description: "Confirmations et gestion des inscriptions",
    icon: "user-plus",
    color: "#06b6d4",
    defaultEnabled: true,
  },
  reports: {
    name: "Rapports",
    description: "Génération et disponibilité des rapports",
    icon: "chart-bar",
    color: "#f59e0b",
    defaultEnabled: true,
  },
  system: {
    name: "Système",
    description: "Alertes et maintenance système",
    icon: "cog",
    color: "#ef4444",
    defaultEnabled: true,
  },
  user: {
    name: "Utilisateur",
    description: "Notifications liées au compte utilisateur",
    icon: "user",
    color: "#6366f1",
    defaultEnabled: true,
  },
  security: {
    name: "Sécurité",
    description: "Alertes de sécurité et authentification",
    icon: "shield-check",
    color: "#dc2626",
    defaultEnabled: true,
  },
  feedback: {
    name: "Feedback",
    description: "Demandes d'évaluation et retours",
    icon: "star",
    color: "#eab308",
    defaultEnabled: false,
  },
  approval: {
    name: "Approbations",
    description: "Demandes d'approbation et validations",
    icon: "check",
    color: "#059669",
    defaultEnabled: true,
  },
  reminders: {
    name: "Rappels",
    description: "Rappels d'échéances et tâches",
    icon: "bell",
    color: "#7c3aed",
    defaultEnabled: true,
  },
};

/**
 * Configuration des heures silencieuses par défaut
 */
export const defaultQuietHours = {
  enabled: false,
  start: "22:00",
  end: "07:00",
  timezone: "Europe/Paris",
  excludeUrgent: true,
  excludeChannels: [NotificationChannel.SMS], // SMS toujours autorisés en urgence
  weekdaysOnly: false,
};

/**
 * Configuration des préférences utilisateur par défaut
 */
export const defaultUserPreferences = {
  emailNotifications: {
    enabled: true,
    events: true,
    attendance: true,
    invitations: true,
    reports: false,
    system: true,
    security: true,
    feedback: false,
    reminders: true,
  },
  smsNotifications: {
    enabled: false,
    urgentOnly: true,
    events: false,
    attendance: false,
    security: true,
    system: true,
  },
  pushNotifications: {
    enabled: true,
    events: true,
    attendance: true,
    invitations: true,
    reports: false,
    system: true,
    security: true,
    reminders: true,
    quietHours: defaultQuietHours,
  },
  inAppNotifications: {
    enabled: true,
    events: true,
    attendance: true,
    invitations: true,
    reports: true,
    system: true,
    security: true,
    feedback: true,
    approval: true,
    reminders: true,
    autoMarkRead: false,
    soundEnabled: true,
    badgeEnabled: true,
  },
  webhookNotifications: {
    enabled: false,
    url: "",
    secret: "",
    events: [],
  },
};

/**
 * Validation de la configuration
 */
export function validateNotificationConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vérifier les canaux activés
  const enabledChannels = Object.values(notificationChannels).filter((channel) => channel.enabled);
  if (enabledChannels.length === 0) {
    errors.push("At least one notification channel must be enabled");
  }

  // Vérifier les configurations des providers
  if (notificationChannels[NotificationChannel.EMAIL].enabled) {
    const emailSettings = notificationChannels[NotificationChannel.EMAIL].settings;
    if (!emailSettings.defaultProvider) {
      errors.push("Email provider must be configured when email notifications are enabled");
    }
  }

  if (notificationChannels[NotificationChannel.SMS].enabled) {
    const smsSettings = notificationChannels[NotificationChannel.SMS].settings;
    if (!smsSettings.defaultProvider) {
      errors.push("SMS provider must be configured when SMS notifications are enabled");
    }
  }

  if (notificationChannels[NotificationChannel.PUSH].enabled) {
    const pushSettings = notificationChannels[NotificationChannel.PUSH].settings;
    if (!pushSettings.fcmServerKey && !pushSettings.vapidPublicKey) {
      errors.push("Push notification keys must be configured when push notifications are enabled");
    }
  }

  // Vérifier les templates
  for (const [typeId, typeConfig] of Object.entries(notificationTypes)) {
    if (!typeConfig.templates.title || !typeConfig.templates.message) {
      errors.push(`Notification type ${typeId} is missing required templates`);
    }

    // Vérifier que les canaux par défaut sont activés
    const invalidChannels = typeConfig.defaultChannels.filter(
      (channel) => !notificationChannels[channel].enabled
    );
    if (invalidChannels.length > 0) {
      console.warn(`Notification type ${typeId} has default channels that are disabled: ${invalidChannels.join(", ")}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Obtenir la configuration d'un type de notification
 */
export function getNotificationTypeConfig(type: NotificationType): NotificationTypeConfig {
  const config = notificationTypes[type];
  if (!config) {
    throw new Error(`Notification type configuration not found: ${type}`);
  }
  return config;
}

/**
 * Obtenir la configuration d'un canal de notification
 */
export function getNotificationChannelConfig(channel: NotificationChannel): NotificationChannelConfig {
  const config = notificationChannels[channel];
  if (!config) {
    throw new Error(`Notification channel configuration not found: ${channel}`);
  }
  return config;
}

/**
 * Obtenir les canaux activés pour un type de notification
 */
export function getEnabledChannelsForType(type: NotificationType): NotificationChannel[] {
  const typeConfig = getNotificationTypeConfig(type);
  return typeConfig.defaultChannels.filter((channel) =>
    notificationChannels[channel].enabled
  );
}

/**
 * Vérifier si un canal peut envoyer un type de notification
 */
export function canChannelSendType(channel: NotificationChannel, type: NotificationType): boolean {
  const channelConfig = getNotificationChannelConfig(channel);
  const typeConfig = getNotificationTypeConfig(type);

  if (!channelConfig.enabled) {
    return false;
  }

  // Vérifier les restrictions par urgence
  if (channelConfig.settings.urgentOnly && !typeConfig.urgent) {
    return false;
  }

  return true;
}

/**
 * Obtenir le template pour un type et canal spécifique
 */
export function getTemplateForChannel(
  type: NotificationType,
  channel: NotificationChannel
): { title: string; content: string; subject?: string } {
  const typeConfig = getNotificationTypeConfig(type);
  const templates = typeConfig.templates;

  switch (channel) {
  case NotificationChannel.EMAIL:
    return {
      title: templates.title,
      content: templates.message,
      subject: templates.emailSubject || templates.title,
    };

  case NotificationChannel.SMS:
    return {
      title: templates.title,
      content: templates.smsTemplate || templates.message,
    };

  case NotificationChannel.PUSH:
    return {
      title: templates.pushTitle || templates.title,
      content: templates.pushBody || templates.message,
    };

  case NotificationChannel.IN_APP:
    return {
      title: templates.title,
      content: templates.message,
    };

  case NotificationChannel.WEBHOOK:
    return {
      title: templates.title,
      content: JSON.stringify(templates.webhookPayload || {message: templates.message}),
    };

  default:
    return {
      title: templates.title,
      content: templates.message,
    };
  }
}

/**
 * Remplacer les variables dans un template
 */
export function processTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let processed = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    processed = processed.replace(regex, String(value || ""));
  });

  return processed;
}

/**
 * Vérifier les limites de taux pour un utilisateur
 */
export function checkRateLimit(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
  recentNotifications: Array<{ type: NotificationType; channel: NotificationChannel; createdAt: Date }>
): { allowed: boolean; reason?: string; retryAfter?: number } {
  const now = new Date();
  const typeConfig = getNotificationTypeConfig(type);
  const channelConfig = getNotificationChannelConfig(channel);

  // Vérifier les limites globales
  const globalLimits = notificationConfig.globalRateLimits;

  // Limites par minute
  const lastMinute = new Date(now.getTime() - 60 * 1000);
  const countLastMinute = recentNotifications.filter((n) =>
    n.createdAt >= lastMinute && n.channel === channel
  ).length;

  if (countLastMinute >= (channelConfig.settings.rateLimitPerMinute || globalLimits.perUserPerMinute)) {
    return {
      allowed: false,
      reason: "Rate limit exceeded for this minute",
      retryAfter: 60 - Math.floor((now.getTime() - lastMinute.getTime()) / 1000),
    };
  }

  // Limites par heure
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const countLastHour = recentNotifications.filter((n) =>
    n.createdAt >= lastHour && n.channel === channel
  ).length;

  if (countLastHour >= (channelConfig.settings.rateLimitPerHour || globalLimits.perUserPerHour)) {
    return {
      allowed: false,
      reason: "Rate limit exceeded for this hour",
      retryAfter: 3600 - Math.floor((now.getTime() - lastHour.getTime()) / 1000),
    };
  }

  // Limites par jour
  const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const countLastDay = recentNotifications.filter((n) =>
    n.createdAt >= lastDay && n.channel === channel
  ).length;

  if (countLastDay >= (channelConfig.settings.rateLimitPerDay || globalLimits.perUserPerDay)) {
    return {
      allowed: false,
      reason: "Rate limit exceeded for this day",
      retryAfter: 86400 - Math.floor((now.getTime() - lastDay.getTime()) / 1000),
    };
  }

  // Limites spécifiques au type
  if (typeConfig.rateLimits) {
    if (typeConfig.rateLimits.perUserPerHour) {
      const typeCountLastHour = recentNotifications.filter((n) =>
        n.createdAt >= lastHour && n.type === type
      ).length;

      if (typeCountLastHour >= typeConfig.rateLimits.perUserPerHour) {
        return {
          allowed: false,
          reason: `Rate limit exceeded for ${type} notifications this hour`,
          retryAfter: 3600 - Math.floor((now.getTime() - lastHour.getTime()) / 1000),
        };
      }
    }
  }

  return {allowed: true};
}

// Export par défaut
export default {
  notificationChannels,
  notificationTypes,
  notificationConfig,
  notificationCategories,
  defaultQuietHours,
  defaultUserPreferences,
  validateNotificationConfig,
  getNotificationTypeConfig,
  getNotificationChannelConfig,
  getEnabledChannelsForType,
  canChannelSendType,
  getTemplateForChannel,
  processTemplate,
  checkRateLimit,
};
