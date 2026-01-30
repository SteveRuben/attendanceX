/**
 * Scheduled Cleanup for Health Check Documents
 * Removes old health check test documents to prevent accumulation
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { collections } from '../../config/database';
import { logger } from 'firebase-functions';

/**
 * Scheduled function to cleanup old health check documents
 * Runs every hour to remove documents older than 1 hour
 * 
 * This prevents accumulation of test documents if cleanup fails
 * during health checks.
 */
export const cleanupHealthChecks = onSchedule({
  schedule: 'every 1 hours',
  region: 'africa-south1'
}, async () => {
  const startTime = Date.now();
  
  try {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    logger.info('🧹 Starting health check cleanup', {
      cutoffTime: oneHourAgo.toISOString()
    });
    
    const snapshot = await collections.system_health_checks
      .where('timestamp', '<', oneHourAgo)
      .limit(100)
      .get();
    
    if (snapshot.empty) {
      logger.info('✅ No old health check documents to cleanup');
      return;
    }
    
    // Use batch for efficient deletion
    const batch = collections.system_health_checks.firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    
    const duration = Date.now() - startTime;
    logger.info(`✅ Cleaned up ${snapshot.size} old health check documents in ${duration}ms`, {
      count: snapshot.size,
      duration
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('❌ Failed to cleanup health check documents', { 
      error: errorMessage,
      duration
    });
  }
});
