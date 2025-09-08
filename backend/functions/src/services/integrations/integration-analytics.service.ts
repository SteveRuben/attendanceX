import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { IntegrationProvider } from '../../shared';

export interface IntegrationMetrics {
  provider: IntegrationProvider;
  totalUsers: number;
  activeUsers: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
  avgSyncDuration: number;
  dataVolume: number;
  lastUpdated: Date;
}

export interface UserAdoptionMetrics {
  totalUsers: number;
  usersWithIntegrations: number;
  adoptionRate: number;
  newUsersThisMonth: number;
  activeUsersThisMonth: number;
  retentionRate: number;
  averageIntegrationsPerUser: number;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  errorRate: number;
  throughput: number;
  uptime: number;
  slowestOperations: Array<{
    operation: string;
    avgDuration: number;
    count: number;
  }>;
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  recipients: string[];
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export class IntegrationAnalyticsService {
  private readonly db = getFirestore();

  /**
   * Collecte les métriques d'utilisation des intégrations
   */
  async collectIntegrationMetrics(): Promise<IntegrationMetrics[]> {
    try {
      const metrics: IntegrationMetrics[] = [];
      const providers = Object.values(IntegrationProvider);

      for (const provider of providers) {
        // Compter les utilisateurs avec cette intégration
        const integrations = await this.db
          .collection('user_integrations')
          .where('provider', '==', provider)
          .get();

        const totalUsers = integrations.size;
        const activeUsers = integrations.docs.filter(doc => 
          doc.data().status === 'connected'
        ).length;

        // Récupérer l'historique de synchronisation
        const syncHistory = await this.db
          .collection('sync_history')
          .where('provider', '==', provider)
          .where('timestamp', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // 30 derniers jours
          .get();

        const totalSyncs = syncHistory.size;
        const successfulSyncs = syncHistory.docs.filter(doc => 
          doc.data().status === 'success'
        ).length;
        const failedSyncs = totalSyncs - successfulSyncs;
        const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0;

        // Calculer la durée moyenne de synchronisation
        const durations = syncHistory.docs
          .map(doc => doc.data().duration)
          .filter(duration => duration != null);
        const avgSyncDuration = durations.length > 0 
          ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
          : 0;

        // Calculer le volume de données
        const dataVolume = syncHistory.docs
          .map(doc => doc.data().recordsProcessed || 0)
          .reduce((sum, records) => sum + records, 0);

        metrics.push({
          provider,
          totalUsers,
          activeUsers,
          totalSyncs,
          successfulSyncs,
          failedSyncs,
          successRate,
          avgSyncDuration,
          dataVolume,
          lastUpdated: new Date()
        });
      }

      // Sauvegarder les métriques
      await this.saveMetrics('integration_metrics', metrics);
      
      return metrics;
    } catch (error) {
      logger.error('Error collecting integration metrics', { error });
      throw error;
    }
  }

  /**
   * Collecte les métriques d'adoption utilisateur
   */
  async collectUserAdoptionMetrics(): Promise<UserAdoptionMetrics> {
    try {
      // Compter tous les utilisateurs
      const allUsers = await this.db.collection('users').get();
      const totalUsers = allUsers.size;

      // Compter les utilisateurs avec des intégrations
      const usersWithIntegrations = await this.db
        .collection('user_integrations')
        .get();
      
      const uniqueUsersWithIntegrations = new Set(
        usersWithIntegrations.docs.map(doc => doc.data().userId)
      ).size;

      const adoptionRate = totalUsers > 0 ? (uniqueUsersWithIntegrations / totalUsers) * 100 : 0;

      // Nouveaux utilisateurs ce mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await this.db
        .collection('users')
        .where('createdAt', '>=', startOfMonth)
        .get();

      // Utilisateurs actifs ce mois (avec au moins une synchronisation)
      const activeUsersThisMonth = await this.db
        .collection('sync_history')
        .where('timestamp', '>=', startOfMonth)
        .get();

      const uniqueActiveUsers = new Set(
        activeUsersThisMonth.docs.map(doc => doc.data().userId)
      ).size;

      // Taux de rétention (utilisateurs actifs / utilisateurs avec intégrations)
      const retentionRate = uniqueUsersWithIntegrations > 0 
        ? (uniqueActiveUsers / uniqueUsersWithIntegrations) * 100 
        : 0;

      // Moyenne d'intégrations par utilisateur
      const averageIntegrationsPerUser = uniqueUsersWithIntegrations > 0 
        ? usersWithIntegrations.size / uniqueUsersWithIntegrations 
        : 0;

      const metrics: UserAdoptionMetrics = {
        totalUsers,
        usersWithIntegrations: uniqueUsersWithIntegrations,
        adoptionRate,
        newUsersThisMonth: newUsersThisMonth.size,
        activeUsersThisMonth: uniqueActiveUsers,
        retentionRate,
        averageIntegrationsPerUser
      };

      await this.saveMetrics('user_adoption_metrics', metrics);
      
      return metrics;
    } catch (error) {
      logger.error('Error collecting user adoption metrics', { error });
      throw error;
    }
  }

  /**
   * Collecte les métriques de performance
   */
  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Récupérer les logs de performance
      const performanceLogs = await this.db
        .collection('performance_logs')
        .where('timestamp', '>=', last24Hours)
        .get();

      const responseTimes = performanceLogs.docs
        .map(doc => doc.data().responseTime)
        .filter(time => time != null);

      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      // Calculer le taux d'erreur
      const totalRequests = performanceLogs.size;
      const errorRequests = performanceLogs.docs.filter(doc => 
        doc.data().status >= 400
      ).length;
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

      // Calculer le débit (requêtes par minute)
      const throughput = totalRequests / (24 * 60); // requêtes par minute sur 24h

      // Calculer l'uptime (basé sur les checks de santé)
      const healthChecks = await this.db
        .collection('health_checks')
        .where('timestamp', '>=', last24Hours)
        .get();

      const successfulChecks = healthChecks.docs.filter(doc => 
        doc.data().status === 'healthy'
      ).length;
      const uptime = healthChecks.size > 0 ? (successfulChecks / healthChecks.size) * 100 : 100;

      // Identifier les opérations les plus lentes
      const operationStats = new Map<string, { totalTime: number; count: number }>();
      
      performanceLogs.docs.forEach(doc => {
        const data = doc.data();
        const operation = data.operation || 'unknown';
        const responseTime = data.responseTime || 0;
        
        if (!operationStats.has(operation)) {
          operationStats.set(operation, { totalTime: 0, count: 0 });
        }
        
        const stats = operationStats.get(operation)!;
        stats.totalTime += responseTime;
        stats.count += 1;
      });

      const slowestOperations = Array.from(operationStats.entries())
        .map(([operation, stats]) => ({
          operation,
          avgDuration: stats.totalTime / stats.count,
          count: stats.count
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10);

      const metrics: PerformanceMetrics = {
        avgResponseTime,
        errorRate,
        throughput,
        uptime,
        slowestOperations
      };

      await this.saveMetrics('performance_metrics', metrics);
      
      return metrics;
    } catch (error) {
      logger.error('Error collecting performance metrics', { error });
      throw error;
    }
  }

  /**
   * Vérifie les alertes et déclenche les notifications si nécessaire
   */
  async checkAlerts(): Promise<void> {
    try {
      const alertConfigs = await this.getAlertConfigs();
      const currentMetrics = await this.getCurrentMetrics();

      for (const alert of alertConfigs) {
        if (!alert.enabled) {continue;}

        // Vérifier si l'alerte est en cooldown
        if (alert.lastTriggered) {
          const cooldownEnd = new Date(alert.lastTriggered.getTime() + alert.cooldownMinutes * 60 * 1000);
          if (new Date() < cooldownEnd) {continue;}
        }

        const shouldTrigger = this.evaluateAlertCondition(alert, currentMetrics);
        
        if (shouldTrigger) {
          await this.triggerAlert(alert, currentMetrics);
        }
      }
    } catch (error) {
      logger.error('Error checking alerts', { error });
    }
  }

  /**
   * Sauvegarde les métriques dans la base de données
   */
  private async saveMetrics(collection: string, metrics: any): Promise<void> {
    await this.db.collection(collection).add({
      ...metrics,
      timestamp: new Date()
    });
  }

  /**
   * Récupère la configuration des alertes
   */
  private async getAlertConfigs(): Promise<AlertConfig[]> {
    const snapshot = await this.db.collection('alert_configs').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertConfig));
  }

  /**
   * Récupère les métriques actuelles
   */
  private async getCurrentMetrics(): Promise<any> {
    const [integrationMetrics, adoptionMetrics, performanceMetrics] = await Promise.all([
      this.getLatestMetrics('integration_metrics'),
      this.getLatestMetrics('user_adoption_metrics'),
      this.getLatestMetrics('performance_metrics')
    ]);

    return {
      integration: integrationMetrics,
      adoption: adoptionMetrics,
      performance: performanceMetrics
    };
  }

  /**
   * Récupère les dernières métriques d'un type donné
   */
  private async getLatestMetrics(collection: string): Promise<any> {
    const snapshot = await this.db
      .collection(collection)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  /**
   * Évalue si une condition d'alerte est remplie
   */
  private evaluateAlertCondition(alert: AlertConfig, metrics: any): boolean {
    try {
      // Exemple de conditions d'alerte
      switch (alert.condition) {
        case 'error_rate_high':
          return metrics.performance?.errorRate > alert.threshold;
        case 'success_rate_low':
          return metrics.integration?.some((m: IntegrationMetrics) => m.successRate < alert.threshold);
        case 'response_time_high':
          return metrics.performance?.avgResponseTime > alert.threshold;
        case 'uptime_low':
          return metrics.performance?.uptime < alert.threshold;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error evaluating alert condition', { alert: alert.id, error });
      return false;
    }
  }

  /**
   * Déclenche une alerte
   */
  private async triggerAlert(alert: AlertConfig, metrics: any): Promise<void> {
    try {
      logger.warn('Alert triggered', { 
        alertId: alert.id, 
        alertName: alert.name,
        condition: alert.condition,
        threshold: alert.threshold
      });

      // Mettre à jour la date de dernière activation
      await this.db.collection('alert_configs').doc(alert.id).update({
        lastTriggered: new Date()
      });

      // Enregistrer l'événement d'alerte
      await this.db.collection('alert_events').add({
        alertId: alert.id,
        alertName: alert.name,
        condition: alert.condition,
        threshold: alert.threshold,
        actualValue: this.getActualValue(alert.condition, metrics),
        timestamp: new Date(),
        recipients: alert.recipients
      });

      // TODO: Envoyer les notifications aux destinataires
      // Cela pourrait être intégré avec le service de notification existant
      
    } catch (error) {
      logger.error('Error triggering alert', { alert: alert.id, error });
    }
  }

  /**
   * Récupère la valeur actuelle pour une condition d'alerte
   */
  private getActualValue(condition: string, metrics: any): number {
    switch (condition) {
      case 'error_rate_high':
        return metrics.performance?.errorRate || 0;
      case 'success_rate_low':
        return Math.min(...(metrics.integration?.map((m: IntegrationMetrics) => m.successRate) || [100]));
      case 'response_time_high':
        return metrics.performance?.avgResponseTime || 0;
      case 'uptime_low':
        return metrics.performance?.uptime || 100;
      default:
        return 0;
    }
  }
}

export const integrationAnalyticsService = new IntegrationAnalyticsService();
 