import { getFirestore } from 'firebase-admin/firestore';

export interface QRCodeData {
  id: string;
  type: 'check_in' | 'event' | 'participant';
  eventId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  version: string;
}

export interface QRCodeRecord {
  qrCodeId: string;
  url: string;
  imageBase64?: string;
  expiresAt: string;
  token: string;
  data: QRCodeData;
  metadata: {
    createdBy: string;
    createdAt: string;
    type: string;
    eventId: string;
    format: string;
    size: number;
  };
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
}

export interface QRValidationResult {
  valid: boolean;
  message?: string;
  qrCode?: QRCodeRecord;
  checkIn?: any;
}

export class QRCodeService {
  private db = getFirestore();

  /**
   * Générer un nouveau QR code
   */
  async generateQRCode(params: {
    type: 'check_in' | 'event' | 'participant';
    eventId: string;
    userId: string;
    expiresAt?: string;
    options?: {
      size?: number;
      format?: 'png' | 'svg';
      maxUsage?: number;
    };
  }): Promise<QRCodeRecord> {
    const { type, eventId, userId, expiresAt, options = {} } = params;
    
    // Générer un ID unique
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const qrCodeId = `qr_${type}_${eventId}_${timestamp}_${randomId}`;
    
    // Calculer la date d'expiration
    const defaultExpirationHours = type === 'check_in' ? 24 : 168;
    const expirationDate = expiresAt 
      ? new Date(expiresAt)
      : new Date(Date.now() + defaultExpirationHours * 60 * 60 * 1000);

    // Données à encoder dans le QR code
    const qrData: QRCodeData = {
      id: qrCodeId,
      type,
      eventId,
      userId,
      createdAt: new Date(timestamp).toISOString(),
      expiresAt: expirationDate.toISOString(),
      version: '1.0'
    };

    // Créer l'enregistrement
    const qrCodeRecord: QRCodeRecord = {
      qrCodeId,
      url: this.generateQRUrl(qrCodeId),
      imageBase64: await this.generateQRImage(qrData, options.size || 256),
      expiresAt: expirationDate.toISOString(),
      token: qrCodeId,
      data: qrData,
      metadata: {
        createdBy: userId,
        createdAt: new Date(timestamp).toISOString(),
        type,
        eventId,
        format: options.format || 'png',
        size: options.size || 256
      },
      isActive: true,
      usageCount: 0,
      maxUsage: options.maxUsage
    };

    // Sauvegarder en base de données
    await this.db.collection('qr_codes').doc(qrCodeId).set(qrCodeRecord);

    return qrCodeRecord;
  }

  /**
   * Valider un QR code
   */
  async validateQRCode(qrCodeId: string, userId?: string, location?: any): Promise<QRValidationResult> {
    try {
      // Récupérer le QR code depuis la base de données
      const qrDoc = await this.db.collection('qr_codes').doc(qrCodeId).get();
      
      if (!qrDoc.exists) {
        return {
          valid: false,
          message: 'QR code not found'
        };
      }

      const qrCode = qrDoc.data() as QRCodeRecord;

      // Vérifier si le QR code est actif
      if (!qrCode.isActive) {
        return {
          valid: false,
          message: 'QR code has been deactivated'
        };
      }

      // Vérifier l'expiration
      if (new Date() > new Date(qrCode.expiresAt)) {
        return {
          valid: false,
          message: 'QR code has expired'
        };
      }

      // Vérifier l'usage maximum
      if (qrCode.maxUsage && qrCode.usageCount >= qrCode.maxUsage) {
        return {
          valid: false,
          message: 'QR code usage limit exceeded'
        };
      }

      // Incrémenter le compteur d'usage
      await this.db.collection('qr_codes').doc(qrCodeId).update({
        usageCount: qrCode.usageCount + 1,
        lastUsedAt: new Date().toISOString(),
        lastUsedBy: userId
      });

      return {
        valid: true,
        message: 'QR code validated successfully',
        qrCode
      };

    } catch (error) {
      console.error('Error validating QR code:', error);
      return {
        valid: false,
        message: 'Validation error occurred'
      };
    }
  }

  /**
   * Récupérer un QR code par ID
   */
  async getQRCode(qrCodeId: string): Promise<QRCodeRecord | null> {
    try {
      const qrDoc = await this.db.collection('qr_codes').doc(qrCodeId).get();
      return qrDoc.exists ? qrDoc.data() as QRCodeRecord : null;
    } catch (error) {
      console.error('Error getting QR code:', error);
      return null;
    }
  }

  /**
   * Désactiver un QR code
   */
  async deactivateQRCode(qrCodeId: string): Promise<boolean> {
    try {
      await this.db.collection('qr_codes').doc(qrCodeId).update({
        isActive: false,
        deactivatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Error deactivating QR code:', error);
      return false;
    }
  }

  /**
   * Récupérer les QR codes d'un événement
   */
  async getEventQRCodes(eventId: string): Promise<QRCodeRecord[]> {
    try {
      const snapshot = await this.db
        .collection('qr_codes')
        .where('data.eventId', '==', eventId)
        .orderBy('metadata.createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as QRCodeRecord);
    } catch (error) {
      console.error('Error getting event QR codes:', error);
      return [];
    }
  }

  /**
   * Générer l'URL du QR code
   */
  private generateQRUrl(qrCodeId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/app/check-in/scan?qr=${encodeURIComponent(qrCodeId)}`;
  }

  /**
   * Générer l'image du QR code
   */
  private async generateQRImage(qrData: QRCodeData, size: number): Promise<string> {
    // TODO: Intégrer avec une vraie librairie de génération de QR codes
    // Exemple avec 'qrcode' :
    // const QRCode = require('qrcode');
    // const qrString = JSON.stringify(qrData);
    // const qrBuffer = await QRCode.toBuffer(qrString, { width: size });
    // return qrBuffer.toString('base64');

    // Pour l'instant, générer un SVG simple
    // const qrString = JSON.stringify(qrData); // TODO: Utiliser pour la vraie génération QR
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="10%" y="10%" width="80%" height="80%" fill="black"/>
      <rect x="20%" y="20%" width="60%" height="60%" fill="white"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="monospace" font-size="8">
        ${qrData.id.substring(0, 15)}
      </text>
    </svg>`;
    
    return Buffer.from(svg).toString('base64');
  }

  /**
   * Nettoyer les QR codes expirés
   */
  async cleanupExpiredQRCodes(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const snapshot = await this.db
        .collection('qr_codes')
        .where('expiresAt', '<', now)
        .where('isActive', '==', true)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false, expiredAt: now });
      });

      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Error cleaning up expired QR codes:', error);
      return 0;
    }
  }

  // ===== MÉTHODES DE COMPATIBILITÉ (à supprimer plus tard) =====

  /**
   * @deprecated Utiliser generateQRCode à la place
   */
  async generateEventQRCode(eventId: string, options: any): Promise<any> {
    return this.generateQRCode({
      type: 'event',
      eventId,
      userId: 'system',
      expiresAt: options.expiresAt?.toISOString(),
      options: {
        size: 256,
        format: 'png'
      }
    });
  }

  /**
   * @deprecated Utiliser generateQRCode à la place
   */
  async regenerateQRCode(eventId: string): Promise<any> {
    // Désactiver l'ancien QR code
    const existingCodes = await this.getEventQRCodes(eventId);
    for (const code of existingCodes) {
      if (code.isActive) {
        await this.deactivateQRCode(code.qrCodeId);
      }
    }

    // Générer un nouveau QR code
    return this.generateQRCode({
      type: 'event',
      eventId,
      userId: 'system',
      options: { size: 256, format: 'png' }
    });
  }

  /**
   * @deprecated Utiliser getEventQRCodes à la place
   */
  async getQRCodeStats(eventId: string): Promise<any> {
    const qrCodes = await this.getEventQRCodes(eventId);
    const totalUsage = qrCodes.reduce((sum, qr) => sum + qr.usageCount, 0);
    const activeCount = qrCodes.filter(qr => qr.isActive).length;

    return {
      eventId,
      totalQRCodes: qrCodes.length,
      activeQRCodes: activeCount,
      totalUsage,
      averageUsage: qrCodes.length > 0 ? totalUsage / qrCodes.length : 0,
      lastGenerated: qrCodes.length > 0 ? qrCodes[0].metadata.createdAt : null
    };
  }

  /**
   * @deprecated Utiliser generateQRImage à la place
   */
  async generateQRCodeImage(eventId: string, options: { format: string; size: number }): Promise<Buffer> {
    const qrCodes = await this.getEventQRCodes(eventId);
    if (qrCodes.length === 0) {
      throw new Error('No QR code found for this event');
    }

    const latestQR = qrCodes[0];
    const imageBase64 = latestQR.imageBase64 || '';
    
    return Buffer.from(imageBase64, 'base64');
  }
}

// Instance singleton
export const qrCodeService = new QRCodeService();