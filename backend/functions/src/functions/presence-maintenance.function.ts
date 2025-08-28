/**
 * Fonction Cloud Function pour la maintenance automatique de la présence
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { presenceMaintenanceService } from '../services/presence-maintenance.service';
import { cleanupSecurityData } from '../middleware/presence-security.middleware';

/**
 * Fonction programmée pour la maintenance hebdomadaire
 * Exécutée tous les dimanches à 2h du matin UTC
 */
export const weeklyPresenceMaintenance = onSchedule(
  {
    schedule: '0 2 * * 0', // Cron: tous les dimanches à 2h
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting scheduled weekly presence maintenance');

      const result = await presenceMaintenanceService.runMaintenance({
        presenceEntriesRetentionDays: 1095, // 3 ans
        auditLogsRetentionDays: 365, // 1 an
        notificationsRetentionDays: 90, // 3 mois
        reportsRetentionDays: 730, // 2 ans
        batchSize: 500,
        maxExecutionTimeMs: 480000 // 8 minutes (marge de sécurité)
      });

      // Nettoyer également les données de sécurité en mémoire
      cleanupSecurityData();

      if (result.success) {
        logger.info('Weekly presence maintenance completed successfully', {
          deletedCounts: result.deletedCounts,
          executionTime: result.executionTimeMs,
          nextMaintenance: result.nextMaintenanceDate
        });
      } else {
        logger.error('Weekly presence maintenance completed with errors', {
          errors: result.errors,
          deletedCounts: result.deletedCounts,
          executionTime: result.executionTimeMs
        });
      }

      // CHANGEMENT: Ne pas retourner result, juste logger
      // return result; // ❌ Supprimé

    } catch (error) {
      logger.error('Weekly presence maintenance failed', { error });
      throw error;
    }
  }
);

/**
 * Fonction programmée pour la maintenance quotidienne légère
 * Exécutée tous les jours à 1h du matin UTC
 */
export const dailyPresenceMaintenance = onSchedule(
  {
    schedule: '0 1 * * *', // Cron: tous les jours à 1h
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 300, // 5 minutes
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting scheduled daily presence maintenance');

      // Maintenance légère quotidienne
      const result = await presenceMaintenanceService.runMaintenance({
        presenceEntriesRetentionDays: 1095,
        auditLogsRetentionDays: 30, // Nettoyer seulement les logs très récents
        notificationsRetentionDays: 7, // Nettoyer les notifications de la semaine
        reportsRetentionDays: 730,
        batchSize: 100, // Lots plus petits
        maxExecutionTimeMs: 240000 // 4 minutes
      });

      // Nettoyer les données de sécurité
      cleanupSecurityData();

      logger.info('Daily presence maintenance completed', {
        success: result.success,
        deletedCounts: result.deletedCounts,
        executionTime: result.executionTimeMs
      });

      // CHANGEMENT: Ne pas retourner result
      // return result; // ❌ Supprimé

    } catch (error) {
      logger.error('Daily presence maintenance failed', { error });
      throw error;
    }
  }
);

/**
 * Fonction callable pour déclencher la maintenance manuellement
 */
export const triggerPresenceMaintenance = onCall(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'europe-west1'
  },
  async (request) => {
    try {
      // Vérifier les permissions (admin seulement)
      if (!request.auth || request.auth.token.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      logger.info('Manual presence maintenance triggered', {
        userId: request.auth.uid,
        config: request.data
      });

      const config = request.data || {};
      const result = await presenceMaintenanceService.runMaintenance(config);

      logger.info('Manual presence maintenance completed', {
        userId: request.auth.uid,
        result
      });

      // ✅ Les onCall peuvent retourner des données
      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Manual presence maintenance failed', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * Fonction callable pour obtenir les statistiques de stockage
 */
export const getPresenceStorageStats = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'europe-west1'
  },
  async (request) => {
    try {
      // Vérifier les permissions (admin ou manager)
      if (!request.auth || !['admin', 'manager'].includes(request.auth.token.role)) {
        throw new Error('Unauthorized: Admin or Manager role required');
      }

      logger.info('Storage stats requested', { userId: request.auth.uid });

      const stats = await presenceMaintenanceService.getStorageStats();

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      logger.error('Failed to get storage stats', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * Fonction callable pour vérifier la santé des données
 */
export const checkPresenceDataHealth = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 120,
    region: 'europe-west1'
  },
  async (request) => {
    try {
      // Vérifier les permissions (admin seulement)
      if (!request.auth || request.auth.token.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      logger.info('Data health check requested', { userId: request.auth.uid });

      const healthCheck = await presenceMaintenanceService.checkDataHealth();

      logger.info('Data health check completed', {
        userId: request.auth.uid,
        issuesCount: healthCheck.issues.length,
        recommendationsCount: healthCheck.recommendations.length
      });

      return {
        success: true,
        data: healthCheck
      };

    } catch (error) {
      logger.error('Failed to check data health', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * Fonction programmée pour nettoyer les données de sécurité en mémoire
 * Exécutée toutes les heures
 */
export const cleanupSecurityDataScheduled = onSchedule(
  {
    schedule: '0 * * * *', // Cron: toutes les heures
    timeZone: 'UTC',
    memory: '128MiB',
    timeoutSeconds: 60,
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting scheduled security data cleanup');

      cleanupSecurityData();

      logger.info('Scheduled security data cleanup completed');
      
      // ✅ Pas de return nécessaire pour les fonctions schedulées
      
    } catch (error) {
      logger.error('Scheduled security data cleanup failed', { error });
      // ✅ Throw error pour marquer la fonction comme ayant échoué
      throw error;
    }
  }
);

/**
 * Fonction pour optimiser les index Firestore
 * Exécutée manuellement ou via un déclencheur
 */
export const optimizeFirestoreIndexes = onCall(
  {
    memory: '256MiB',
    timeoutSeconds: 300,
    region: 'europe-west1'
  },
  async (request) => {
    try {
      // Vérifier les permissions (admin seulement)
      if (!request.auth || request.auth.token.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      logger.info('Firestore index optimization requested', { userId: request.auth.uid });

      // TODO: Implémenter l'optimisation des index
      // - Analyser les requêtes lentes
      // - Suggérer de nouveaux index
      // - Identifier les index inutilisés

      const result = {
        analyzedQueries: 0,
        suggestedIndexes: [],
        unusedIndexes: [],
        optimizationRecommendations: [
          'Monitor query performance in Firebase Console',
          'Review slow queries and add appropriate indexes',
          'Consider composite indexes for complex queries'
        ]
      };

      logger.info('Firestore index optimization completed', {
        userId: request.auth.uid,
        result
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Failed to optimize Firestore indexes', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * Fonction pour générer un rapport de maintenance
 */
export const generateMaintenanceReport = onCall(
  {
    memory: '512MiB',
    timeoutSeconds: 180,
    region: 'europe-west1'
  },
  async (request) => {
    try {
      // Vérifier les permissions (admin seulement)
      if (!request.auth || request.auth.token.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required');
      }

      logger.info('Maintenance report generation requested', { userId: request.auth.uid });

      // Obtenir les statistiques de stockage
      const storageStats = await presenceMaintenanceService.getStorageStats();

      // Vérifier la santé des données
      const healthCheck = await presenceMaintenanceService.checkDataHealth();

      // Générer le rapport
      const report = {
        generatedAt: new Date().toISOString(),
        generatedBy: request.auth.uid,
        storageStats,
        healthCheck,
        summary: {
          totalDocuments: storageStats.totalDocuments,
          totalIssues: healthCheck.issues.length,
          criticalIssues: healthCheck.issues.filter(i => i.severity === 'high').length,
          recommendations: healthCheck.recommendations.length
        },
        nextScheduledMaintenance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      logger.info('Maintenance report generated', {
        userId: request.auth.uid,
        summary: report.summary
      });

      return {
        success: true,
        data: report
      };

    } catch (error) {
      logger.error('Failed to generate maintenance report', { 
        error,
        userId: request.auth?.uid 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
);

/**
 * FONCTION HELPER BONUS: Sauvegarder les résultats de maintenance
 * Si vous voulez garder un historique des maintenances en base de données
 *//*
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

async function saveMaintenanceResult(result: any, type: 'daily' | 'weekly'): Promise<void> {
  try {
    // Sauvegarder le résultat en Firestore pour référence future
    const db = getFirestore();
    await db.collection('maintenance_logs').add({
      type,
      result,
      timestamp: FieldValue.serverTimestamp(),
      success: result.success,
      executionTimeMs: result.executionTimeMs,
      deletedCounts: result.deletedCounts
    });
    
    logger.info(`Maintenance result saved to database`, { type, success: result.success });
  } catch (error) {
    logger.error('Failed to save maintenance result', { error, type });
    // Ne pas throw ici pour ne pas faire échouer la maintenance principale
  }
}

/**
 * Usage des fonctions helper dans vos fonctions schedulées:
 * 
 * // Après avoir obtenu le résultat de maintenance
 * const result = await presenceMaintenanceService.runMaintenance(config);
 * 
 * // Optionnel: sauvegarder en base pour historique
 * await saveMaintenanceResult(result, 'weekly'); // ou 'daily'
 * 
 * // Logger les informations importantes
 * logger.info('Maintenance completed', { 
 *   success: result.success,
 *   deletedCounts: result.deletedCounts 
 * });
 * 
 * // ✅ Pas de return result dans les fonctions schedulées
 */