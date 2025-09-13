// backend/functions/src/services/qrcode.service.ts - Service de génération et validation de QR codes

import { FieldValue, getFirestore } from "firebase-admin/firestore";

import * as crypto from "crypto";
import { ERROR_CODES, EventQRCode } from "../../shared";
import { EventModel } from "../../models/event.model";

export class QRCodeService {
  private readonly db = getFirestore();

  /**
   * Générer un QR code pour un événement
   */
  async generateEventQRCode(
    eventId: string, 
    options: {
      expiresAt?: Date;
      maxUsage?: number;
      timeWindow?: { start: Date; end: Date };
      locationRadius?: { center: { latitude: number; longitude: number }; radius: number };
      maxScansPerUser?: number;
    } = {}
  ): Promise<EventQRCode> {
    try {
      // Vérifier que l'événement existe
      await this.getEventById(eventId); // Variable event non utilisée, donc on ne l'assigne pas
      
      // Générer les données du QR code
      const qrCodeData = this.generateQRCodeData(eventId);
      
      // Créer l'objet QR code
      const qrCode: EventQRCode = {
        eventId,
        qrCodeData,
        generatedAt: new Date(),
        expiresAt: options.expiresAt,
        isActive: true,
        usageCount: 0,
        maxUsage: options.maxUsage,
        encryptionKey: crypto.randomBytes(32).toString('hex'),
        validationRules: {
          timeWindow: options.timeWindow,
          locationRadius: options.locationRadius,
          maxScansPerUser: options.maxScansPerUser
        }
      };

      // Sauvegarder en base
      await this.db.collection('event_qr_codes').doc(eventId).set(qrCode);
      
      // Mettre à jour l'événement avec le QR code
      await this.updateEventQRCode(eventId, qrCodeData, options.expiresAt);

      return qrCode;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Valider un QR code scanné
   */
  async validateQRCode(
    qrCodeData: string, 
    userId: string, 
    scanLocation?: { latitude: number; longitude: number }
  ): Promise<{ isValid: boolean; eventId?: string; reason?: string }> {
    try {
      // Décoder les données du QR code
      const eventId = this.decodeQRCodeData(qrCodeData);
      if (!eventId) {
        return { isValid: false, reason: 'Invalid QR code format' };
      }

      // Récupérer le QR code de la base
      const qrCodeDoc = await this.db.collection('event_qr_codes').doc(eventId).get();
      if (!qrCodeDoc.exists) {
        return { isValid: false, reason: 'QR code not found' };
      }

      const qrCode = qrCodeDoc.data() as EventQRCode;

      // Vérifications de base
      if (!qrCode.isActive) {
        return { isValid: false, reason: 'QR code is inactive' };
      }

      if (qrCode.qrCodeData !== qrCodeData) {
        return { isValid: false, reason: 'QR code data mismatch' };
      }

      // Vérifier l'expiration
      if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
        return { isValid: false, reason: 'QR code has expired' };
      }

      // Vérifier l'usage maximum
      if (qrCode.maxUsage && qrCode.usageCount >= qrCode.maxUsage) {
        return { isValid: false, reason: 'QR code usage limit reached' };
      }

      // Vérifier la fenêtre temporelle
      if (qrCode.validationRules?.timeWindow) {
        const now = new Date();
        const { start, end } = qrCode.validationRules.timeWindow;
        if (now < start || now > end) {
          return { isValid: false, reason: 'QR code not valid at this time' };
        }
      }

      // Vérifier la localisation
      if (qrCode.validationRules?.locationRadius && scanLocation) {
        const distance = this.calculateDistance(
          scanLocation.latitude,
          scanLocation.longitude,
          qrCode.validationRules.locationRadius.center.latitude,
          qrCode.validationRules.locationRadius.center.longitude
        );
        
        if (distance > qrCode.validationRules.locationRadius.radius) {
          return { isValid: false, reason: 'QR code scan location too far from event location' };
        }
      }

      // Vérifier le nombre de scans par utilisateur
      if (qrCode.validationRules?.maxScansPerUser) {
        const userScans = await this.getUserQRCodeScans(eventId, userId);
        if (userScans >= qrCode.validationRules.maxScansPerUser) {
          return { isValid: false, reason: 'User has exceeded maximum scans for this QR code' };
        }
      }

      // Incrémenter le compteur d'usage
      await this.incrementUsageCount(eventId);

      return { isValid: true, eventId };
    } catch (error) {
      console.error('Error validating QR code:', error);
      return { isValid: false, reason: 'Internal server error' };
    }
  }

  /**
   * Régénérer un QR code (pour des raisons de sécurité)
   */
  async regenerateQRCode(eventId: string): Promise<EventQRCode> {
    try {
      // Récupérer l'ancien QR code
      const oldQRCodeDoc = await this.db.collection('event_qr_codes').doc(eventId).get();
      const oldQRCode = oldQRCodeDoc.exists ? oldQRCodeDoc.data() as EventQRCode : null;

      // Désactiver l'ancien QR code
      if (oldQRCode) {
        await this.db.collection('event_qr_codes').doc(eventId).update({
          isActive: false,
          updatedAt: new Date()
        });
      }

      // Générer un nouveau QR code avec les mêmes règles
      const options = oldQRCode ? {
        expiresAt: oldQRCode.expiresAt,
        maxUsage: oldQRCode.maxUsage,
        timeWindow: oldQRCode.validationRules?.timeWindow,
        locationRadius: oldQRCode.validationRules?.locationRadius,
        maxScansPerUser: oldQRCode.validationRules?.maxScansPerUser
      } : {};

      return await this.generateEventQRCode(eventId, options);
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Désactiver un QR code
   */
  async deactivateQRCode(eventId: string): Promise<void> {
    try {
      await this.db.collection('event_qr_codes').doc(eventId).update({
        isActive: false,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error deactivating QR code:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private generateQRCodeData(eventId: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const data = `${eventId}:${timestamp}:${randomString}`;
    return Buffer.from(data).toString('base64');
  }

  private decodeQRCodeData(qrCodeData: string): string | null {
    try {
      const decoded = Buffer.from(qrCodeData, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      return parts.length >= 3 ? parts[0] : null;
    } catch {
      return null;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private async getEventById(eventId: string): Promise<EventModel> {
    // Cette méthode devrait utiliser le service d'événements existant
    // Pour l'instant, on fait une requête directe
    const eventDoc = await this.db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    return EventModel.fromFirestore(eventDoc);
  }

  private async updateEventQRCode(eventId: string, qrCodeData: string, expiresAt?: Date): Promise<void> {
    await this.db.collection('events').doc(eventId).update({
      qrCode: qrCodeData,
      qrCodeExpiresAt: expiresAt,
      qrCodeGeneratedAt: new Date(),
      updatedAt: new Date()
    });
  }

  private async incrementUsageCount(eventId: string): Promise<void> {
    await this.db.collection('event_qr_codes').doc(eventId).update({
      usageCount: FieldValue.increment(1),
      lastUsedAt: new Date()
    });
  }

  private async getUserQRCodeScans(eventId: string, userId: string): Promise<number> {
    const scansQuery = await this.db
      .collection('attendances')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('method', '==', 'qr_code')
      .get();
    
    return scansQuery.size;
  }

  /**
   * Obtenir les statistiques d'usage d'un QR code
   */
  async getQRCodeStats(eventId: string): Promise<{
    totalScans: number;
    uniqueUsers: number;
    scansByHour: Record<string, number>;
    isActive: boolean;
    expiresAt?: Date;
    generatedAt: Date;
  }> {
    try {
      // Récupérer le QR code
      const qrCodeDoc = await this.db.collection('event_qr_codes').doc(eventId).get();
      if (!qrCodeDoc.exists) {
        throw new Error('QR code not found');
      }

      const qrCode = qrCodeDoc.data() as EventQRCode;

      // Récupérer les scans
      const scansQuery = await this.db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .where('method', '==', 'qr_code')
        .get();

      const scans = scansQuery.docs.map(doc => doc.data());
      const uniqueUsers = new Set(scans.map(scan => scan.userId)).size;

      // Grouper par heure
      const scansByHour: Record<string, number> = {};
      scans.forEach(scan => {
        if (scan.checkInTime) {
          const hour = new Date(scan.checkInTime.toDate()).getHours();
          const hourKey = `${hour}:00`;
          scansByHour[hourKey] = (scansByHour[hourKey] || 0) + 1;
        }
      });

      return {
        totalScans: qrCode.usageCount,
        uniqueUsers,
        scansByHour,
        isActive: qrCode.isActive,
        expiresAt: qrCode.expiresAt,
        generatedAt: qrCode.generatedAt
      };
    } catch (error) {
      console.error('Error getting QR code stats:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Générer l'image du QR code
   */
  async generateQRCodeImage(eventId: string, options: { format: string; size: number }): Promise<Buffer> {
    try {
      // Récupérer le QR code
      const qrCodeDoc = await this.db.collection('event_qr_codes').doc(eventId).get();
      if (!qrCodeDoc.exists) {
        throw new Error('QR code not found');
      }

      const qrCode = qrCodeDoc.data() as EventQRCode;

      // Pour cette implémentation, nous retournons un placeholder
      // Dans un vrai projet, utiliser une librairie comme 'qrcode' ou 'node-qrcode'
      const qrCodeUrl = `${process.env.APP_BASE_URL}/checkin/${eventId}?qr=${encodeURIComponent(qrCode.qrCodeData)}`;
      
      // Placeholder - générer une image simple
      const canvas = this.createQRCodeCanvas(qrCodeUrl, options.size);
      return this.canvasToBuffer(canvas, options.format);
    } catch (error) {
      console.error('Error generating QR code image:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir le QR code d'un événement
   */
  async getEventQRCode(eventId: string): Promise<EventQRCode | null> {
    try {
      const qrCodeDoc = await this.db.collection('event_qr_codes').doc(eventId).get();
      return qrCodeDoc.exists ? qrCodeDoc.data() as EventQRCode : null;
    } catch (error) {
      console.error('Error getting event QR code:', error);
      return null;
    }
  }

  /**
   * Rafraîchir un QR code (nouvelle expiration)
   */
  async refreshQRCode(eventId: string, newExpiresAt: Date): Promise<EventQRCode> {
    try {
      const qrCodeDoc = await this.db.collection('event_qr_codes').doc(eventId).get();
      if (!qrCodeDoc.exists) {
        throw new Error('QR code not found');
      }

      const updates = {
        expiresAt: newExpiresAt,
        updatedAt: new Date()
      };

      await this.db.collection('event_qr_codes').doc(eventId).update(updates);

      const qrCodeData = qrCodeDoc.data();
      const updatedQRCode = { 
        eventId: qrCodeData?.eventId || '',
        qrCodeData: qrCodeData?.qrCodeData || '',
        generatedAt: qrCodeData?.generatedAt || new Date(),
        isActive: qrCodeData?.isActive || true,
        usageCount: qrCodeData?.usageCount || 0,
        ...updates 
      } as EventQRCode;
      return updatedQRCode;
    } catch (error) {
      console.error('Error refreshing QR code:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes utilitaires pour la génération d'images (placeholders)
  private createQRCodeCanvas(data: string, size: number): any {
    // Placeholder - dans un vrai projet, utiliser une librairie de génération QR
    return {
      width: size,
      height: size,
      data: data
    };
  }

  private canvasToBuffer(canvas: any, format: string): Buffer {
    // Placeholder - convertir le canvas en buffer selon le format
    const placeholder = `QR Code: ${canvas.data}`;
    return Buffer.from(placeholder, 'utf-8');
  }
}

export const qrCodeService = new QRCodeService();