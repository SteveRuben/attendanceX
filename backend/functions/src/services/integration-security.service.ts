import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { IntegrationProvider } from '@attendance-x/shared';

export interface SecurityAuditLog {
  id: string;
  userId: string;
  integrationId: string;
  provider: IntegrationProvider;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PrivacySettings {
  userId: string;
  dataRetentionDays: number;
  allowDataSharing: boolean;
  allowAnalytics: boolean;
  encryptionLevel: 'standard' | 'enhanced';
  auditLogRetentionDays: number;
  notifyOnDataAccess: boolean;
}

export class IntegrationSecurityService {
  private readonly db = getFirestore();
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32;
  private readonly IV_LENGTH = 16;

  /**
   * Génère une clé de chiffrement spécifique à l'utilisateur
   */
  private generateUserEncryptionKey(userId: string): Buffer {
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('Master encryption key not configured');
    }

    // Dériver une clé spécifique à l'utilisateur
    return crypto.pbkdf2Sync(
      masterKey,
      `user_${userId}`,
      100000, // iterations
      this.KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Chiffre des données sensibles avec une clé spécifique à l'utilisateur
   */
  async encryptSensitiveData(
    data: string,
    userId: string
  ): Promise<{
    encryptedData: string;
    iv: string;
    authTag: string;
  }> {
    try {
      const key = this.generateUserEncryptionKey(userId);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
      cipher.setAAD(Buffer.from(userId)); // Additional authenticated data
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', { userId, error });
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Déchiffre des données sensibles
   */
  async decryptSensitiveData(
    encryptedData: string,
    iv: string,
    authTag: string,
    userId: string
  ): Promise<string> {
    try {
      const key = this.generateUserEncryptionKey(userId);
      
      const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAAD(Buffer.from(userId));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { userId, error });
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Enregistre une action dans le journal d'audit
   */
  async logSecurityEvent(
    event: Omit<SecurityAuditLog, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      const auditLog: SecurityAuditLog = {
        ...event,
        id: crypto.randomUUID(),
        timestamp: new Date()
      };

      await this.db
        .collection('security_audit_logs')
        .doc(auditLog.id)
        .set(auditLog);

      // Log critique pour monitoring
      if (event.riskLevel === 'high') {
        logger.warn('High-risk security event', auditLog);
      }

    } catch (error) {
      logger.error('Failed to log security event', { event, error });
    }
  }

  /**
   * Obtient les paramètres de confidentialité d'un utilisateur
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const doc = await this.db
        .collection('user_privacy_settings')
        .doc(userId)
        .get();

      if (!doc.exists) {
        // Paramètres par défaut
        const defaultSettings: PrivacySettings = {
          userId,
          dataRetentionDays: 365,
          allowDataSharing: false,
          allowAnalytics: true,
          encryptionLevel: 'standard',
          auditLogRetentionDays: 90,
          notifyOnDataAccess: true
        };

        await this.updatePrivacySettings(userId, defaultSettings);
        return defaultSettings;
      }

      return doc.data() as PrivacySettings;
    } catch (error) {
      logger.error('Failed to get privacy settings', { userId, error });
      throw error;
    }
  }

  /**
   * Met à jour les paramètres de confidentialité
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      await this.db
        .collection('user_privacy_settings')
        .doc(userId)
        .set(settings, { merge: true });

      await this.logSecurityEvent({
        userId,
        integrationId: 'system',
        provider: 'system' as IntegrationProvider,
        action: 'privacy_settings_updated',
        details: { updatedFields: Object.keys(settings) },
        riskLevel: 'low'
      });

    } catch (error) {
      logger.error('Failed to update privacy settings', { userId, error });
      throw error;
    }
  }

  /**
   * Supprime toutes les données d'intégration d'un utilisateur
   */
  async deleteUserIntegrationData(
    userId: string,
    integrationId?: string
  ): Promise<void> {
    try {
      const batch = this.db.batch();

      // Supprimer les intégrations
      if (integrationId) {
        const integrationRef = this.db
          .collection('user_integrations')
          .doc(integrationId);
        batch.delete(integrationRef);
      } else {
        const integrations = await this.db
          .collection('user_integrations')
          .where('userId', '==', userId)
          .get();

        integrations.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Supprimer les tokens
      const tokens = await this.db
        .collection('oauth_tokens')
        .where('userId', '==', userId)
        .get();

      tokens.docs.forEach(doc => {
        if (!integrationId || doc.data().integrationId === integrationId) {
          batch.delete(doc.ref);
        }
      });

      // Supprimer l'historique de sync
      const syncHistory = await this.db
        .collection('sync_history')
        .where('userId', '==', userId)
        .get();

      syncHistory.docs.forEach(doc => {
        if (!integrationId || doc.data().integrationId === integrationId) {
          batch.delete(doc.ref);
        }
      });

      await batch.commit();

      await this.logSecurityEvent({
        userId,
        integrationId: integrationId || 'all',
        provider: 'system' as IntegrationProvider,
        action: 'user_data_deleted',
        details: { 
          scope: integrationId ? 'single_integration' : 'all_integrations',
          integrationId 
        },
        riskLevel: 'medium'
      });

    } catch (error) {
      logger.error('Failed to delete user integration data', { userId, integrationId, error });
      throw error;
    }
  }

  /**
   * Nettoie les données expirées selon les paramètres de confidentialité
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const users = await this.db.collection('user_privacy_settings').get();

      for (const userDoc of users.docs) {
        const settings = userDoc.data() as PrivacySettings;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - settings.dataRetentionDays);

        // Nettoyer l'historique de sync expiré
        const expiredSyncHistory = await this.db
          .collection('sync_history')
          .where('userId', '==', settings.userId)
          .where('timestamp', '<', cutoffDate)
          .get();

        const batch = this.db.batch();
        expiredSyncHistory.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        // Nettoyer les logs d'audit expirés
        const auditCutoffDate = new Date();
        auditCutoffDate.setDate(auditCutoffDate.getDate() - settings.auditLogRetentionDays);

        const expiredAuditLogs = await this.db
          .collection('security_audit_logs')
          .where('userId', '==', settings.userId)
          .where('timestamp', '<', auditCutoffDate)
          .get();

        expiredAuditLogs.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        if (expiredSyncHistory.size > 0 || expiredAuditLogs.size > 0) {
          await batch.commit();
          
          logger.info('Cleaned up expired data', {
            userId: settings.userId,
            syncHistoryDeleted: expiredSyncHistory.size,
            auditLogsDeleted: expiredAuditLogs.size
          });
        }
      }

    } catch (error) {
      logger.error('Failed to cleanup expired data', error);
      throw error;
    }
  }

  /**
   * Vérifie l'intégrité des données chiffrées
   */
  async verifyDataIntegrity(userId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Vérifier les tokens OAuth
      const tokens = await this.db
        .collection('oauth_tokens')
        .where('userId', '==', userId)
        .get();

      for (const tokenDoc of tokens.docs) {
        const tokenData = tokenDoc.data();
        try {
          if (tokenData.encryptedAccessToken) {
            await this.decryptSensitiveData(
              tokenData.encryptedAccessToken,
              tokenData.iv,
              tokenData.authTag,
              userId
            );
          }
        } catch (error) {
          issues.push(`Token corruption detected for integration ${tokenData.integrationId}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      logger.error('Failed to verify data integrity', { userId, error });
      return {
        valid: false,
        issues: ['Failed to perform integrity check']
      };
    }
  }

  /**
   * Génère un rapport de sécurité pour un utilisateur
   */
  async generateSecurityReport(userId: string): Promise<{
    integrations: number;
    lastActivity: Date | null;
    securityEvents: number;
    dataRetentionDays: number;
    encryptionStatus: string;
    recommendations: string[];
  }> {
    try {
      const [integrations, auditLogs, privacySettings] = await Promise.all([
        this.db.collection('user_integrations').where('userId', '==', userId).get(),
        this.db.collection('security_audit_logs').where('userId', '==', userId)
          .orderBy('timestamp', 'desc').limit(100).get(),
        this.getPrivacySettings(userId)
      ]);

      const recommendations: string[] = [];
      
      // Analyser les événements de sécurité récents
      const recentHighRiskEvents = auditLogs.docs.filter(doc => 
        doc.data().riskLevel === 'high' && 
        doc.data().timestamp.toDate() > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (recentHighRiskEvents.length > 0) {
        recommendations.push('Événements de sécurité à haut risque détectés récemment');
      }

      if (privacySettings.encryptionLevel === 'standard') {
        recommendations.push('Considérez l\'activation du chiffrement renforcé');
      }

      if (privacySettings.dataRetentionDays > 365) {
        recommendations.push('Réduisez la période de rétention des données pour améliorer la confidentialité');
      }

      const lastActivity = auditLogs.docs.length > 0 
        ? auditLogs.docs[0].data().timestamp.toDate()
        : null;

      return {
        integrations: integrations.size,
        lastActivity,
        securityEvents: auditLogs.size,
        dataRetentionDays: privacySettings.dataRetentionDays,
        encryptionStatus: privacySettings.encryptionLevel,
        recommendations
      };

    } catch (error) {
      logger.error('Failed to generate security report', { userId, error });
      throw error;
    }
  }
}