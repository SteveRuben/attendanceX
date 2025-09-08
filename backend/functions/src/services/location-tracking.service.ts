/**
 * Service de suivi de localisation pour la conformité GDPR
 */

import { collections, db } from '../config';
import { logger } from 'firebase-functions';
import { LocationTrackingEntry, LocationValidationResult, WorkArea } from '../types/location.types';

export class LocationTrackingService {

  /**
   * Enregistrer une entrée de localisation
   */
  async recordLocation(entry: Omit<LocationTrackingEntry, 'id' | 'createdAt'>): Promise<string> {
    const locationEntry: LocationTrackingEntry = {
      ...entry,
      createdAt: new Date(),
      dataRetentionExpiry: this.calculateRetentionExpiry()
    };

    const docRef = await collections.location_tracking.add(locationEntry);
    
    logger.info('Location recorded', {
      entryId: docRef.id,
      employeeId: entry.employeeId,
      action: entry.action
    });

    return docRef.id;
  }

  /**
   * Valider une localisation par rapport aux zones de travail
   */
  async validateLocation(
    latitude: number, 
    longitude: number, 
    organizationId: string
  ): Promise<LocationValidationResult> {
    
    // Récupérer les zones de travail actives
    const workAreasQuery = await collections.work_areas
      .where('organizationId', '==', organizationId)
      .where('isActive', '==', true)
      .get();

    if (workAreasQuery.empty) {
      return {
        isValid: false,
        reason: 'No active work areas defined'
      };
    }

    let closestArea: WorkArea | null = null;
    let minDistance = Infinity;

    for (const doc of workAreasQuery.docs) {
      const workArea = doc.data() as WorkArea;
      
      if (workArea.type === 'circle' && workArea.center && workArea.radius) {
        const distance = this.calculateDistance(
          latitude, longitude,
          workArea.center.latitude, workArea.center.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestArea = workArea;
        }

        if (distance <= workArea.radius) {
          return {
            isValid: true,
            distance,
            workArea
          };
        }
      }
    }

    return {
      isValid: false,
      reason: 'Outside all work areas',
      distance: minDistance,
      workArea: closestArea || undefined,
      suggestions: [
        'Verify your location is accurate',
        'Contact your manager if you believe this is an error',
        'Check if you are within the designated work area'
      ]
    };
  }

  /**
   * Récupérer l'historique de localisation d'un employé
   */
  async getEmployeeLocationHistory(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<LocationTrackingEntry[]> {
    
    const query = await collections.location_tracking
      .where('employeeId', '==', employeeId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return query.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as LocationTrackingEntry));
  }

  /**
   * Supprimer les données de localisation expirées (conformité GDPR)
   */
  async cleanupExpiredLocationData(): Promise<number> {
    const now = new Date();
    
    const expiredQuery = await collections.location_tracking
      .where('dataRetentionExpiry', '<', now)
      .limit(500) // Traiter par batch pour éviter les timeouts
      .get();

    if (expiredQuery.empty) {
      return 0;
    }

    const batch = db.batch();
    expiredQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    logger.info(`Cleaned up ${expiredQuery.size} expired location records`);
    return expiredQuery.size;
  }

  /**
   * Anonymiser les données de localisation d'un employé (GDPR)
   */
  async anonymizeEmployeeLocationData(employeeId: string): Promise<number> {
    const query = await collections.location_tracking
      .where('employeeId', '==', employeeId)
      .get();

    if (query.empty) {
      return 0;
    }

    const batch = db.batch();
    query.docs.forEach(doc => {
      batch.update(doc.ref, {
        employeeId: '[ANONYMIZED]',
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        altitude: null,
        speed: null,
        heading: null,
        deviceInfo: null,
        gdprAnonymized: true,
        anonymizedAt: new Date()
      });
    });

    await batch.commit();
    
    logger.info(`Anonymized ${query.size} location records for employee ${employeeId}`);
    return query.size;
  }

  /**
   * Calculer la distance entre deux points (formule de Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance en mètres
  }

  /**
   * Calculer la date d'expiration pour la rétention des données
   */
  private calculateRetentionExpiry(): Date {
    const now = new Date();
    // 90 jours de rétention pour les données de localisation (conformité GDPR)
    return new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
  }

  /**
   * Vérifier le consentement GDPR pour un employé
   */
  async checkLocationConsent(employeeId: string): Promise<boolean> {
    const employeeDoc = await collections.employees.doc(employeeId).get();
    
    if (!employeeDoc.exists) {
      return false;
    }

    const employeeData = employeeDoc.data();
    return employeeData?.locationTrackingConsent === true;
  }

  /**
   * Enregistrer le consentement GDPR pour le suivi de localisation
   */
  async recordLocationConsent(employeeId: string, consent: boolean): Promise<void> {
    await collections.employees.doc(employeeId).update({
      locationTrackingConsent: consent,
      locationConsentTimestamp: new Date(),
      locationConsentVersion: '1.0'
    });

    logger.info('Location tracking consent updated', {
      employeeId,
      consent
    });
  }
}