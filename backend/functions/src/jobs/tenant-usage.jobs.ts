/**
 * Jobs pour le suivi d'usage des tenants
 * Recalcule périodiquement l'usage et génère des alertes
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { tenantUsageService } from '../services/tenant/tenant-usage.service';
import { tenantService } from '../services/tenant/tenant.service';
import { collections } from '../config/database';

/**
 * Job quotidien pour recalculer l'usage de tous les tenants
 * Exécuté tous les jours à 2h du matin UTC
 */
export const dailyUsageRecalculation = onSchedule(
  {
    schedule: '0 2 * * *', // Cron: tous les jours à 2h
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting daily usage recalculation');

      // Obtenir tous les tenants actifs
      const tenantsSnapshot = await collections.tenants
        .where('status', 'in', ['active', 'trial'])
        .get();

      const results = {
        processed: 0,
        errors: 0,
        alerts: 0
      };

      // Traiter chaque tenant
      for (const tenantDoc of tenantsSnapshot.docs) {
        try {
          const tenantId = tenantDoc.id;
          
          // Recalculer l'usage
          await tenantUsageService.recalculateUsage(tenantId);
          
          // Vérifier les limites et créer des alertes
          const alerts = await tenantUsageService.checkUsageLimits(tenantId);
          
          results.processed++;
          results.alerts += alerts.length;
          
          if (alerts.length > 0) {
            logger.info(`Created ${alerts.length} alerts for tenant ${tenantId}`);
          }
          
        } catch (error) {
          logger.error(`Error processing tenant ${tenantDoc.id}:`, error);
          results.errors++;
        }
      }

      logger.info('Daily usage recalculation completed', {
        processed: results.processed,
        errors: results.errors,
        alerts: results.alerts
      });

    } catch (error) {
      logger.error('Daily usage recalculation failed', { error });
      throw error;
    }
  }
);

/**
 * Job hebdomadaire pour nettoyer les anciennes métriques d'usage
 * Exécuté tous les dimanches à 3h du matin UTC
 */
export const weeklyUsageCleanup = onSchedule(
  {
    schedule: '0 3 * * 0', // Cron: tous les dimanches à 3h
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 300, // 5 minutes
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting weekly usage cleanup');

      // Supprimer les métriques d'usage de plus de 90 jours
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      
      const oldMetricsQuery = await collections.usage_metrics
        .where('timestamp', '<', cutoffDate)
        .limit(1000) // Traiter par lots pour éviter les timeouts
        .get();

      if (!oldMetricsQuery.empty) {
        const batch = collections.usage_metrics.firestore.batch();
        
        oldMetricsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        logger.info(`Deleted ${oldMetricsQuery.size} old usage metrics`);
      }

      // Supprimer les alertes résolues de plus de 30 jours
      const oldAlertsQuery = await collections.usage_alerts
        .where('isActive', '==', false)
        .where('resolvedAt', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .limit(1000)
        .get();

      if (!oldAlertsQuery.empty) {
        const batch = collections.usage_alerts.firestore.batch();
        
        oldAlertsQuery.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        logger.info(`Deleted ${oldAlertsQuery.size} old usage alerts`);
      }

      logger.info('Weekly usage cleanup completed');

    } catch (error) {
      logger.error('Weekly usage cleanup failed', { error });
      throw error;
    }
  }
);

/**
 * Job pour générer des rapports d'usage mensuels
 * Exécuté le 1er de chaque mois à 4h du matin UTC
 */
export const monthlyUsageReports = onSchedule(
  {
    schedule: '0 4 1 * *', // Cron: le 1er de chaque mois à 4h
    timeZone: 'UTC',
    memory: '1GiB',
    timeoutSeconds: 540, // 9 minutes
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting monthly usage reports generation');

      // Calculer la période du mois précédent
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Obtenir tous les tenants actifs
      const tenantsSnapshot = await collections.tenants
        .where('status', 'in', ['active', 'trial'])
        .get();

      const results = {
        processed: 0,
        errors: 0
      };

      // Générer un rapport pour chaque tenant
      for (const tenantDoc of tenantsSnapshot.docs) {
        try {
          const tenantId = tenantDoc.id;
          
          // Générer le rapport d'usage
          const report = await tenantUsageService.generateUsageReport(
            tenantId,
            lastMonth,
            endOfLastMonth
          );
          
          // Sauvegarder le rapport
          await collections.usage_reports.add({
            ...report,
            generatedAt: new Date(),
            period: 'monthly'
          });
          
          results.processed++;
          
          logger.info(`Generated usage report for tenant ${tenantId}`);
          
        } catch (error) {
          logger.error(`Error generating report for tenant ${tenantDoc.id}:`, error);
          results.errors++;
        }
      }

      logger.info('Monthly usage reports generation completed', {
        processed: results.processed,
        errors: results.errors,
        period: {
          start: lastMonth.toISOString(),
          end: endOfLastMonth.toISOString()
        }
      });

    } catch (error) {
      logger.error('Monthly usage reports generation failed', { error });
      throw error;
    }
  }
);

/**
 * Job pour envoyer des notifications d'alerte d'usage
 * Exécuté toutes les heures
 */
export const hourlyUsageAlerts = onSchedule(
  {
    schedule: '0 * * * *', // Cron: toutes les heures
    timeZone: 'UTC',
    memory: '256MiB',
    timeoutSeconds: 120, // 2 minutes
    region: 'europe-west1'
  },
  async (event) => {
    try {
      logger.info('Starting hourly usage alerts check');

      // Obtenir toutes les alertes actives qui n'ont pas été notifiées récemment
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const alertsQuery = await collections.usage_alerts
        .where('isActive', '==', true)
        .where('alertType', 'in', ['critical', 'exceeded'])
        .get();

      let notificationsSent = 0;

      for (const alertDoc of alertsQuery.docs) {
        try {
          const alert = { id: alertDoc.id, ...alertDoc.data() } as any;
          
          // Vérifier si une notification a déjà été envoyée récemment
          const lastNotification = alert.lastNotificationSent;
          if (lastNotification && lastNotification > oneHourAgo) {
            continue; // Skip si déjà notifié dans la dernière heure
          }

          // Obtenir les détails du tenant
          const tenant = await tenantService.getTenant(alert.tenantId);
          if (!tenant) {
            continue;
          }

          // TODO: Envoyer la notification (email, webhook, etc.)
          // await notificationService.sendUsageAlert(tenant, alert);

          // Marquer comme notifié
          await collections.usage_alerts.doc(alert.id).update({
            lastNotificationSent: new Date()
          });

          notificationsSent++;
          
          logger.info(`Sent usage alert notification for tenant ${alert.tenantId}`, {
            metric: alert.metric,
            alertType: alert.alertType,
            percentage: alert.percentage
          });
          
        } catch (error) {
          logger.error(`Error sending alert notification:`, error);
        }
      }

      logger.info('Hourly usage alerts check completed', {
        alertsChecked: alertsQuery.size,
        notificationsSent
      });

    } catch (error) {
      logger.error('Hourly usage alerts check failed', { error });
      throw error;
    }
  }
);

export default {
  dailyUsageRecalculation,
  weeklyUsageCleanup,
  monthlyUsageReports,
  hourlyUsageAlerts
};