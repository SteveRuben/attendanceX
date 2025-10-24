// shared/src/constants/appointment-statuses.ts

// Statuts des rendez-vous
export const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show'
} as const;

// Labels des statuts en français
export const APPOINTMENT_STATUS_LABELS = {
  [APPOINTMENT_STATUSES.SCHEDULED]: 'Programmé',
  [APPOINTMENT_STATUSES.CONFIRMED]: 'Confirmé',
  [APPOINTMENT_STATUSES.COMPLETED]: 'Terminé',
  [APPOINTMENT_STATUSES.CANCELLED]: 'Annulé',
  [APPOINTMENT_STATUSES.NO_SHOW]: 'Absent'
} as const;

// Couleurs des statuts pour l'affichage
export const APPOINTMENT_STATUS_COLORS = {
  [APPOINTMENT_STATUSES.SCHEDULED]: '#FFA500', // Orange
  [APPOINTMENT_STATUSES.CONFIRMED]: '#4CAF50', // Vert
  [APPOINTMENT_STATUSES.COMPLETED]: '#2196F3', // Bleu
  [APPOINTMENT_STATUSES.CANCELLED]: '#F44336', // Rouge
  [APPOINTMENT_STATUSES.NO_SHOW]: '#9E9E9E'    // Gris
} as const;

// Types de rappels
export const REMINDER_TYPES = {
  EMAIL: 'email',
  SMS: 'sms'
} as const;

// Labels des types de rappels
export const REMINDER_TYPE_LABELS = {
  [REMINDER_TYPES.EMAIL]: 'Email',
  [REMINDER_TYPES.SMS]: 'SMS'
} as const;

// Statuts des rappels
export const REMINDER_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed'
} as const;

// Labels des statuts de rappels
export const REMINDER_STATUS_LABELS = {
  [REMINDER_STATUSES.PENDING]: 'En attente',
  [REMINDER_STATUSES.SENT]: 'Envoyé',
  [REMINDER_STATUSES.FAILED]: 'Échec'
} as const;

// Méthodes de rappel préférées
export const REMINDER_METHODS = {
  EMAIL: 'email',
  SMS: 'sms',
  BOTH: 'both'
} as const;

// Labels des méthodes de rappel
export const REMINDER_METHOD_LABELS = {
  [REMINDER_METHODS.EMAIL]: 'Email uniquement',
  [REMINDER_METHODS.SMS]: 'SMS uniquement',
  [REMINDER_METHODS.BOTH]: 'Email et SMS'
} as const;

// Types de conflits de rendez-vous
export const APPOINTMENT_CONFLICT_TYPES = {
  TIME_OVERLAP: 'time_overlap',
  PRACTITIONER_UNAVAILABLE: 'practitioner_unavailable',
  OUTSIDE_WORKING_HOURS: 'outside_working_hours',
  SERVICE_UNAVAILABLE: 'service_unavailable'
} as const;

// Messages des types de conflits
export const APPOINTMENT_CONFLICT_MESSAGES = {
  [APPOINTMENT_CONFLICT_TYPES.TIME_OVERLAP]: 'Ce créneau chevauche avec un autre rendez-vous',
  [APPOINTMENT_CONFLICT_TYPES.PRACTITIONER_UNAVAILABLE]: 'Le praticien n\'est pas disponible à ce moment',
  [APPOINTMENT_CONFLICT_TYPES.OUTSIDE_WORKING_HOURS]: 'Ce créneau est en dehors des heures d\'ouverture',
  [APPOINTMENT_CONFLICT_TYPES.SERVICE_UNAVAILABLE]: 'Ce service n\'est pas disponible à ce moment'
} as const;

// Actions d'historique des rendez-vous
export const APPOINTMENT_HISTORY_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  RESCHEDULED: 'rescheduled'
} as const;

// Labels des actions d'historique
export const APPOINTMENT_HISTORY_ACTION_LABELS = {
  [APPOINTMENT_HISTORY_ACTIONS.CREATED]: 'Créé',
  [APPOINTMENT_HISTORY_ACTIONS.UPDATED]: 'Modifié',
  [APPOINTMENT_HISTORY_ACTIONS.CANCELLED]: 'Annulé',
  [APPOINTMENT_HISTORY_ACTIONS.COMPLETED]: 'Terminé',
  [APPOINTMENT_HISTORY_ACTIONS.RESCHEDULED]: 'Reprogrammé'
} as const;

// Types d'acteurs pour l'historique
export const APPOINTMENT_HISTORY_ACTOR_TYPES = {
  PRACTITIONER: 'practitioner',
  CLIENT: 'client',
  SYSTEM: 'system'
} as const;

// Labels des types d'acteurs
export const APPOINTMENT_HISTORY_ACTOR_TYPE_LABELS = {
  [APPOINTMENT_HISTORY_ACTOR_TYPES.PRACTITIONER]: 'Praticien',
  [APPOINTMENT_HISTORY_ACTOR_TYPES.CLIENT]: 'Client',
  [APPOINTMENT_HISTORY_ACTOR_TYPES.SYSTEM]: 'Système'
} as const;

// Jours de la semaine
export const WEEKDAYS = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday'
} as const;

// Labels des jours de la semaine
export const WEEKDAY_LABELS = {
  [WEEKDAYS.MONDAY]: 'Lundi',
  [WEEKDAYS.TUESDAY]: 'Mardi',
  [WEEKDAYS.WEDNESDAY]: 'Mercredi',
  [WEEKDAYS.THURSDAY]: 'Jeudi',
  [WEEKDAYS.FRIDAY]: 'Vendredi',
  [WEEKDAYS.SATURDAY]: 'Samedi',
  [WEEKDAYS.SUNDAY]: 'Dimanche'
} as const;

// Valeurs par défaut pour les rendez-vous
export const APPOINTMENT_DEFAULTS = {
  DURATION_MINUTES: 30,
  BUFFER_TIME_MINUTES: 5,
  ADVANCE_BOOKING_DAYS: 30,
  CANCELLATION_DEADLINE_HOURS: 24,
  MAX_APPOINTMENTS_PER_DAY: 20,
  REMINDER_TIMINGS_HOURS: [24, 2], // 24h et 2h avant
  MAX_REMINDER_RETRIES: 3,
  RETRY_INTERVAL_MINUTES: 30
} as const;

// Couleurs par défaut pour les services
export const DEFAULT_SERVICE_COLORS = [
  '#4CAF50', // Vert
  '#2196F3', // Bleu
  '#FF9800', // Orange
  '#9C27B0', // Violet
  '#F44336', // Rouge
  '#00BCD4', // Cyan
  '#795548', // Marron
  '#607D8B', // Bleu gris
  '#E91E63', // Rose
  '#3F51B5'  // Indigo
] as const;

// Langues supportées
export const SUPPORTED_LANGUAGES = {
  FR: 'fr',
  EN: 'en',
  ES: 'es',
  DE: 'de',
  IT: 'it'
} as const;

// Labels des langues
export const LANGUAGE_LABELS = {
  [SUPPORTED_LANGUAGES.FR]: 'Français',
  [SUPPORTED_LANGUAGES.EN]: 'English',
  [SUPPORTED_LANGUAGES.ES]: 'Español',
  [SUPPORTED_LANGUAGES.DE]: 'Deutsch',
  [SUPPORTED_LANGUAGES.IT]: 'Italiano'
} as const;

// Fuseaux horaires courants
export const COMMON_TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Asia/Tokyo',
  'Australia/Sydney'
] as const;

// Variables disponibles dans les templates de notification
export const NOTIFICATION_TEMPLATE_VARIABLES = [
  'clientFirstName',
  'clientLastName',
  'clientFullName',
  'appointmentDate',
  'appointmentTime',
  'appointmentDuration',
  'serviceName',
  'practitionerFirstName',
  'practitionerLastName',
  'practitionerFullName',
  'organizationName',
  'appointmentNotes',
  'cancellationLink',
  'confirmationLink',
  'rescheduleLink'
] as const;