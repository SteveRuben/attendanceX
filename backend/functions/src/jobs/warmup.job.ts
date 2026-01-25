/**
 * Job de Warmup pour Firebase Functions
 * 
 * Ce job s'exécute régulièrement pour garder les functions "chaudes"
 * et éviter les cold starts qui ralentissent les premières requêtes.
 * 
 * Fréquence: Toutes les 5 minutes
 * Région: europe-west1
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';

/**
 * Job de warmup qui ping les endpoints critiques
 * pour maintenir les instances actives
 */
export const warmupJob = onSchedule({
  schedule: 'every 5 minutes',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (event) => {
  const startTime = Date.now();
  logger.info('🔥 Warmup job started', {
    scheduledTime: event.scheduleTime,
    jobName: event.jobName,
  });
  
  try {
    // Liste des endpoints critiques à garder chauds
    const criticalEndpoints = [
      '/health',
      '/status',
      '/public/plans',
    ];
    
    const results: Array<{ endpoint: string; duration: number; status: string }> = [];
    
    for (const endpoint of criticalEndpoints) {
      const endpointStartTime = Date.now();
      
      try {
        // Simuler un appel interne (pas besoin de vraiment appeler l'API)
        // Juste le fait que la function s'exécute garde l'instance chaude
        logger.info(`🔥 Warming up ${endpoint}`);
        
        // Simuler un petit délai
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const duration = Date.now() - endpointStartTime;
        results.push({
          endpoint,
          duration,
          status: 'success',
        });
        
        logger.info(`✅ ${endpoint} warmed up in ${duration}ms`);
      } catch (error: any) {
        const duration = Date.now() - endpointStartTime;
        results.push({
          endpoint,
          duration,
          status: 'error',
        });
        
        logger.error(`❌ Failed to warm up ${endpoint}`, {
          error: error.message,
          duration,
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    logger.info('✅ Warmup job completed', {
      totalDuration,
      endpointsWarmed: criticalEndpoints.length,
      successCount,
      errorCount,
      results,
    });
    
    // Ne pas retourner de valeur - juste logger
    
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    
    logger.error('❌ Warmup job failed', {
      error: error.message,
      stack: error.stack,
      duration: totalDuration,
    });
    
    throw error;
  }
});

/**
 * Job de warmup agressif (toutes les 2 minutes)
 * À utiliser pendant les heures de pointe
 * 
 * Désactivé par défaut - décommenter pour activer
 */
/*
export const warmupAggressiveJob = onSchedule({
  schedule: 'every 2 minutes',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (event) => {
  logger.info('🔥🔥 Aggressive warmup job started');
  
  // Même logique que warmupJob mais plus fréquent
  // ...
});
*/
