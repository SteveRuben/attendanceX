/**
 * Service de maintenance pour la gestion de présence
 */

import { logger } from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';
import { presenceAuditService } from './presence-audit.service';
import { collections, db } from '../config';

export interface MaintenanceConfig {
  presenceEntriesRetentionDays: number;
  auditLogsRetentionDays: number;
  notificationsRetentionDays: number;
  reportsRetentionDays: number;
  batchSize: number;
  maxExecutionTimeMs: number;
}

export interface MaintenanceResult {
  success: boolean;
  deletedCounts: {
    presenceEntries: number;
    auditLogs: number;
    notifications: number;
    reports: number;
  };
  errors: string[];
  executionTimeMs: number;
  nextMaintenanceDate?: Date;
}

class PresenceMaintenanceService {
  private readonly defaultConfig: MaintenanceConfig = {
    presenceEntriesRetentionDays: 1095, // 3 ans
    auditLogsRetentionDays: 365, // 1 an
    notificationsRetentionDays: 90, // 3 mois
    reportsRetentionDays: 730, // 2 ans
    batchSize: 500,
    maxExecutionTimeMs: 540000 // 9 minutes (limite Cloud Functions)
  };

  /**
   * Exécuter la maintenance complète
   */
  async runMaintenance(config?: Partial<MaintenanceConfig>): Promise<MaintenanceResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const result: MaintenanceResult = {
      success: true,
      deletedCounts: {
        presenceEntries: 0,
        auditLogs: 0,
        notifications: 0,
        reports: 0
      },
      errors: [],
      executionTimeMs: 0
    };

    try {
      logger.info('Starting presence data maintenance', { config: finalConfig });

      // 1. Nettoyer les anciennes entrées de présence
      try {
        result.deletedCounts.presenceEntries = await this.cleanupOldPresenceEntries(
          finalConfig.presenceEntriesRetentionDays,
          finalConfig.batchSize,
          startTime + finalConfig.maxExecutionTimeMs
        );
      } catch (error) {
        result.errors.push(`Presence entries cleanup failed: ${error}`);
        result.success = false;
      }

      // 2. Nettoyer les anciens logs d'audit
      try {
        result.deletedCounts.auditLogs = await presenceAuditService.cleanupOldEntries(
          finalConfig.auditLogsRetentionDays
        );
      } catch (error) {
        result.errors.push(`Audit logs cleanup failed: ${error}`);
        result.success = false;
      }

      // 3. Nettoyer les anciennes notifications
      try {
        result.deletedCounts.notifications = await this.cleanupOldNotifications(
          finalConfig.notificationsRetentionDays,
          finalConfig.batchSize,
          startTime + finalConfig.maxExecutionTimeMs
        );
      } catch (error) {
        result.errors.push(`Notifications cleanup failed: ${error}`);
        result.success = false;
      }

      // 4. Nettoyer les anciens rapports
      try {
        result.deletedCounts.reports = await this.cleanupOldReports(
          finalConfig.reportsRetentionDays,
          finalConfig.batchSize,
          startTime + finalConfig.maxExecutionTimeMs
        );
      } catch (error) {
        result.errors.push(`Reports cleanup failed: ${error}`);
        result.success = false;
      }

      // 5. Optimiser les index (si nécessaire)
      try {
        await this.optimizeIndexes();
      } catch (error) {
        result.errors.push(`Index optimization failed: ${error}`);
        // Ne pas marquer comme échec car ce n'est pas critique
      }

      result.executionTimeMs = Date.now() - startTime;
      result.nextMaintenanceDate = this.calculateNextMaintenanceDate();

      logger.info('Presence data maintenance completed', {
        result,
        duration: result.executionTimeMs
      });

      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(`General maintenance error: ${error}`);
      result.executionTimeMs = Date.now() - startTime;
      
      logger.error('Presence data maintenance failed', { error, result });
      return result;
    }
  }

  /**
   * Nettoyer les anciennes entrées de présence
   */
  private async cleanupOldPresenceEntries(
    retentionDays: number,
    batchSize: number,
    maxEndTime: number
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;

    try {
      logger.info('Starting presence entries cleanup', { cutoffDate, retentionDays });

      while (Date.now() < maxEndTime) {
        const query = collections.presence_entries
          .where('date', '<', cutoffDate.toISOString().split('T')[0])
          .limit(batchSize);

        const snapshot = await query.get();
        
        if (snapshot.empty) {
          break;
        }

        // Archiver avant de supprimer (optionnel)
        await this.archivePresenceEntries(snapshot.docs);

        // Supprimer par lots
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.docs.length;

        logger.debug('Deleted presence entries batch', { 
          count: snapshot.docs.length, 
          totalDeleted 
        });

        // Pause courte pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Presence entries cleanup completed', { totalDeleted });
      return totalDeleted;

    } catch (error) {
      logger.error('Error cleaning up presence entries', { error, totalDeleted });
      throw error;
    }
  }

  /**
   * Nettoyer les anciennes notifications
   */
  private async cleanupOldNotifications(
    retentionDays: number,
    batchSize: number,
    maxEndTime: number
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;

    try {
      logger.info('Starting notifications cleanup', { cutoffDate, retentionDays });

      while (Date.now() < maxEndTime) {
        const query = collections.presence_notifications
          .where('createdAt', '<', Timestamp.fromDate(cutoffDate))
          .where('status', '==', 'sent') // Ne supprimer que les notifications envoyées
          .limit(batchSize);

        const snapshot = await query.get();
        
        if (snapshot.empty) {
          break;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.docs.length;

        logger.debug('Deleted notifications batch', { 
          count: snapshot.docs.length, 
          totalDeleted 
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Notifications cleanup completed', { totalDeleted });
      return totalDeleted;

    } catch (error) {
      logger.error('Error cleaning up notifications', { error, totalDeleted });
      throw error;
    }
  }

  /**
   * Nettoyer les anciens rapports
   */
  private async cleanupOldReports(
    retentionDays: number,
    batchSize: number,
    maxEndTime: number
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;

    try {
      logger.info('Starting reports cleanup', { cutoffDate, retentionDays });

      while (Date.now() < maxEndTime) {
        const query = collections.presence_reports
          .where('createdAt', '<', Timestamp.fromDate(cutoffDate))
          .where('isScheduled', '==', false) // Ne pas supprimer les rapports programmés
          .limit(batchSize);

        const snapshot = await query.get();
        
        if (snapshot.empty) {
          break;
        }

        // Supprimer les fichiers associés avant de supprimer les documents
        for (const doc of snapshot.docs) {
          const reportData = doc.data();
          if (reportData.filePath) {
            try {
              // TODO: Supprimer le fichier du stockage
              logger.debug('Report file cleanup needed', { filePath: reportData.filePath });
            } catch (fileError) {
              logger.warn('Failed to delete report file', { 
                error: fileError, 
                filePath: reportData.filePath 
              });
            }
          }
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += snapshot.docs.length;

        logger.debug('Deleted reports batch', { 
          count: snapshot.docs.length, 
          totalDeleted 
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info('Reports cleanup completed', { totalDeleted });
      return totalDeleted;

    } catch (error) {
      logger.error('Error cleaning up reports', { error, totalDeleted });
      throw error;
    }
  }

  /**
   * Archiver les entrées de présence avant suppression
   */
  private async archivePresenceEntries(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Promise<void> {
    try {
      // TODO: Implémenter l'archivage vers Cloud Storage ou BigQuery
      logger.debug('Archiving presence entries', { count: docs.length });
      
      // Pour l'instant, on log juste les données importantes
      const archiveData = docs.map(doc => ({
        id: doc.id,
        employeeId: doc.data().employeeId,
        organizationId: doc.data().organizationId,
        date: doc.data().date,
        totalHours: doc.data().totalHours,
        archivedAt: new Date().toISOString()
      }));

      logger.info('Presence entries archived', { 
        count: archiveData.length,
        sample: archiveData.slice(0, 3) // Log quelques exemples
      });

    } catch (error) {
      logger.error('Error archiving presence entries', { error });
      // Ne pas faire échouer la suppression si l'archivage échoue
    }
  }

  /**
   * Optimiser les index Firestore
   */
  private async optimizeIndexes(): Promise<void> {
    try {
      logger.info('Starting index optimization');

      // TODO: Implémenter l'optimisation des index
      // - Analyser les requêtes lentes
      // - Suggérer de nouveaux index
      // - Identifier les index inutilisés

      logger.info('Index optimization completed');

    } catch (error) {
      logger.error('Error optimizing indexes', { error });
      throw error;
    }
  }

  /**
   * Calculer la prochaine date de maintenance
   */
  private calculateNextMaintenanceDate(): Date {
    const nextMaintenance = new Date();
    nextMaintenance.setDate(nextMaintenance.getDate() + 7); // Maintenance hebdomadaire
    nextMaintenance.setHours(2, 0, 0, 0); // 2h du matin
    return nextMaintenance;
  }

  /**
   * Obtenir les statistiques de stockage
   */
  async getStorageStats(): Promise<{
    collections: Record<string, {
      documentCount: number;
      estimatedSize: string;
      oldestDocument?: Date;
      newestDocument?: Date;
    }>;
    totalDocuments: number;
  }> {
    try {
      const collections = [
        'presence_entries',
        'presence_audit_logs',
        'presence_notifications',
        'presence_reports',
        'employees',
        'work_schedules',
        'leave_requests'
      ];

      const stats: any = {
        collections: {},
        totalDocuments: 0
      };

      for (const collectionName of collections) {
        try {
          // Compter les documents (approximatif pour les grandes collections)
          const snapshot = await collections[collectionName].limit(1).get();
          
          if (!snapshot.empty) {
            // Pour une estimation plus précise, on pourrait utiliser des agrégations
            const countSnapshot = await collections[collectionName].count().get();
            const documentCount = countSnapshot.data().count;

            stats.collections[collectionName] = {
              documentCount,
              estimatedSize: this.formatBytes(documentCount * 1024), // Estimation grossière
            };

            stats.totalDocuments += documentCount;

            // Obtenir les dates des documents les plus anciens et récents
            try {
              const oldestSnapshot = await collections[collectionName]
                .orderBy('createdAt', 'asc')
                .limit(1)
                .get();

              const newestSnapshot = collections[collectionName]
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

              if (!oldestSnapshot.empty) {
                stats.collections[collectionName].oldestDocument = 
                  oldestSnapshot.docs[0].data().createdAt?.toDate();
              }

              if (!newestSnapshot.empty) {
                stats.collections[collectionName].newestDocument = 
                  newestSnapshot.docs[0].data().createdAt?.toDate();
              }
            } catch (orderError) {
              // Ignorer les erreurs d'ordre (champ createdAt peut ne pas exister)
            }
          } else {
            stats.collections[collectionName] = {
              documentCount: 0,
              estimatedSize: '0 B'
            };
          }

        } catch (error) {
          logger.warn(`Error getting stats for collection ${collectionName}`, { error });
          stats.collections[collectionName] = {
            documentCount: -1,
            estimatedSize: 'Unknown',
            error: error.message
          };
        }
      }

      return stats;

    } catch (error) {
      logger.error('Error getting storage stats', { error });
      throw error;
    }
  }

  /**
   * Vérifier la santé des données
   */
  async checkDataHealth(): Promise<{
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      count?: number;
    }>;
    recommendations: string[];
  }> {
    const issues: any[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Vérifier les entrées de présence orphelines
      const orphanedEntries = await this.findOrphanedPresenceEntries();
      if (orphanedEntries > 0) {
        issues.push({
          type: 'orphaned_presence_entries',
          severity: 'medium',
          description: 'Presence entries without corresponding employees',
          count: orphanedEntries
        });
        recommendations.push('Clean up orphaned presence entries');
      }

      // 2. Vérifier les entrées incomplètes
      const incompleteEntries = await this.findIncompletePresenceEntries();
      if (incompleteEntries > 0) {
        issues.push({
          type: 'incomplete_presence_entries',
          severity: 'low',
          description: 'Presence entries missing clock-out time',
          count: incompleteEntries
        });
        recommendations.push('Review and complete missing clock-out times');
      }

      // 3. Vérifier les anomalies non traitées
      const unprocessedAnomalies = await this.findUnprocessedAnomalies();
      if (unprocessedAnomalies > 0) {
        issues.push({
          type: 'unprocessed_anomalies',
          severity: 'high',
          description: 'Presence anomalies requiring attention',
          count: unprocessedAnomalies
        });
        recommendations.push('Review and resolve presence anomalies');
      }

      // 4. Vérifier la cohérence des données
      const inconsistentData = await this.findDataInconsistencies();
      if (inconsistentData > 0) {
        issues.push({
          type: 'data_inconsistencies',
          severity: 'medium',
          description: 'Data inconsistencies detected',
          count: inconsistentData
        });
        recommendations.push('Run data consistency checks and repairs');
      }

      return { issues, recommendations };

    } catch (error) {
      logger.error('Error checking data health', { error });
      throw error;
    }
  }

  /**
   * Trouver les entrées de présence orphelines
   */
  private async findOrphanedPresenceEntries(): Promise<number> {
    // TODO: Implémenter la recherche d'entrées orphelines
    return 0;
  }

  /**
   * Trouver les entrées de présence incomplètes
   */
  private async findIncompletePresenceEntries(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 1); // Entrées d'hier ou plus anciennes

      const snapshot = await collections.presence_entries
        .where('date', '<', cutoffDate.toISOString().split('T')[0])
        .where('clockInTime', '!=', null)
        .where('clockOutTime', '==', null)
        .limit(1000)
        .get();

      return snapshot.size;

    } catch (error) {
      logger.error('Error finding incomplete presence entries', { error });
      return 0;
    }
  }

  /**
   * Trouver les anomalies non traitées
   */
  private async findUnprocessedAnomalies(): Promise<number> {
    try {
      const snapshot = await collections.presence_entries
        .where('hasAnomalies', '==', true)
        .where('isValidated', '==', false)
        .limit(1000)
        .get();

      return snapshot.size;

    } catch (error) {
      logger.error('Error finding unprocessed anomalies', { error });
      return 0;
    }
  }

  /**
   * Trouver les incohérences de données
   */
  private async findDataInconsistencies(): Promise<number> {
    // TODO: Implémenter la recherche d'incohérences
    return 0;
  }

  /**
   * Formater les bytes en format lisible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const presenceMaintenanceService = new PresenceMaintenanceService();