/**
 * Types pour le suivi de localisation
 */

export interface LocationTrackingEntry {
  id?: string;
  employeeId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy: number; // en mètres
  altitude?: number;
  speed?: number; // en m/s
  heading?: number; // en degrés
  
  // Contexte
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'manual_check';
  presenceEntryId?: string; // Lien vers l'entrée de présence associée
  
  // Métadonnées
  source: 'gps' | 'network' | 'passive';
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
  
  // Validation
  isValidated: boolean;
  validationMethod?: 'geofence' | 'manual' | 'automatic';
  validatedBy?: string;
  validatedAt?: Date;
  
  // Géofencing
  isWithinWorkArea: boolean;
  workAreaId?: string;
  distanceFromWorkArea?: number; // en mètres
  
  // Audit
  createdAt: Date;
  updatedAt?: Date;
  
  // GDPR
  consentGiven: boolean;
  consentTimestamp: Date;
  dataRetentionExpiry: Date;
}

export interface WorkArea {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  
  // Géométrie
  type: 'circle' | 'polygon';
  center?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // en mètres pour les cercles
  coordinates?: Array<{
    latitude: number;
    longitude: number;
  }>; // pour les polygones
  
  // Configuration
  isActive: boolean;
  allowedActions: Array<'clock_in' | 'clock_out' | 'break_start' | 'break_end'>;
  
  // Métadonnées
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  reason?: string;
  distance?: number;
  workArea?: WorkArea;
  suggestions?: string[];
}