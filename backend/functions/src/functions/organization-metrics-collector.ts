import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { organizationMonitoringService } from '../services/organization-monitoring.service';
import { collections } from '../config';

/**
 * Fonction Cloud qui collecte automatiquement les métriques d'organisation
 * S'exécute toutes les heures
 */
export const collectOrganizationMetrics = onSchedule({
  schedule: '0 * * * *', // Toutes les heures
  timeZone: 'Europe/Paris',
  memory: '512MiB',
  timeoutSeconds: 300
}, async (event) => {
  logger.info('Starting organization metrics collection');

  try {
    // Récupérer toutes les organisations actives
    const organizationsQuery = await collections.organizations
      .where('status', '==', 'active')
      .get();

    const totalOrganizations = organizationsQuery.size;
    let successCount = 0;
    let errorCount = 0;

    logger.info(`Found ${totalOrganizations} active organizations to process`);

    // Traiter les organisations par batch pour éviter les timeouts
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < organizationsQuery.docs.length; i += batchSize) {
      batches.push(organizationsQuery.docs.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async (orgDoc) => {
        try {
          await organizationMonitoringService.collectOrganizationMetrics(orgDoc.id);
          successCount++;
          logger.debug(`Metrics collected for organization ${orgDoc.id}`);
        } catch (error) {
          errorCount++;
          logger.error(`Failed to collect metrics for organization ${orgDoc.id}`, { error });
        }
      });

      await Promise.allSettled(promises);
    }

    // Vérifier les règles d'alerte après la collecte
    await organizationMonitoringService.checkAlertRules();

    logger.info('Organization metrics collection completed', {
      totalOrganizations,
      successCount,
      errorCount,
      successRate: (successCount / totalOrganizations) * 100
    });

    // Logger les statistiques globales
    await logGlobalStats(successCount, errorCount);

  } catch (error) {
    logger.error('Error in organization metrics collection', { error });
    throw error;
  }
});

/**
 * Fonction Cloud qui nettoie les anciennes métriques
 * S'exécute tous les jours à 2h du matin
 */
export const cleanupOldMetrics = onSchedule({
  schedule: '0 2 * * *', // Tous les jours à 2h
  timeZone: 'Europe/Paris',
  memory: '256MiB',
  timeoutSeconds: 180
}, async (event) => {
  logger.info('Starting cleanup of old metrics');

  try {
    const retentionDays = 90; // Conserver 90 jours de métriques
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Nettoyer les métriques d'organisation
    const oldMetricsQuery = await collections.organization_metrics
      .where('timestamp', '<', cutoffDate)
      .limit(500) // Traiter par batch pour éviter les timeouts
      .get();

    if (oldMetricsQuery.size > 0) {
      const batch = collections.organization_metrics.firestore.batch();
      
      oldMetricsQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      logger.info(`Deleted ${oldMetricsQuery.size} old metric records`);
    }

    // Nettoyer les alertes résolues anciennes
    const oldAlertsQuery = await collections.alerts
      .where('status', '==', 'resolved')
      .where('triggeredAt', '<', cutoffDate)
      .limit(500)
      .get();

    if (oldAlertsQuery.size > 0) {
      const alertsBatch = collections.alerts.firestore.batch();
      
      oldAlertsQuery.docs.forEach(doc => {
        alertsBatch.delete(doc.ref);
      });

      await alertsBatch.commit();
      
      logger.info(`Deleted ${oldAlertsQuery.size} old alert records`);
    }

    logger.info('Cleanup of old metrics completed');

  } catch (error) {
    logger.error('Error in cleanup of old metrics', { error });
    throw error;
  }
});

/**
 * Fonction Cloud qui génère un rapport hebdomadaire
 * S'exécute tous les lundis à 9h
 */
export const generateWeeklyReport = onSchedule({
  schedule: '0 9 * * 1', // Tous les lundis à 9h
  timeZone: 'Europe/Paris',
  memory: '512MiB',
  timeoutSeconds: 300
}, async (event) => {
  logger.info('Starting weekly report generation');

  try {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Récupérer les statistiques globales de la semaine
    const weeklyStats = await getWeeklyStats(lastWeek);

    // Sauvegarder le rapport
    await collections.weekly_reports.add({
      period: {
        start: lastWeek,
        end: new Date()
      },
      stats: weeklyStats,
      generatedAt: new Date()
    });

    logger.info('Weekly report generated', { stats: weeklyStats });

    // TODO: Envoyer le rapport par email aux administrateurs

  } catch (error) {
    logger.error('Error generating weekly report', { error });
    throw error;
  }
});

async function logGlobalStats(successCount: number, errorCount: number): Promise<void> {
  try {
    await collections.system_stats.add({
      type: 'metrics_collection',
      timestamp: new Date(),
      stats: {
        organizationsProcessed: successCount + errorCount,
        successCount,
        errorCount,
        successRate: successCount > 0 ? (successCount / (successCount + errorCount)) * 100 : 0
      }
    });
  } catch (error) {
    logger.error('Error logging global stats', { error });
  }
}

async function getWeeklyStats(since: Date): Promise<any> {
  try {
    const [
      organizationsQuery,
      usersQuery,
      invitationsQuery,
      errorsQuery
    ] = await Promise.all([
      collections.audit_logs
        .where('action', '==', 'organization_created')
        .where('timestamp', '>=', since)
        .get(),
      collections.audit_logs
        .where('action', '==', 'user_registered')
        .where('timestamp', '>=', since)
        .get(),
      collections.audit_logs
        .where('action', '==', 'invitation_sent')
        .where('timestamp', '>=', since)
        .get(),
      collections.error_logs
        .where('timestamp', '>=', since)
        .get()
    ]);

    return {
      organizationsCreated: organizationsQuery.size,
      newUsers: usersQuery.size,
      invitationsSent: invitationsQuery.size,
      totalErrors: errorsQuery.size,
      period: '7 days'
    };

  } catch (error) {
    logger.error('Error getting weekly stats', { error });
    return {
      organizationsCreated: 0,
      newUsers: 0,
      invitationsSent: 0,
      totalErrors: 0,
      period: '7 days'
    };
  }
}