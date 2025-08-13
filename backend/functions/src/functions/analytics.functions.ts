import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { integrationAnalyticsService } from '../services/integration-analytics.service';

/**
 * Fonction planifiée pour collecter les métriques d'intégration
 * Exécutée toutes les heures
 */
export const collectIntegrationMetrics = onSchedule({
  schedule: '0 * * * *', // Toutes les heures
  timeZone: 'Europe/Paris',
  memory: '256MiB',
  timeoutSeconds: 300
}, async (event) => {
  try {
    logger.info('Starting scheduled integration metrics collection');

    // Collecter toutes les métriques
    const [integrationMetrics, userAdoptionMetrics, performanceMetrics] = await Promise.all([
      integrationAnalyticsService.collectIntegrationMetrics(),
      integrationAnalyticsService.collectUserAdoptionMetrics(),
      integrationAnalyticsService.collectPerformanceMetrics()
    ]);

    logger.info('Integration metrics collected successfully', {
      integrationProvidersCount: integrationMetrics.length,
      totalUsers: userAdoptionMetrics.totalUsers,
      avgResponseTime: performanceMetrics.avgResponseTime,
      timestamp: new Date()
    });

    // Vérifier les alertes
    await integrationAnalyticsService.checkAlerts();

    logger.info('Scheduled metrics collection completed successfully');

  } catch (error) {
    logger.error('Failed to collect scheduled metrics', { error });
    throw error; // Relancer l'erreur pour que Cloud Functions puisse la traquer
  }
});

/**
 * Fonction planifiée pour nettoyer les anciennes métriques
 * Exécutée quotidiennement à 2h du matin
 */
export const cleanupOldMetrics = onSchedule({
  schedule: '0 2 * * *', // Tous les jours à 2h du matin
  timeZone: 'Europe/Paris',
  memory: '256MiB',
  timeoutSeconds: 600
}, async (event) => {
  try {
    logger.info('Starting cleanup of old metrics');

    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    // Supprimer les métriques de plus de 90 jours
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const collections = [
      'integration_metrics',
      'user_adoption_metrics',
      'performance_metrics',
      'performance_logs',
      'health_checks'
    ];

    let totalDeleted = 0;

    for (const collection of collections) {
      const oldDocs = await db
        .collection(collection)
        .where('timestamp', '<', cutoffDate)
        .limit(500) // Traiter par lots pour éviter les timeouts
        .get();

      if (!oldDocs.empty) {
        const batch = db.batch();
        oldDocs.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        totalDeleted += oldDocs.size;

        logger.info(`Deleted ${oldDocs.size} old documents from ${collection}`);
      }
    }

    logger.info('Cleanup completed successfully', {
      totalDeleted,
      cutoffDate: cutoffDate.toISOString()
    });

  } catch (error) {
    logger.error('Failed to cleanup old metrics', { error });
    throw error;
  }
});

/**
 * Fonction planifiée pour générer des rapports hebdomadaires
 * Exécutée tous les lundis à 8h du matin
 */
export const generateWeeklyReport = onSchedule({
  schedule: '0 8 * * 1', // Tous les lundis à 8h du matin
  timeZone: 'Europe/Paris',
  memory: '512MiB',
  timeoutSeconds: 600
}, async (event) => {
  try {
    logger.info('Starting weekly report generation');

    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    // Calculer la période de la semaine dernière
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    // Récupérer les métriques de la semaine
    const weeklyMetrics = await Promise.all([
      // Métriques d'intégration
      db.collection('integration_metrics')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<', endDate)
        .get(),
      
      // Métriques d'adoption
      db.collection('user_adoption_metrics')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<', endDate)
        .get(),
      
      // Métriques de performance
      db.collection('performance_metrics')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<', endDate)
        .get()
    ]);

    // Générer le rapport
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalIntegrationMetrics: weeklyMetrics[0].size,
        totalAdoptionMetrics: weeklyMetrics[1].size,
        totalPerformanceMetrics: weeklyMetrics[2].size
      },
      trends: {
        // Calculer les tendances basées sur les données
        userGrowth: calculateUserGrowthTrend(weeklyMetrics[1].docs),
        performanceTrend: calculatePerformanceTrend(weeklyMetrics[2].docs),
        integrationUsageTrend: calculateIntegrationUsageTrend(weeklyMetrics[0].docs)
      },
      generatedAt: new Date()
    };

    // Sauvegarder le rapport
    await db.collection('weekly_reports').add(report);

    logger.info('Weekly report generated successfully', {
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      metricsCount: {
        integration: weeklyMetrics[0].size,
        adoption: weeklyMetrics[1].size,
        performance: weeklyMetrics[2].size
      }
    });

    // TODO: Envoyer le rapport par email aux administrateurs
    // Cela pourrait être intégré avec le service de notification existant

  } catch (error) {
    logger.error('Failed to generate weekly report', { error });
    throw error;
  }
});

/**
 * Calcule la tendance de croissance des utilisateurs
 */
function calculateUserGrowthTrend(docs: any[]): { growth: number; trend: 'up' | 'down' | 'stable' } {
  if (docs.length < 2) {
    return { growth: 0, trend: 'stable' };
  }

  const sortedDocs = docs.sort((a, b) => a.data().timestamp.toDate() - b.data().timestamp.toDate());
  const first = sortedDocs[0].data();
  const last = sortedDocs[sortedDocs.length - 1].data();

  const growth = ((last.totalUsers - first.totalUsers) / first.totalUsers) * 100;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (growth > 1) trend = 'up';
  else if (growth < -1) trend = 'down';

  return { growth, trend };
}

/**
 * Calcule la tendance de performance
 */
function calculatePerformanceTrend(docs: any[]): { avgResponseTime: number; trend: 'improving' | 'degrading' | 'stable' } {
  if (docs.length === 0) {
    return { avgResponseTime: 0, trend: 'stable' };
  }

  const responseTimes = docs.map(doc => doc.data().avgResponseTime).filter(time => time != null);
  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

  // Comparer avec la moyenne des 7 jours précédents (si disponible)
  // Pour simplifier, on considère stable pour l'instant
  return { avgResponseTime, trend: 'stable' };
}

/**
 * Calcule la tendance d'utilisation des intégrations
 */
function calculateIntegrationUsageTrend(docs: any[]): { totalSyncs: number; successRate: number; trend: 'up' | 'down' | 'stable' } {
  if (docs.length === 0) {
    return { totalSyncs: 0, successRate: 0, trend: 'stable' };
  }

  const totalSyncs = docs.reduce((sum, doc) => sum + (doc.data().totalSyncs || 0), 0);
  const totalSuccessful = docs.reduce((sum, doc) => sum + (doc.data().successfulSyncs || 0), 0);
  const successRate = totalSyncs > 0 ? (totalSuccessful / totalSyncs) * 100 : 0;

  return { totalSyncs, successRate, trend: 'stable' };
}