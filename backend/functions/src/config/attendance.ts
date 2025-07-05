import {AttendanceMethod, AttendanceStatus} from "@attendance-x/shared";


/**
 * Configuration des méthodes de marquage des présences
 */
export const attendanceMethods: Record<AttendanceMethod, any> = {
  QR_CODE: {
    id: "qr_code",
    name: "QR Code",
    enabled: process.env.ENABLE_QR_CODE !== "false",
    requiresValidation: false,
    validationStrategy: "automatic",
    priority: 1,
    settings: {
      expiryMinutes: parseInt(process.env.QR_CODE_EXPIRY_MINUTES || "60", 10),
      size: parseInt(process.env.QR_CODE_SIZE || "200", 10),
      errorCorrection: process.env.QR_CODE_ERROR_CORRECTION || "M",
      singleUse: true,
    },
  },

  GEOLOCATION: {
    id: "geolocation",
    name: "Géolocalisation",
    enabled: process.env.ENABLE_GEOLOCATION !== "false",
    requiresValidation: false,
    validationStrategy: "automatic",
    priority: 2,
    settings: {
      defaultRadius: parseInt(process.env.DEFAULT_CHECKIN_RADIUS || "100", 10),
      maxRadius: parseInt(process.env.MAX_CHECKIN_RADIUS || "1000", 10),
      minRadius: parseInt(process.env.MIN_CHECKIN_RADIUS || "10", 10),
      accuracyThreshold: parseInt(process.env.GPS_ACCURACY_THRESHOLD || "50", 10),
      storeLocationHistory: process.env.ENABLE_LOCATION_HISTORY === "true",
    },
  },

  MANUAL: {
    id: "manual",
    name: "Manuel",
    enabled: true,
    requiresValidation: true,
    validationStrategy: "organizer",
    priority: 3,
    settings: {
      requireNote: true,
      requireValidator: true,
    },
  },

  BIOMETRIC: {
    id: "biometric",
    name: "Biométrique",
    enabled: process.env.ENABLE_BIOMETRIC === "true",
    requiresValidation: false,
    validationStrategy: "automatic",
    priority: 4,
    settings: {
      threshold: 0.85,
      storeBiometricData: false,
    },
  },

  BEACON: {
    id: "beacon",
    name: "Beacon",
    enabled: process.env.ENABLE_BEACON === "true",
    requiresValidation: false,
    validationStrategy: "automatic",
    priority: 5,
    settings: {
      minRssi: -80,
      requiredDwellTime: 60, // secondes
    },
  },
};

/**
 * Configuration des statuts de présence
 */
export const attendanceStatuses: Record<string, AttendanceStatus> = {
  PRESENT: {
    id: "present",
    name: "Présent",
    color: "green",
    priority: 1,
    countInMetrics: true,
    settings: {
      requireCheckInTime: true,
    },
  },

  ABSENT: {
    id: "absent",
    name: "Absent",
    color: "red",
    priority: 2,
    countInMetrics: true,
    settings: {
      requireReason: true,
    },
  },

  LATE: {
    id: "late",
    name: "En retard",
    color: "orange",
    priority: 3,
    countInMetrics: true,
    settings: {
      lateThresholdMinutes: 15,
      requireCheckInTime: true,
    },
  },

  EXCUSED: {
    id: "excused",
    name: "Excusé",
    color: "blue",
    priority: 4,
    countInMetrics: false,
    settings: {
      requireReason: true,
      requireApproval: true,
    },
  },

  LEFT_EARLY: {
    id: "left_early",
    name: "Parti tôt",
    color: "yellow",
    priority: 5,
    countInMetrics: true,
    settings: {
      earlyDepartureThresholdMinutes: 15,
      requireCheckOutTime: true,
    },
  },

  PENDING: {
    id: "pending",
    name: "En attente",
    color: "gray",
    priority: 6,
    countInMetrics: false,
    settings: {
      automaticResolutionMinutes: 60,
      defaultResolutionStatus: "absent",
    },
  },
};

/**
 * Configuration générale de la gestion des présences
 */
export const attendanceConfig = {
  // Paramètres généraux
  defaultMethod: "qr_code",
  autoMarkLate: true,
  autoMarkAbsent: true,

  // Délais (en minutes)
  markPresentBeforeStartMinutes: 30, // Possibilité de marquer présent 30 min avant
  markPresentAfterStartMinutes: 60, // Possibilité de marquer présent jusqu'à 60 min après
  lateThresholdMinutes: 15, // Considéré en retard après 15 min

  // Validation
  requireValidation: process.env.ATTENDANCE_REQUIRE_VALIDATION === "true",
  autoValidateQrCode: true,
  autoValidateGeolocation: true,

  // Notifications
  sendConfirmationNotification: true,
  reminderIntervals: [1440, 60, 15], // 24h, 1h, 15min avant

  // Métriques
  trackAttendanceRate: true,
  trackPunctualityRate: true,
  generateMonthlyReports: true,
};

export default {
  attendanceMethods,
  attendanceStatuses,
  attendanceConfig,
};
