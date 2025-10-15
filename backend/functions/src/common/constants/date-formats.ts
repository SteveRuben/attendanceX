// shared/src/constants/date-formats.ts
export const DATE_FORMATS = {
  // Formats d'affichage
  DISPLAY_DATE: 'DD/MM/YYYY',
  DISPLAY_TIME: 'HH:mm',
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm',
  DISPLAY_DATETIME_LONG: 'DD/MM/YYYY à HH:mm',
  
  // Formats ISO
  ISO_DATE: 'YYYY-MM-DD',
  ISO_TIME: 'HH:mm:ss',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss',
  ISO_DATETIME_WITH_TZ: 'YYYY-MM-DDTHH:mm:ssZ',
  
  // Formats pour les APIs
  API_DATE: 'YYYY-MM-DD',
  API_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  
  // Formats pour les noms de fichiers
  FILE_TIMESTAMP: 'YYYY-MM-DD_HH-mm-ss',
  
  // Formats relatifs
  RELATIVE_TIME: 'fromNow',
  
  // Formats pour les rapports
  REPORT_DATE: 'DD MMMM YYYY',
  REPORT_MONTH: 'MMMM YYYY',
  REPORT_YEAR: 'YYYY'
} as const;

export const TIME_ZONES = {
  PARIS: 'Europe/Paris',
  LONDON: 'Europe/London',
  NEW_YORK: 'America/New_York',
  LOS_ANGELES: 'America/Los_Angeles',
  TOKYO: 'Asia/Tokyo',
  SYDNEY: 'Australia/Sydney',
  UTC: 'UTC'
} as const;

export const LOCALE_FORMATS = {
  FR: {
    DATE: 'DD/MM/YYYY',
    TIME: 'HH:mm',
    DATETIME: 'DD/MM/YYYY HH:mm',
    FIRST_DAY_OF_WEEK: 1 // Lundi
  },
  EN: {
    DATE: 'MM/DD/YYYY',
    TIME: 'h:mm A',
    DATETIME: 'MM/DD/YYYY h:mm A',
    FIRST_DAY_OF_WEEK: 0 // Dimanche
  },
  DE: {
    DATE: 'DD.MM.YYYY',
    TIME: 'HH:mm',
    DATETIME: 'DD.MM.YYYY HH:mm',
    FIRST_DAY_OF_WEEK: 1 // Lundi
  },
  ES: {
    DATE: 'DD/MM/YYYY',
    TIME: 'HH:mm',
    DATETIME: 'DD/MM/YYYY HH:mm',
    FIRST_DAY_OF_WEEK: 1 // Lundi
  }
} as const;

// Durées en millisecondes
export const DURATIONS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
} as const;