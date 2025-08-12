// shared/types/attendance.types.ts

import { AuditLog, BaseEntity, GeoPoint } from "./common.types";

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  MAYBE = 'maybe',
  NOT_ATTENDED = 'not_attended',
  EXCUSED = 'excused',
  LATE = 'late',
  LEFT_EARLY = 'left_early',
  PARTIAL = 'partial',
  PENDING = 'pending'
}

export enum AttendanceMethod {
  QR_CODE = 'qr_code',
  GEOLOCATION = 'geolocation',
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  BIOMETRIC = 'biometric',
  NFC = 'nfc',
  BLUETOOTH = 'bluetooth',
  BEACON = 'beacon'
}

export enum ExcuseType {
  SICK_LEAVE = 'sick_leave',
  VACATION = 'vacation',
  PERSONAL = 'personal',
  BUSINESS_TRIP = 'business_trip',
  TRAINING = 'training',
  FAMILY_EMERGENCY = 'family_emergency',
  TECHNICAL_ISSUE = 'technical_issue',
  TRANSPORT = 'transport',
  OTHER = 'other'
}

export interface CheckInRequest {
  userId: string;
  eventId: string;
  method: AttendanceMethod;
  deviceInfo?: {
    type: 'web' | 'mobile' | 'tablet';
    model?: string;
    os?: string;
  };
}

export interface QRCodeScanRequest extends CheckInRequest {
  method: AttendanceMethod.QR_CODE;
  qrCodeData: string;
}

export interface GeolocationCheckInRequest extends CheckInRequest {
  method: AttendanceMethod.GEOLOCATION;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ManualAttendanceRequest extends CheckInRequest {
  method: AttendanceMethod.MANUAL;
  status: AttendanceStatus;
  markedBy: string;
  checkInTime?: Date;
  notes?: string;
}

export interface CheckInResponse {
  success: boolean;
  attendance: AttendanceRecord;
  message: string;
  requiresValidation: boolean;
}

export interface AttendanceValidation {
  isValidated: boolean;
  validatedBy?: string;
  validatedAt?: Date;
  validationNotes?: string;
  validationScore?: number; // 0-100
}

export interface AttendanceMetrics {
  duration?: number; // en minutes
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  participationScore?: number; // 0-100
  engagementLevel?: 'low' | 'medium' | 'high';
}

export interface AttendanceRecord extends BaseEntity {
  eventId: string;
  userId: string;
  status: AttendanceStatus;
  
  // Informations de marquage
  checkInTime?: Date;
  checkOutTime?: Date;
  markedBy: string; // ID de l'utilisateur qui a marqué
  method: AttendanceMethod;
  
  // Localisation (si applicable)
  checkInLocation?: GeoPoint;
  checkOutLocation?: GeoPoint;
  locationAccuracy?: number; // précision en mètres
  
  // Justification et excuses
  notes?: string;
  excuseType?: ExcuseType;
  excuseReason?: string;
  excuseDocument?: string; // URL du document justificatif
  excuseApprovedBy?: string;
  excuseApprovedAt?: Date;
  delay?: number; // en minutes, si applicable
  
  // Validation
  validation: AttendanceValidation;
  
  // Métriques
  metrics: AttendanceMetrics;
  
  // Feedback participant
  feedback?: {
    rating?: number; // 1-5
    comment?: string;
    wouldRecommend?: boolean;
  };
  
  // Audit et historique
  auditLog: AuditLog[];
  
  // Métadonnées système
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    type: 'web' | 'mobile' | 'tablet';
    model?: string;
    os?: string;
  };
  
  // Event-specific features
  qrCodeValidation?: {
    qrCodeData: string;
    validatedAt: Date;
    isValid: boolean;
    expiresAt?: Date;
  };
  
  biometricData?: {
    type: 'fingerprint' | 'face' | 'voice';
    confidence: number; // 0-100
    template?: string; // encrypted biometric template
    verifiedAt: Date;
  };
  
  sessionTracking?: {
    sessionId: string;
    sessionStart: Date;
    sessionEnd?: Date;
    partialAttendance: boolean;
    sessionsAttended: string[]; // IDs of attended sessions
    totalSessions: number;
    attendancePercentage: number;
  };
  
  certificateGenerated?: {
    certificateId: string;
    generatedAt: Date;
    downloadUrl: string;
    validUntil?: Date;
  };
}

export interface MarkAttendanceRequest {
  eventId: string;
  userId?: string; // Si non fourni, utilise l'utilisateur connecté
  status: AttendanceStatus;
  method: AttendanceMethod;
  location?: GeoPoint;
  notes?: string;
  qrCodeData?: string;
  deviceInfo?: any;
  excuseType?: ExcuseType;
  excuseReason?: string;
}

export interface AttendanceValidationRequest {
  attendanceId: string;
  validatedBy: string;    // ← AJOUTER
  approved: boolean; 
  notes?: string;
  score?: number;
}

export interface AttendanceSummary {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  totalInvited: number;
  totalPresent: number;
  totalAbsent: number;
  totalExcused: number;
  totalLate: number;
  totalPending: number;
  attendanceRate: number;
  punctualityRate: number;
  avgDuration: number;
  participants: {
    userId: string;
    userName: string;
    status: AttendanceStatus;
    checkInTime?: Date;
    checkOutTime?: Date;
    duration?: number;
  }[];
}

export interface AttendancePattern {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  totalEvents: number;
  attendedEvents: number;
  lateEvents: number;
  excusedEvents: number;
  attendanceRate: number;
  punctualityRate: number;
  trend: 'improving' | 'declining' | 'stable';
}

// Certificate generation interfaces
export interface Certificate {
  id: string;
  attendanceRecordId: string;
  userId: string;
  eventId: string;
  organizationId: string;
  
  // Certificate Details
  certificateNumber: string;
  issueDate: Date;
  validUntil?: Date;
  
  // Content
  participantName: string;
  eventTitle: string;
  eventDate: Date;
  duration: number; // in hours
  attendancePercentage: number;
  
  // Template and branding
  templateId: string;
  organizationLogo?: string;
  organizationName: string;
  signatoryName?: string;
  signatoryTitle?: string;
  digitalSignature?: string;
  
  // Verification
  verificationCode: string;
  qrCodeData: string;
  
  // File details
  pdfUrl: string;
  downloadCount: number;
  
  // Status
  status: 'generated' | 'sent' | 'downloaded' | 'revoked';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  
  // Design
  layout: 'portrait' | 'landscape';
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  
  // Content placeholders
  title: string;
  subtitle?: string;
  bodyText: string;
  footerText?: string;
  
  // Logo and signature positions
  logoPosition: { x: number; y: number; width: number; height: number };
  signaturePosition?: { x: number; y: number; width: number; height: number };
  
  // QR code settings
  includeQRCode: boolean;
  qrCodePosition?: { x: number; y: number; size: number };
  
  isDefault: boolean;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// QR Code generation for events
export interface EventQRCode {
  eventId: string;
  qrCodeData: string;
  generatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  
  // Security features
  encryptionKey?: string;
  validationRules?: {
    timeWindow?: { start: Date; end: Date };
    locationRadius?: { center: GeoPoint; radius: number };
    maxScansPerUser?: number;
  };
}