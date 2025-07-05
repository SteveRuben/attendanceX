// shared/src/constants/attendance-statuses.ts

import { AttendanceMethod, AttendanceStatus } from "@/types";


export const ATTENDANCE_STATUS_LABELS = {
  [AttendanceStatus.PRESENT]: 'Présent',
  [AttendanceStatus.ABSENT]: 'Absent',
  [AttendanceStatus.LATE]: 'En retard',
  [AttendanceStatus.EXCUSED]: 'Excusé',
  [AttendanceStatus.LEFT_EARLY]: 'Parti tôt',
  [AttendanceStatus.PENDING]: 'En attente'
} as const;

export const ATTENDANCE_METHOD_LABELS = {
  [AttendanceMethod.QR_CODE]: 'QR Code',
  [AttendanceMethod.GEOLOCATION]: 'Géolocalisation',
  [AttendanceMethod.MANUAL]: 'Manuel',
  [AttendanceMethod.BIOMETRIC]: 'Biométrique',
  [AttendanceMethod.BEACON]: 'Beacon'
} as const;

export const ATTENDANCE_STATUS_COLORS = {
  [AttendanceStatus.PRESENT]: 'green',
  [AttendanceStatus.ABSENT]: 'red',
  [AttendanceStatus.LATE]: 'orange',
  [AttendanceStatus.EXCUSED]: 'blue',
  [AttendanceStatus.LEFT_EARLY]: 'yellow',
  [AttendanceStatus.PENDING]: 'gray'
} as const;

export const ATTENDANCE_METHOD_ICONS = {
  [AttendanceMethod.QR_CODE]: 'qr-code',
  [AttendanceMethod.GEOLOCATION]: 'map-pin',
  [AttendanceMethod.MANUAL]: 'edit',
  [AttendanceMethod.BIOMETRIC]: 'fingerprint',
  [AttendanceMethod.BEACON]: 'radio'
} as const;

// Priorité des méthodes (1 = plus prioritaire)
export const ATTENDANCE_METHOD_PRIORITY = {
  [AttendanceMethod.QR_CODE]: 1,
  [AttendanceMethod.GEOLOCATION]: 2,
  [AttendanceMethod.MANUAL]: 3,
  [AttendanceMethod.BIOMETRIC]: 4,
  [AttendanceMethod.BEACON]: 5
} as const;

// Statuts qui comptent dans les métriques
export const AttendanceStatus_COUNT_IN_METRICS = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE,
  AttendanceStatus.LEFT_EARLY
] as const;

// Statuts positifs (considérés comme présent)
export const POSITIVE_AttendanceStatus = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.LEFT_EARLY
] as const;

// Statuts négatifs (considérés comme absent)
export const NEGATIVE_AttendanceStatus = [
  AttendanceStatus.ABSENT
] as const;

// Statuts qui nécessitent une validation
export const AttendanceStatus_REQUIRE_VALIDATION = [
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED
] as const;

// Seuils par défaut (en minutes)
export const ATTENDANCE_THRESHOLDS = {
  LATE_THRESHOLD_MINUTES: 15,
  EARLY_DEPARTURE_THRESHOLD_MINUTES: 15,
  EARLY_CHECKIN_ALLOWED_MINUTES: 30,
  LATE_CHECKIN_ALLOWED_MINUTES: 60,
  AUTO_MARK_ABSENT_AFTER_MINUTES: 120
} as const;

// Configuration QR Code
export const QR_CODE_CONFIG = {
  DEFAULT_EXPIRY_MINUTES: 60,
  MIN_EXPIRY_MINUTES: 5,
  MAX_EXPIRY_MINUTES: 1440, // 24 heures
  DEFAULT_SIZE: 200,
  ERROR_CORRECTION_LEVELS: ['L', 'M', 'Q', 'H'] as const,
  DEFAULT_ERROR_CORRECTION: 'M' as const
} as const;

// Configuration géolocalisation
export const GEOLOCATION_CONFIG = {
  DEFAULT_RADIUS_METERS: 100,
  MIN_RADIUS_METERS: 10,
  MAX_RADIUS_METERS: 1000,
  ACCURACY_THRESHOLD_METERS: 50,
  TIMEOUT_SECONDS: 30
} as const;