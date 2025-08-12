// backend/functions/src/services/monitoring.service.ts - Service de monitoring et alertes

import { getFirestore } from "firebase-admin/firestore";

export interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  responseTime: number;
  queueSize: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'cpu_high' | 'memory_high' | 'error_rate_high' | 'response_time_high' | 'queue_full';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  details?: any;
}

export class MonitoringService {
  private readonly db = getFirestore();
  private metrics: SystemMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();

  // Seuils d'alerte par défaut
  private readonly thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    errorRate: { warning: 5, critical: 10 }, // pourcentage
    responseTime: { warning: 1000, critical: 3000 }, // millisecondes
    queueSize: { warning: 100, critical: 500 }
  };

  /**
   * Collecter les métriques système
   */
  async collectMetrics(): Promise<SystemMetrics> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpuUsage: await this.getCPUUsage(),
        memoryUsage: await this.getMemoryUsage(),
        activeConnections: await this.getActiveConnections(),
        requestsPerMinute: await this.getRequestsPerMinute(),
        errorRate: await this.getErrorRate(),
        responseTime: await this.getAverageResponseTime(),
        queueSize: await this.getQueueSize()
      };

      // Stocker les métriques
      this.metrics.push(metrics);
      
      // Garder seulement les 1000 dernières métriques en mémoire
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Sauvegarder en base de données
      await this.saveMetrics(metrics);

      // Vérifier les seuils d'alerte
      await this.checkAlertThresholds(metrics);

      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw new Error('Failed to collect system metrics');
    }
  }

  /**
   * Vérifier les seuils d'alerte
   */
  private async checkAlertThresholds(metrics: SystemMetrics): Promise<void> {
    // Vérifier CPU
    if (metrics.cpuUsage > this.thresholds.cpu.critical) {
      await this.createAlert('cpu_high', 'critical', 
        `CPU usage critical: ${metrics.cpuUsage}%`, 
        metrics.cpuUsage, this.thresholds.cpu.critical);
    } else if (metrics.cpuUsage > this.thresholds.cpu.warning) {
      await this.createAlert('cpu_high', 'medium', 
        `CPU usage high: ${metrics.cpuUsage}%`, 
        metrics.cpuUsage, this.thresholds.cpu.warning);
    }

    // Vérifier mémoire
    if (metrics.memoryUsage > this.thresholds.memory.critical) {
      await this.createAlert('memory_high', 'critical', 
        `Memory usage critical: ${metrics.memoryUsage}%`, 
        metrics.memoryUsage, this.thresholds.memory.critical);
    } else if (metrics.memoryUsage > this.thresholds.memory.warning) {
      await this.createAlert('memory_high', 'medium', 
        `Memory usage high: ${metrics.memoryUsage}%`, 
        metrics.memoryUsage, this.thresholds.memory.warning);
    }

    // Vérifier taux d'erreur
    if (metrics.errorRate > this.thresholds.errorRate.critical) {
      await this.createAlert('error_rate_high', 'critical', 
        `Error rate critical: ${metrics.errorRate}%`, 
        metrics.errorRate, this.thresholds.errorRate.critical);
    } else if (metrics.errorRate > this.thresholds.errorRate.warning) {
      await this.createAlert('error_rate_high', 'high', 
        `Error rate high: ${metrics.errorRate}%`, 
        metrics.errorRate, this.thresholds.errorRate.warning);
    }

    // Vérifier temps de réponse
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      await this.createAlert('response_time_high', 'critical', 
        `Response time critical: ${metrics.responseTime}ms`, 
        metrics.responseTime, this.thresholds.responseTime.critical);
    } else if (metrics.responseTime > this.thresholds.responseTime.warning) {
      await this.createAlert('response_time_high', 'high', 
        `Response time high: ${metrics.responseTime}ms`, 
        metrics.responseTime, this.thresholds.responseTime.warning);
    }

    // Vérifier taille de la queue
    if (metrics.queueSize > this.thresholds.queueSize.critical) {
      await this.createAlert('queue_full', 'critical', 
        `Queue size critical: ${metrics.queueSize}`, 
        metrics.queueSize, this.thresholds.queueSize.critical);
    } else if (metrics.queueSize > this.thresholds.queueSize.warning) {
      await this.createAlert('queue_full', 'medium', 
        `Queue size high: ${metrics.queueSize}`, 
        metrics.queueSize, this.thresholds.queueSize.warning);
    }
  }

  /**
   * Créer une alerte
   */
  private async createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): Promise<void> {
    // Vérifier si une alerte similaire existe déjà
    const existingAlert = this.alerts.find(alert => 
      alert.type === type && !alert.resolved
    );

    if (existingAlert) {
      // Mettre à jour l'alerte existante
      existingAlert.value = value;
      existingAlert.timestamp = new Date();
      existingAlert.severity = severity;
      await this.updateAlert(existingAlert);
    } else {
      // Créer une nouvelle alerte
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        severity,
        message,
        value,
        threshold,
        timestamp: new Date(),
        resolved: false
      };

      this.alerts.push(alert);
      await this.saveAlert(alert);
      await this.notifyAlert(alert);
    }
  }

  /**
   * Effectuer des vérifications de santé
   */
  async performHealthChecks(): Promise<Map<string, HealthCheck>> {
    const services = [
      'database',
      'redis',
      'email_service',
      'qr_service',
      'biometric_service',
      'external_apis'
    ];

    for (const service of services) {
      try {
        const startTime = Date.now();
        const isHealthy = await this.checkServiceHealth(service);
        const responseTime = Date.now() - startTime;

        const healthCheck: HealthCheck = {
          service,
          status: isHealthy ? 'healthy' : 'unhealthy',
          responseTime,
          lastCheck: new Date(),
          details: await this.getServiceDetails(service)
        };

        this.healthChecks.set(service, healthCheck);

        // Créer une alerte si le service est défaillant
        if (!isHealthy) {
          await this.createServiceAlert(service, healthCheck);
        }
      } catch (error) {
        const healthCheck: HealthCheck = {
          service,
          status: 'unhealthy',
          responseTime: -1,
          lastCheck: new Date(),
          details: { error: error.message }
        };

        this.healthChecks.set(service, healthCheck);
        await this.createServiceAlert(service, healthCheck);
      }
    }

    return this.healthChecks;
  }

  /**
   * Obtenir le statut global du système
   */
  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    version: string;
    metrics: SystemMetrics;
    activeAlerts: number;
    services: HealthCheck[];
  }> {
    const currentMetrics = await this.collectMetrics();
    const healthChecks = await this.performHealthChecks();
    const activeAlerts = this.alerts.filter(alert => !alert.resolved).length;

    // Déterminer le statut global
    const unhealthyServices = Array.from(healthChecks.values())
      .filter(check => check.status === 'unhealthy').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices === 0 && activeAlerts === 0) {
      status = 'healthy';
    } else if (unhealthyServices <= 1 && activeAlerts < 5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      metrics: currentMetrics,
      activeAlerts,
      services: Array.from(healthChecks.values())
    };
  }

  /**
   * Obtenir les métriques historiques
   */
  getHistoricalMetrics(hours: number = 24): SystemMetrics[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp >= cutoffTime);
  }

  /**
   * Résoudre une alerte
   */
  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      await this.updateAlert(alert);
    }
  }

  // Méthodes privées pour collecter les métriques

  private async getCPUUsage(): Promise<number> {
    // Simulation - dans un vrai système, utiliser des outils comme pidusage
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    const used = process.memoryUsage();
    const total = used.heapTotal;
    return (used.heapUsed / total) * 100;
  }

  private async getActiveConnections(): Promise<number> {
    // Simulation - compter les connexions WebSocket actives
    return Math.floor(Math.random() * 1000);
  }

  private async getRequestsPerMinute(): Promise<number> {
    // Simulation - compter les requêtes dans la dernière minute
    return Math.floor(Math.random() * 500);
  }

  private async getErrorRate(): Promise<number> {
    // Simulation - calculer le pourcentage d'erreurs
    return Math.random() * 10;
  }

  private async getAverageResponseTime(): Promise<number> {
    // Simulation - temps de réponse moyen
    return Math.random() * 2000;
  }

  private async getQueueSize(): Promise<number> {
    // Simulation - taille de la queue de traitement
    return Math.floor(Math.random() * 200);
  }

  private async checkServiceHealth(service: string): Promise<boolean> {
    switch (service) {
      case 'database':
        try {
          // Test de connexion à la base de données
          await this.db.collection('health_check').limit(1).get();
          return true;
        } catch (error) {
          return false;
        }
      
      case 'redis':
        // Test de connexion Redis (simulation)
        return Math.random() > 0.1; // 90% de chance d'être en bonne santé
      
      case 'email_service':
        // Test du service email (simulation)
        return Math.random() > 0.05; // 95% de chance d'être en bonne santé
      
      case 'qr_service':
        // Test du service QR (simulation)
        return Math.random() > 0.02; // 98% de chance d'être en bonne santé
      
      case 'biometric_service':
        // Test du service biométrique (simulation)
        return Math.random() > 0.1; // 90% de chance d'être en bonne santé
      
      case 'external_apis':
        // Test des APIs externes (simulation)
        return Math.random() > 0.15; // 85% de chance d'être en bonne santé
      
      default:
        return true;
    }
  }

  private async getServiceDetails(service: string): Promise<any> {
    // Retourner des détails spécifiques au service
    return {
      lastHealthCheck: new Date(),
      version: '1.0.0',
      dependencies: []
    };
  }

  private async createServiceAlert(service: string, healthCheck: HealthCheck): Promise<void> {
    await this.createAlert(
      'error_rate_high', // Type générique pour les services
      healthCheck.status === 'unhealthy' ? 'critical' : 'medium',
      `Service ${service} is ${healthCheck.status}`,
      healthCheck.responseTime,
      1000
    );
  }

  private async saveMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      await this.db.collection('system_metrics').add({
        ...metrics,
        timestamp: metrics.timestamp
      });
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  private async saveAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await this.db.collection('performance_alerts').doc(alert.id).set(alert);
    } catch (error) {
      console.error('Error saving alert:', error);
    }
  }

  private async updateAlert(alert: PerformanceAlert): Promise<void> {
    try {
      const { id, ...updateData } = alert;
      await this.db.collection('performance_alerts').doc(alert.id).update(updateData);
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  }

  private async notifyAlert(alert: PerformanceAlert): Promise<void> {
    // Envoyer des notifications selon la sévérité
    if (alert.severity === 'critical') {
      await this.sendCriticalAlert(alert);
    } else if (alert.severity === 'high') {
      await this.sendHighPriorityAlert(alert);
    }
    
    // Log l'alerte
    console.warn(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  private async sendCriticalAlert(alert: PerformanceAlert): Promise<void> {
    // Envoyer SMS, email, et notification push immédiatement
    // Implémentation dépendante des services de notification
    console.error(`CRITICAL ALERT: ${alert.message}`);
  }

  private async sendHighPriorityAlert(alert: PerformanceAlert): Promise<void> {
    // Envoyer email et notification push
    // Implémentation dépendante des services de notification
    console.warn(`HIGH PRIORITY ALERT: ${alert.message}`);
  }

  /**
   * Démarrer le monitoring automatique
   */
  startMonitoring(intervalMinutes: number = 1): void {
    setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.performHealthChecks();
      } catch (error) {
        console.error('Error in monitoring cycle:', error);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Monitoring started with ${intervalMinutes} minute intervals`);
  }

  /**
   * Nettoyer les anciennes métriques et alertes
   */
  async cleanup(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    try {
      // Nettoyer les métriques anciennes
      const oldMetrics = await this.db
        .collection('system_metrics')
        .where('timestamp', '<', cutoffDate)
        .get();

      const batch = this.db.batch();
      oldMetrics.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Nettoyer les alertes résolues anciennes
      const oldAlerts = await this.db
        .collection('performance_alerts')
        .where('resolved', '==', true)
        .where('resolvedAt', '<', cutoffDate)
        .get();

      const alertBatch = this.db.batch();
      oldAlerts.docs.forEach(doc => {
        alertBatch.delete(doc.ref);
      });

      await alertBatch.commit();

      console.log(`Cleaned up ${oldMetrics.size} old metrics and ${oldAlerts.size} old alerts`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export const monitoringService = new MonitoringService();