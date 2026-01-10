import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { PINCode, AccessCodeValidationResult } from '../../common/types/campaign.types';

export class PINCodeService {
  private db = getFirestore();

  /**
   * Générer un code PIN pour un participant
   */
  async generatePINCode(
    eventId: string,
    userId: string,
    expirationMinutes: number = 60
  ): Promise<PINCode> {
    try {
      const code = this.generateRandomPIN();
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
      
      const pinCode: PINCode = {
        id: `${eventId}_${userId}`,
        eventId,
        userId,
        code,
        expiresAt,
        createdAt: new Date(),
        isUsed: false
      };

      // Sauvegarder en base de données
      await this.db.collection('pin_codes').doc(pinCode.id).set(pinCode);

      logger.info('PIN code generated', {
        eventId,
        userId,
        expiresAt: expiresAt.toISOString()
      });

      return pinCode;
    } catch (error) {
      logger.error('Error generating PIN code', {
        error: error.message,
        eventId,
        userId
      });
      throw error;
    }
  }

  /**
   * Valider un code PIN
   */
  async validatePINCode(
    eventId: string,
    pinCode: string,
    userId?: string
  ): Promise<AccessCodeValidationResult> {
    try {
      // Rechercher le PIN code
      const snapshot = await this.db
        .collection('pin_codes')
        .where('eventId', '==', eventId)
        .where('code', '==', pinCode)
        .where('isUsed', '==', false)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          valid: false,
          message: 'Code PIN invalide ou déjà utilisé'
        };
      }

      const pinDoc = snapshot.docs[0];
      const pin = pinDoc.data() as PINCode;

      // Vérifier l'expiration
      if (new Date() > pin.expiresAt) {
        return {
          valid: false,
          message: 'Code PIN expiré'
        };
      }

      // Vérifier l'utilisateur si spécifié
      if (userId && pin.userId !== userId) {
        return {
          valid: false,
          message: 'Code PIN non autorisé pour cet utilisateur'
        };
      }

      // Marquer comme utilisé
      await this.db.collection('pin_codes').doc(pin.id).update({
        isUsed: true,
        usedAt: new Date(),
        usedBy: userId || 'unknown'
      });

      // Créer l'enregistrement de check-in
      const checkInRecord = {
        id: `checkin_${Date.now()}_${pin.userId}`,
        eventId,
        userId: pin.userId,
        method: 'pin_code' as const,
        timestamp: new Date().toISOString(),
        status: 'checked_in' as const
      };

      logger.info('PIN code validated successfully', {
        eventId,
        userId: pin.userId,
        pinCodeId: pin.id
      });

      return {
        valid: true,
        message: 'Check-in réussi',
        participantId: pin.userId,
        checkInRecord
      };

    } catch (error) {
      logger.error('Error validating PIN code', {
        error: error.message,
        eventId,
        pinCode: pinCode.substring(0, 2) + '****' // Log partiel pour sécurité
      });
      
      return {
        valid: false,
        message: 'Erreur lors de la validation'
      };
    }
  }

  /**
   * Récupérer un PIN code par ID
   */
  async getPINCode(pinCodeId: string): Promise<PINCode | null> {
    try {
      const doc = await this.db.collection('pin_codes').doc(pinCodeId).get();
      return doc.exists ? doc.data() as PINCode : null;
    } catch (error) {
      logger.error('Error getting PIN code', {
        error: error.message,
        pinCodeId
      });
      return null;
    }
  }

  /**
   * Récupérer les PIN codes d'un événement
   */
  async getEventPINCodes(eventId: string): Promise<PINCode[]> {
    try {
      const snapshot = await this.db
        .collection('pin_codes')
        .where('eventId', '==', eventId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as PINCode);
    } catch (error) {
      logger.error('Error getting event PIN codes', {
        error: error.message,
        eventId
      });
      return [];
    }
  }

  /**
   * Désactiver un PIN code
   */
  async deactivatePINCode(pinCodeId: string): Promise<boolean> {
    try {
      await this.db.collection('pin_codes').doc(pinCodeId).update({
        isUsed: true,
        usedAt: new Date(),
        usedBy: 'system_deactivated'
      });
      return true;
    } catch (error) {
      logger.error('Error deactivating PIN code', {
        error: error.message,
        pinCodeId
      });
      return false;
    }
  }

  /**
   * Nettoyer les PIN codes expirés
   */
  async cleanupExpiredPINCodes(): Promise<number> {
    try {
      const now = new Date();
      const snapshot = await this.db
        .collection('pin_codes')
        .where('expiresAt', '<', now)
        .where('isUsed', '==', false)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isUsed: true,
          usedAt: now,
          usedBy: 'system_expired'
        });
      });

      await batch.commit();
      
      logger.info('Expired PIN codes cleaned up', {
        count: snapshot.size
      });

      return snapshot.size;
    } catch (error) {
      logger.error('Error cleaning up expired PIN codes', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Obtenir les statistiques des PIN codes d'un événement
   */
  async getPINCodeStats(eventId: string): Promise<{
    total: number;
    used: number;
    expired: number;
    active: number;
    usageRate: number;
  }> {
    try {
      const pinCodes = await this.getEventPINCodes(eventId);
      const now = new Date();

      const stats = {
        total: pinCodes.length,
        used: pinCodes.filter(pin => pin.isUsed && pin.usedBy !== 'system_expired').length,
        expired: pinCodes.filter(pin => now > pin.expiresAt && !pin.isUsed).length,
        active: pinCodes.filter(pin => !pin.isUsed && now <= pin.expiresAt).length,
        usageRate: 0
      };

      stats.usageRate = stats.total > 0 ? (stats.used / stats.total) * 100 : 0;

      return stats;
    } catch (error) {
      logger.error('Error getting PIN code stats', {
        error: error.message,
        eventId
      });
      return {
        total: 0,
        used: 0,
        expired: 0,
        active: 0,
        usageRate: 0
      };
    }
  }

  /**
   * Générer un PIN à 6 chiffres aléatoire
   */
  private generateRandomPIN(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Vérifier si un PIN code existe déjà pour un événement
   */
  private async isPINCodeUnique(eventId: string, code: string): Promise<boolean> {
    try {
      const snapshot = await this.db
        .collection('pin_codes')
        .where('eventId', '==', eventId)
        .where('code', '==', code)
        .limit(1)
        .get();

      return snapshot.empty;
    } catch (error) {
      logger.error('Error checking PIN code uniqueness', {
        error: error.message,
        eventId
      });
      return false;
    }
  }

  /**
   * Générer un PIN unique pour un événement (avec retry)
   */
  async generateUniquePIN(eventId: string, maxRetries: number = 5): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const pin = this.generateRandomPIN();
      const isUnique = await this.isPINCodeUnique(eventId, pin);
      
      if (isUnique) {
        return pin;
      }
    }
    
    throw new Error('Unable to generate unique PIN code after maximum retries');
  }
}

export const pinCodeService = new PINCodeService();