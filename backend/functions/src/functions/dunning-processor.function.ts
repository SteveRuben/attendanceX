/**
 * Cloud Function pour traiter automatiquement les relances de paiement
 * Exécutée quotidiennement pour gérer les processus de recouvrement
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { DunningProcessingJobs } from '../jobs/dunning-processing.jobs';

/**
 * Job quotidien pour traiter les relances de paiement
 * Exécuté tous les jours à 9h00 UTC
 */
export const processDunningDaily = onSchedule({
  schedule: '0 9 * * *', // Tous les jours à 9h00 UTC
  timeZone: 'UTC',
  memory: '1GiB',
  timeoutSeconds: 300
}, async (event) => {
  logger.info('Starting daily dunning processing job', {
    scheduledTime: event.scheduleTime,
    jobName: event.jobName
  });

  try {
    // Traiter toutes les relances dues
    await DunningProcessingJobs.processDueDunningActions();

    logger.info('Daily dunning processing completed successfully');
  } catch (error) {
    logger.error('Error in daily dunning processing:', error);

    // Re-lancer l'erreur pour déclencher les retry
    throw new Error(`Dunning processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Job hebdomadaire pour nettoyer les anciens processus de relance
 * Exécuté tous les dimanches à 2h00 UTC
 */
export const cleanupDunningWeekly = onSchedule({
  schedule: '0 2 * * 0', // Tous les dimanches à 2h00 UTC
  timeZone: 'UTC',
  memory: '512MiB',
  timeoutSeconds: 180
}, async (event) => {
  logger.info('Starting weekly dunning cleanup job', {
    scheduledTime: event.scheduleTime,
    jobName: event.jobName
  });

  try {
    // Nettoyer les anciens processus
    await DunningProcessingJobs.cleanupOldDunningProcesses();

    // Valider la cohérence des données
    await DunningProcessingJobs.validateDunningData();

    logger.info('Weekly dunning cleanup completed successfully');
  } catch (error) {
    logger.error('Error in weekly dunning cleanup:', error);

    throw new Error(`Dunning cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Job mensuel pour générer les rapports de relance
 * Exécuté le 1er de chaque mois à 3h00 UTC
 */
export const generateDunningReportsMonthly = onSchedule({
  schedule: '0 3 1 * *', // Le 1er de chaque mois à 3h00 UTC
  timeZone: 'UTC',
  memory: '1GiB',
  timeoutSeconds: 240
}, async (event) => {
  logger.info('Starting monthly dunning reports generation', {
    scheduledTime: event.scheduleTime,
    jobName: event.jobName
  });

  try {
    // Générer les rapports mensuels
    await DunningProcessingJobs.generateDunningReports();

    logger.info('Monthly dunning reports generated successfully');
  } catch (error) {
    logger.error('Error generating monthly dunning reports:', error);

    throw new Error(`Dunning reports generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Job pour envoyer les notifications de relance en attente
 * Exécuté toutes les 4 heures
 */
export const sendDunningNotifications = onSchedule({
  schedule: '0 */4 * * *', // Toutes les 4 heures
  timeZone: 'UTC',
  memory: '512MiB',
  timeoutSeconds: 120
}, async (event) => {
  logger.info('Starting dunning notifications job', {
    scheduledTime: event.scheduleTime,
    jobName: event.jobName
  });

  try {
    // Envoyer les notifications en attente
    await DunningProcessingJobs.sendDunningNotifications();

    logger.info('Dunning notifications sent successfully');
  } catch (error) {
    logger.error('Error sending dunning notifications:', error);

    // Ne pas relancer l'erreur pour les notifications - ce n'est pas critique
    logger.warn('Dunning notifications failed but continuing execution', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * Job manuel pour traiter immédiatement les relances
 * Peut être déclenché via l'API ou la console Firebase
 */
export const processDunningManual = onSchedule({
  schedule: 'every 24 hours', // Planification par défaut, mais sera déclenché manuellement
  timeZone: 'UTC',
  memory: '1GiB',
  timeoutSeconds: 300
}, async (event) => {
  logger.info('Starting manual dunning processing', {
    scheduledTime: event.scheduleTime,
    jobName: event.jobName
  });

  try {
    // Traiter toutes les relances dues
    await DunningProcessingJobs.processDueDunningActions();

    // Envoyer les notifications
    await DunningProcessingJobs.sendDunningNotifications();

    logger.info('Manual dunning processing completed successfully', {
      processedAt: new Date().toISOString(),
      triggeredBy: 'manual'
    });
  } catch (error) {
    logger.error('Error in manual dunning processing:', error);

    throw new Error(`Manual dunning processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Fonction utilitaire pour obtenir les statistiques des jobs de relance
export const getDunningJobStats = async () => {
  try {
    const stats = {
      lastProcessingRun: null as Date | null,
      lastCleanupRun: null as Date | null,
      lastReportGeneration: null as Date | null,
      totalProcessesProcessed: 0,
      totalNotificationsSent: 0,
      errors: [] as string[]
    };

    // TODO: Implémenter la récupération des statistiques depuis Firestore
    // Ces données pourraient être stockées dans une collection dédiée aux logs des jobs

    return stats;
  } catch (error) {
    logger.error('Error getting dunning job stats:', error);
    throw error;
  }
};

// Export des fonctions pour les tests
export const dunningJobs = {
  processDueDunningActions: DunningProcessingJobs.processDueDunningActions,
  cleanupOldDunningProcesses: DunningProcessingJobs.cleanupOldDunningProcesses,
  generateDunningReports: DunningProcessingJobs.generateDunningReports,
  sendDunningNotifications: DunningProcessingJobs.sendDunningNotifications,
  validateDunningData: DunningProcessingJobs.validateDunningData
};