import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
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

  [NotificationType.DAILY_EVENT_REMINDER]: {
    id: NotificationType.DAILY_EVENT_REMINDER,
    name: "Rappel quotidien d'événement",
    description: "Rappel quotidien des événements du jour",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Événements du jour",
      message: "Vous avez {{eventCount}} événement(s) aujourd'hui",
      pushTitle: "Événements du jour",
      pushBody: "{{eventCount}} événement(s) aujourd'hui",
    },
    variables: ["eventCount", "eventList"],
  },

  [NotificationType.WEEKLY_EVENT_REMINDER]: {
    id: NotificationType.WEEKLY_EVENT_REMINDER,
    name: "Rappel hebdomadaire d'événement",
    description: "Rappel hebdomadaire des événements de la semaine",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Événements de la semaine",
      message: "Voici vos événements pour cette semaine",
      emailSubject: "Vos événements de la semaine",
      emailTemplate: "weekly_events",
    },
    variables: ["eventList", "weekStart", "weekEnd"],
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

  [NotificationType.LATE_ARRIVAL]: {
    id: NotificationType.LATE_ARRIVAL,
    name: "Arrivée tardive",
    description: "Notification d'arrivée tardive à un événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "attendance",
    templates: {
      title: "Arrivée tardive détectée",
      message: "Vous êtes arrivé(e) en retard à {{eventTitle}}",
      pushTitle: "Arrivée tardive",
      pushBody: "Retard détecté pour {{eventTitle}}",
    },
    variables: ["eventTitle", "delayMinutes", "eventLocation"],
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

  [NotificationType.ATTENDANCE_CONFIRMATION]: {
    id: NotificationType.ATTENDANCE_CONFIRMATION,
    name: "Confirmation de présence",
    description: "Demande de confirmation de présence",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "attendance",
    templates: {
      title: "Confirmez votre présence",
      message: "Veuillez confirmer votre présence à {{eventTitle}}",
      emailSubject: "Confirmation de présence requise : {{eventTitle}}",
      emailTemplate: "attendance_confirmation",
      pushTitle: "Confirmation requise",
      pushBody: "Confirmez votre présence à {{eventTitle}}",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "confirmationLink"],
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

  [NotificationType.ATTENDANCE_VALIDATION_REQUIRED]: {
    id: NotificationType.ATTENDANCE_VALIDATION_REQUIRED,
    name: "Validation de présence requise",
    description: "Demande de validation de présence par un superviseur",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "attendance",
    templates: {
      title: "Validation requise",
      message: "La présence de {{userName}} à {{eventTitle}} nécessite votre validation",
      emailSubject: "Validation de présence requise",
      emailTemplate: "attendance_validation",
      pushTitle: "Validation requise",
      pushBody: "Validation de présence pour {{userName}}",
    },
    variables: ["userName", "eventTitle", "validationLink"],
  },

  [NotificationType.ATTENDANCE_REMOVED]: {
    id: NotificationType.ATTENDANCE_REMOVED,
    name: "Présence supprimée",
    description: "Notification de suppression de présence",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "attendance",
    templates: {
      title: "Présence supprimée",
      message: "Votre présence à {{eventTitle}} a été supprimée",
      emailSubject: "Présence supprimée : {{eventTitle}}",
      emailTemplate: "attendance_removed",
      pushTitle: "Présence supprimée",
      pushBody: "Présence supprimée pour {{eventTitle}}",
    },
    variables: ["eventTitle", "reason", "removedBy"],
  },

  [NotificationType.ATTENDANCE_SUMMARY]: {
    id: NotificationType.ATTENDANCE_SUMMARY,
    name: "Résumé de présence",
    description: "Résumé périodique des présences",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "attendance",
    templates: {
      title: "Résumé de vos présences",
      message: "Voici votre résumé de présence pour {{period}}",
      emailSubject: "Résumé de présence - {{period}}",
      emailTemplate: "attendance_summary",
    },
    variables: ["period", "totalEvents", "attendedEvents", "missedEvents"],
  },

  [NotificationType.ATTENDANCE_ALERT]: {
    id: NotificationType.ATTENDANCE_ALERT,
    name: "Alerte de présence",
    description: "Alerte pour problème de présence",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "attendance",
    templates: {
      title: "Alerte de présence",
      message: "Problème détecté avec votre présence : {{issue}}",
      emailSubject: "Alerte de présence",
      emailTemplate: "attendance_alert",
      pushTitle: "Alerte de présence",
      pushBody: "Problème de présence détecté",
    },
    variables: ["issue", "eventTitle", "actionRequired"],
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

  [NotificationType.SIGNIFICANT_DELAY]: {
    id: NotificationType.SIGNIFICANT_DELAY,
    name: "Retard important",
    description: "Notification de retard significatif",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Retard important",
      message: "Un retard de {{delay}} minutes a été détecté pour {{eventTitle}}",
      smsTemplate: "Retard de {{delay}} min pour {{eventTitle}}",
      pushTitle: "Retard important",
      pushBody: "{{delay}} min de retard pour {{eventTitle}}",
    },
    variables: ["delay", "eventTitle", "newEstimatedTime"],
  },

  [NotificationType.ACHIEVEMENT_UNLOCKED]: {
    id: NotificationType.ACHIEVEMENT_UNLOCKED,
    name: "Succès débloqué",
    description: "Notification de nouveau succès",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "gamification",
    templates: {
      title: "Succès débloqué !",
      message: "Félicitations ! Vous avez débloqué : {{achievementName}}",
      pushTitle: "Succès débloqué !",
      pushBody: "{{achievementName}} débloqué !",
    },
    variables: ["achievementName", "achievementDescription", "points"],
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

  [NotificationType.ADMIN_ALERT]: {
    id: NotificationType.ADMIN_ALERT,
    name: "Alerte administrateur",
    description: "Alerte destinée aux administrateurs",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "admin",
    templates: {
      title: "Alerte administrateur",
      message: "Action requise : {{message}}",
      emailSubject: "Alerte admin : {{alertType}}",
      emailTemplate: "admin_alert",
      pushTitle: "Alerte admin",
      pushBody: "{{message}}",
    },
    variables: ["alertType", "message", "actionRequired", "priority"],
  },

  [NotificationType.ONBOARDING_STEP]: {
    id: NotificationType.ONBOARDING_STEP,
    name: "Étape d'intégration",
    description: "Guide d'intégration étape par étape",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "onboarding",
    templates: {
      title: "Prochaine étape",
      message: "Continuez votre intégration : {{stepDescription}}",
      pushTitle: "Prochaine étape",
      pushBody: "{{stepDescription}}",
    },
    variables: ["stepDescription", "stepNumber", "totalSteps", "actionLink"],
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

  // Nouveaux types ajoutés
  [NotificationType.NEW_EVENT]: {
    id: NotificationType.NEW_EVENT,
    name: "Nouvel événement",
    description: "Notification de création d'événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Nouvel événement : {{eventTitle}}",
      message: "Un nouvel événement a été créé le {{eventDate}}",
      emailSubject: "Nouvel événement : {{eventTitle}}",
      emailTemplate: "new_event",
      pushTitle: "Nouvel événement",
      pushBody: "{{eventTitle}} - {{eventDate}}",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "organizerName"],
  },

  [NotificationType.ABSENT_WARNING]: {
    id: NotificationType.ABSENT_WARNING,
    name: "Avertissement d'absence",
    description: "Avertissement pour absence non justifiée",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "attendance",
    templates: {
      title: "Absence non justifiée",
      message: "Votre absence à {{eventTitle}} n'a pas été justifiée",
      emailSubject: "Avertissement d'absence : {{eventTitle}}",
      emailTemplate: "absent_warning",
      pushTitle: "Absence non justifiée",
      pushBody: "Absence à {{eventTitle}} non justifiée",
    },
    variables: ["eventTitle", "eventDate", "warningLevel"],
  },

  [NotificationType.ACCOUNT_CREATED]: {
    id: NotificationType.ACCOUNT_CREATED,
    name: "Compte créé",
    description: "Confirmation de création de compte",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "user",
    templates: {
      title: "Compte créé avec succès",
      message: "Votre compte a été créé. Bienvenue sur Attendance-X !",
      emailSubject: "Bienvenue sur Attendance-X",
      emailTemplate: "account_created",
    },
    variables: ["userName", "verificationLink"],
  },

  [NotificationType.EMAIL_VERIFICATION]: {
    id: NotificationType.EMAIL_VERIFICATION,
    name: "Vérification d'email",
    description: "Demande de vérification d'adresse email",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Vérifiez votre adresse email",
      message: "Cliquez sur le lien pour vérifier votre adresse email",
      emailSubject: "Vérification de votre adresse email",
      emailTemplate: "email_verification",
    },
    variables: ["userName", "verificationLink", "expiresAt"],
  },

  [NotificationType.PHONE_VERIFICATION]: {
    id: NotificationType.PHONE_VERIFICATION,
    name: "Vérification de téléphone",
    description: "Demande de vérification de numéro de téléphone",
    defaultChannels: [NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Code de vérification",
      message: "Votre code de vérification : {{code}}",
      smsTemplate: "Code de vérification AttendanceX : {{code}}",
    },
    variables: ["code", "expiresAt"],
  },

  [NotificationType.TWO_FACTOR_CODE]: {
    id: NotificationType.TWO_FACTOR_CODE,
    name: "Code d'authentification à deux facteurs",
    description: "Code pour l'authentification à deux facteurs",
    defaultChannels: [NotificationChannel.SMS, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Code d'authentification",
      message: "Votre code d'authentification : {{code}}",
      emailSubject: "Code d'authentification à deux facteurs",
      emailTemplate: "two_factor_code",
      smsTemplate: "Code 2FA AttendanceX : {{code}}",
    },
    variables: ["code", "expiresAt", "ipAddress"],
  },

  [NotificationType.WEEKLY_REPORT]: {
    id: NotificationType.WEEKLY_REPORT,
    name: "Rapport hebdomadaire",
    description: "Rapport hebdomadaire d'activité",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "reports",
    templates: {
      title: "Votre rapport hebdomadaire",
      message: "Voici votre résumé d'activité pour cette semaine",
      emailSubject: "Rapport hebdomadaire - Semaine du {{weekStart}}",
      emailTemplate: "weekly_report",
    },
    variables: ["weekStart", "weekEnd", "totalEvents", "attendanceRate"],
  },

  [NotificationType.MONTHLY_REPORT]: {
    id: NotificationType.MONTHLY_REPORT,
    name: "Rapport mensuel",
    description: "Rapport mensuel d'activité",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "reports",
    templates: {
      title: "Votre rapport mensuel",
      message: "Voici votre résumé d'activité pour ce mois",
      emailSubject: "Rapport mensuel - {{month}} {{year}}",
      emailTemplate: "monthly_report",
    },
    variables: ["month", "year", "totalEvents", "attendanceRate", "trends"],
  },

  [NotificationType.ACCOUNT_STATUS_CHANGED]: {
    id: NotificationType.ACCOUNT_STATUS_CHANGED,
    name: "Statut de compte modifié",
    description: "Notification de changement de statut de compte",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "user",
    templates: {
      title: "Statut de compte modifié",
      message: "Le statut de votre compte a été modifié : {{newStatus}}",
      emailSubject: "Changement de statut de compte",
      emailTemplate: "account_status_changed",
      pushTitle: "Statut modifié",
      pushBody: "Statut de compte : {{newStatus}}",
    },
    variables: ["newStatus", "previousStatus", "reason", "changedBy"],
  },

  [NotificationType.USER_MENTIONED]: {
    id: NotificationType.USER_MENTIONED,
    name: "Utilisateur mentionné",
    description: "Notification quand un utilisateur est mentionné",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "social",
    templates: {
      title: "Vous avez été mentionné",
      message: "{{userName}} vous a mentionné dans {{context}}",
      pushTitle: "Mention",
      pushBody: "{{userName}} vous a mentionné",
    },
    variables: ["userName", "context", "mentionLink"],
  },

  [NotificationType.EMAIL_CHANGED]: {
    id: NotificationType.EMAIL_CHANGED,
    name: "Email modifié",
    description: "Notification de changement d'adresse email",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Adresse email modifiée",
      message: "Votre adresse email a été modifiée avec succès",
      emailSubject: "Changement d'adresse email confirmé",
      emailTemplate: "email_changed",
    },
    variables: ["oldEmail", "newEmail", "changedAt"],
  },

  [NotificationType.PHONE_CHANGED]: {
    id: NotificationType.PHONE_CHANGED,
    name: "Téléphone modifié",
    description: "Notification de changement de numéro de téléphone",
    defaultChannels: [NotificationChannel.SMS, NotificationChannel.PUSH],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "security",
    templates: {
      title: "Numéro de téléphone modifié",
      message: "Votre numéro de téléphone a été modifié avec succès",
      smsTemplate: "Votre numéro AttendanceX a été modifié",
      pushTitle: "Téléphone modifié",
      pushBody: "Numéro de téléphone mis à jour",
    },
    variables: ["oldPhone", "newPhone", "changedAt"],
  },

  [NotificationType.USER_DELETED]: {
    id: NotificationType.USER_DELETED,
    name: "Utilisateur supprimé",
    description: "Notification de suppression d'utilisateur",
    defaultChannels: [NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "user",
    templates: {
      title: "Compte supprimé",
      message: "Votre compte a été supprimé. Toutes vos données ont été effacées",
      emailSubject: "Suppression de compte confirmée",
      emailTemplate: "user_deleted",
    },
    variables: ["userName", "deletedAt", "reason"],
  },

  [NotificationType.PERMISSIONS_CHANGED]: {
    id: NotificationType.PERMISSIONS_CHANGED,
    name: "Permissions modifiées",
    description: "Notification de changement de permissions",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: false,
    category: "user",
    templates: {
      title: "Permissions modifiées",
      message: "Vos permissions ont été mises à jour",
      emailSubject: "Mise à jour de vos permissions",
      emailTemplate: "permissions_changed",
      pushTitle: "Permissions mises à jour",
      pushBody: "Vos permissions ont changé",
    },
    variables: ["newPermissions", "removedPermissions", "changedBy"],
  },

  [NotificationType.ROLE_CHANGED]: {
    id: NotificationType.ROLE_CHANGED,
    name: "Rôle modifié",
    description: "Notification de changement de rôle",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    urgent: false,
    userConfigurable: false,
    category: "user",
    templates: {
      title: "Rôle modifié",
      message: "Votre rôle a été modifié : {{newRole}}",
      emailSubject: "Changement de rôle",
      emailTemplate: "role_changed",
      pushTitle: "Rôle modifié",
      pushBody: "Nouveau rôle : {{newRole}}",
    },
    variables: ["newRole", "previousRole", "changedBy"],
  },

  [NotificationType.CALENDAR_CONFLICT]: {
    id: NotificationType.CALENDAR_CONFLICT,
    name: "Conflit de calendrier",
    description: "Notification de conflit dans le calendrier",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "calendar",
    templates: {
      title: "Conflit de calendrier",
      message: "Conflit détecté entre {{event1}} et {{event2}}",
      emailSubject: "Conflit de calendrier détecté",
      emailTemplate: "calendar_conflict",
      pushTitle: "Conflit de calendrier",
      pushBody: "Conflit entre {{event1}} et {{event2}}",
    },
    variables: ["event1", "event2", "conflictTime", "resolutionSuggestion"],
  },

  [NotificationType.EVENT_INVITATION]: {
    id: NotificationType.EVENT_INVITATION,
    name: "Invitation à un événement",
    description: "Invitation à participer à un événement",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "invitations",
    templates: {
      title: "Invitation : {{eventTitle}}",
      message: "Vous êtes invité(e) à participer à {{eventTitle}} le {{eventDate}}",
      emailSubject: "Invitation : {{eventTitle}}",
      emailTemplate: "event_invitation",
      pushTitle: "Invitation événement",
      pushBody: "{{eventTitle}} - {{eventDate}}",
    },
    variables: ["eventTitle", "eventDate", "eventLocation", "organizerName", "rsvpLink"],
  },

  [NotificationType.EVENT_REMOVED]: {
    id: NotificationType.EVENT_REMOVED,
    name: "Événement supprimé",
    description: "Notification de suppression d'événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "events",
    templates: {
      title: "Événement supprimé",
      message: "L'événement {{eventTitle}} a été supprimé",
      emailSubject: "Suppression d'événement : {{eventTitle}}",
      emailTemplate: "event_removed",
      pushTitle: "Événement supprimé",
      pushBody: "{{eventTitle}} a été supprimé",
    },
    variables: ["eventTitle", "eventDate", "reason", "removedBy"],
  },

  [NotificationType.EVENT_FEEDBACK_REQUEST]: {
    id: NotificationType.EVENT_FEEDBACK_REQUEST,
    name: "Demande de feedback sur événement",
    description: "Demande d'avis sur un événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "feedback",
    templates: {
      title: "Votre avis sur {{eventTitle}}",
      message: "Partagez votre expérience concernant {{eventTitle}}",
      emailSubject: "Feedback demandé : {{eventTitle}}",
      emailTemplate: "event_feedback_request",
      pushTitle: "Donnez votre avis",
      pushBody: "Feedback sur {{eventTitle}}",
    },
    variables: ["eventTitle", "feedbackLink", "organizerName"],
  },

  [NotificationType.EVENT_CONFIRMED]: {
    id: NotificationType.EVENT_CONFIRMED,
    name: "Événement confirmé",
    description: "Confirmation de participation à un événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Participation confirmée",
      message: "Votre participation à {{eventTitle}} a été confirmée",
      pushTitle: "Participation confirmée",
      pushBody: "{{eventTitle}} - Participation confirmée",
    },
    variables: ["eventTitle", "eventDate", "eventLocation"],
  },

  [NotificationType.EVENT_REJECTED]: {
    id: NotificationType.EVENT_REJECTED,
    name: "Événement refusé",
    description: "Refus de participation à un événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "events",
    templates: {
      title: "Participation refusée",
      message: "Votre refus de participation à {{eventTitle}} a été enregistré",
      pushTitle: "Participation refusée",
      pushBody: "{{eventTitle}} - Participation refusée",
    },
    variables: ["eventTitle", "eventDate", "reason"],
  },

  [NotificationType.EVENT_POSTPONED]: {
    id: NotificationType.EVENT_POSTPONED,
    name: "Événement reporté",
    description: "Notification de report d'événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "events",
    templates: {
      title: "Événement reporté",
      message: "{{eventTitle}} a été reporté. Nouvelle date : {{newDate}}",
      emailSubject: "Report d'événement : {{eventTitle}}",
      emailTemplate: "event_postponed",
      smsTemplate: "{{eventTitle}} reporté au {{newDate}}",
      pushTitle: "Événement reporté",
      pushBody: "{{eventTitle}} reporté au {{newDate}}",
    },
    variables: ["eventTitle", "originalDate", "newDate", "reason"],
  },

  [NotificationType.EVENT_RESCHEDULED]: {
    id: NotificationType.EVENT_RESCHEDULED,
    name: "Événement reprogrammé",
    description: "Notification de reprogrammation d'événement",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "events",
    templates: {
      title: "Événement reprogrammé",
      message: "{{eventTitle}} a été reprogrammé pour le {{newDate}} à {{newTime}}",
      emailSubject: "Reprogrammation : {{eventTitle}}",
      emailTemplate: "event_rescheduled",
      pushTitle: "Événement reprogrammé",
      pushBody: "{{eventTitle}} - {{newDate}} {{newTime}}",
    },
    variables: ["eventTitle", "originalDate", "originalTime", "newDate", "newTime"],
  },

  [NotificationType.CALENDAR_UPDATE]: {
    id: NotificationType.CALENDAR_UPDATE,
    name: "Mise à jour du calendrier",
    description: "Notification de mise à jour du calendrier",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.LOW,
    urgent: false,
    userConfigurable: true,
    category: "calendar",
    templates: {
      title: "Calendrier mis à jour",
      message: "Votre calendrier a été mis à jour avec {{changeCount}} modification(s)",
      pushTitle: "Calendrier mis à jour",
      pushBody: "{{changeCount}} modification(s)",
    },
    variables: ["changeCount", "changes", "updatedBy"],
  },

  [NotificationType.ORGANIZER_ALERT]: {
    id: NotificationType.ORGANIZER_ALERT,
    name: "Alerte organisateur",
    description: "Alerte destinée aux organisateurs",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    urgent: true,
    userConfigurable: false,
    category: "organizer",
    templates: {
      title: "Alerte organisateur",
      message: "Action requise pour {{eventTitle}} : {{message}}",
      emailSubject: "Alerte organisateur : {{eventTitle}}",
      emailTemplate: "organizer_alert",
      pushTitle: "Alerte organisateur",
      pushBody: "{{eventTitle}} - Action requise",
    },
    variables: ["eventTitle", "message", "actionRequired", "priority"],
  },

  [NotificationType.ORGANIZER_UPDATE]: {
    id: NotificationType.ORGANIZER_UPDATE,
    name: "Mise à jour organisateur",
    description: "Mise à jour pour les organisateurs",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "organizer",
    templates: {
      title: "Mise à jour organisateur",
      message: "Mise à jour concernant {{eventTitle}} : {{message}}",
      pushTitle: "Mise à jour",
      pushBody: "{{eventTitle}} - {{message}}",
    },
    variables: ["eventTitle", "message", "updateType"],
  },

  [NotificationType.STATUS_CHANGE]: {
    id: NotificationType.STATUS_CHANGE,
    name: "Changement de statut",
    description: "Notification de changement de statut général",
    defaultChannels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    priority: NotificationPriority.MEDIUM,
    urgent: false,
    userConfigurable: true,
    category: "general",
    templates: {
      title: "Statut modifié",
      message: "Le statut de {{entity}} a été modifié : {{newStatus}}",
      pushTitle: "Statut modifié",
      pushBody: "{{entity}} - {{newStatus}}",
    },
    variables: ["entity", "newStatus", "previousStatus", "changedBy"],
  },

  [NotificationType.ORGANIZATION_SUSPENDED]: {
    id: NotificationType.ORGANIZATION_SUSPENDED,
    name: "Organisation suspendue",
    description: "Notification de suspension d'organisation",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
    priority: NotificationPriority.URGENT,
    urgent: true,
    userConfigurable: false,
    category: "organization",
    templates: {
      title: "Organisation suspendue",
      message: "Votre organisation a été suspendue. Raison: {{reason}}",
      emailSubject: "Suspension d'organisation",
      emailTemplate: "organization_suspended",
      smsTemplate: "Votre organisation AttendanceX a été suspendue",
      pushTitle: "Organisation suspendue",
      pushBody: "Organisation suspendue - {{reason}}",
    },
    variables: ["reason", "suspendedBy", "suspendedAt", "contactInfo"],
  },

  [NotificationType.ORGANIZATION_REACTIVATED]: {
    id: NotificationType.ORGANIZATION_REACTIVATED,
    name: "Organisation réactivée",
    description: "Notification de réactivation d'organisation",
    defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    urgent: false,
    userConfigurable: false,
    category: "organization",
    templates: {
      title: "Organisation réactivée",
      message: "Votre organisation a été réactivée",
      emailSubject: "Réactivation d'organisation",
      emailTemplate: "organization_reactivated",
      pushTitle: "Organisation réactivée",
      pushBody: "Votre organisation est de nouveau active",
    },
    variables: ["reactivatedBy", "reactivatedAt", "welcomeBackMessage"],
  },
};

/**
 * Configuration par défaut des notifications
 */
export const defaultNotificationConfig = {
  retryAttempts: 3,
  retryDelayMs: 5000,
  batchSize: 100,
  rateLimitWindow: 60000, // 1 minute
  maxNotificationsPerUser: 1000,
  cleanupAfterDays: 90,
};

/**
 * Obtenir la configuration d'un type de notification
 */
export function getNotificationTypeConfig(type: NotificationType): NotificationTypeConfig | undefined {
  return notificationTypes[type];
}

/**
 * Obtenir la configuration d'un canal de notification
 */
export function getNotificationChannelConfig(channel: NotificationChannel): NotificationChannelConfig | undefined {
  return notificationChannels[channel];
}

/**
 * Vérifier si un type de notification est activé
 */
export function isNotificationTypeEnabled(type: NotificationType): boolean {
  const config = getNotificationTypeConfig(type);
  return config !== undefined;
}

/**
 * Vérifier si un canal de notification est activé
 */
export function isNotificationChannelEnabled(channel: NotificationChannel): boolean {
  const config = getNotificationChannelConfig(channel);
  return config?.enabled ?? false;
}