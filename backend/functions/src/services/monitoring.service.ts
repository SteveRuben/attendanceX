/**
 * Service de monitoring pour AttendanceX
 */

import { Request, Response } from 'express';
import { firestore } from 'firebase-admin';
import * as os from 'os';

interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
}

class MonitoringService {
  private metrics: Map<string, MetricValue[]> = new Map();
  private db: firestore.Firestore;
  private startTime: number;

  constructor() {
    this.db = firestore();
    this.startTime = Date.now();
    this.initializeMetrics();
  }

  /**
   * Initialiser les métriques de base
   */
  private initializeMetrics() {
    // Métriques système
    this.recordMetric('attendancex_uptime_seconds', Date.now() - this.startTime);
    this.recordMetric('attendancex_version_info', 1, { version: process.env.APP_VERSION || '1.0.0' });
    
    // Démarrer la collecte périodique
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Enregistrer une métrique
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push({
      value,
      timestamp: Date.now(),
      labels
    });

    // Garder seulement les 1000 dernières valeurs
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  /**
   * Incrémenter un compteur
   */
  incrementCounter(name: string, labels?: Record<string, string>) {
    const current = this.getLatestMetricValue(name, labels) || 0;
    this.recordMetric(name, current + 1, labels);
  }

  /**
   * Enregistrer une durée
   */
  recordDuration(name: string, startTime: number, labels?: Record<string, string>) {
    const duration = (Date.now() - startTime) / 1000;
    this.recordMetric(name, duration, labels);
  }

  /**
   * Obtenir la dernière valeur d'une métrique
   */
  private getLatestMetricValue(name: string, labels?: Record<string, string>): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;

    // Si des labels sont spécifiés, chercher la métrique correspondante
    if (labels) {
      for (let i = metrics.length - 1; i >= 0; i--) {
        const metric = metrics[i];
        if (this.labelsMatch(metric.labels, labels)) {
          return metric.value;
        }
      }
      return null;
    }

    return metrics[metrics.length - 1].value;
  }

  /**
   * Vérifier si les labels correspondent
   */
  private labelsMatch(metricLabels?: Record<string, string>, targetLabels?: Record<string, string>): boolean {
    if (!metricLabels && !targetLabels) return true;
    if (!metricLabels || !targetLabels) return false;

    for (const [key, value] of Object.entries(targetLabels)) {
      if (metricLabels[key] !== value) return false;
    }

    return true;
  }

  /**
   * Collecter les métriques système
   */
  private collectSystemMetrics() {
    // Métriques CPU
    const cpus = os.cpus();
    this.recordMetric('attendancex_cpu_count', cpus.length);

    // Métriques mémoire
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    this.recordMetric('attendancex_memory_total_bytes', totalMemory);
    this.recordMetric('attendancex_memory_used_bytes', usedMemory);
    this.recordMetric('attendancex_memory_usage_percent', (usedMemory / totalMemory) * 100);

    // Métriques processus
    const memUsage = process.memoryUsage();
    this.recordMetric('attendancex_process_memory_rss_bytes', memUsage.rss);
    this.recordMetric('attendancex_process_memory_heap_used_bytes', memUsage.heapUsed);
    this.recordMetric('attendancex_process_memory_heap_total_bytes', memUsage.heapTotal);

    // Uptime
    this.recordMetric('attendancex_uptime_seconds', (Date.now() - this.startTime) / 1000);
  }

  /**
   * Collecter les métriques métier
   */
  async collectBusinessMetrics() {
    try {
      // Utilisateurs actifs aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeUsersSnapshot = await this.db
        .collection('presence_entries')
        .where('clockInTime', '>=', today)
        .get();
      
      const uniqueUsers = new Set(activeUsersSnapshot.docs.map(doc => doc.data().employeeId));
      this.recordMetric('attendancex_daily_active_users', uniqueUsers.size);

      // Pointages aujourd'hui
      this.recordMetric('attendancex_daily_clock_ins', activeUsersSnapshot.size);

      // Demandes de congé en attente
      const pendingLeavesSnapshot = await this.db
        .collection('leave_requests')
        .where('status', '==', 'pending')
        .get();
      
      this.recordMetric('attendancex_pending_leave_requests', pendingLeavesSnapshot.size);

      // Anomalies de présence
      const anomaliesSnapshot = await this.db
        .collection('presence_anomalies')
        .where('date', '>=', today)
        .where('resolved', '==', false)
        .get();
      
      this.recordMetric('attendancex_daily_anomalies', anomaliesSnapshot.size);

      // Taux d'anomalies
      const anomalyRate = activeUsersSnapshot.size > 0 
        ? (anomaliesSnapshot.size / activeUsersSnapshot.size) * 100 
        : 0;
      this.recordMetric('attendancex_presence_anomalies_rate', anomalyRate);

    } catch (error) {
      console.error('Error collecting business metrics:', error);
      this.incrementCounter('attendancex_metric_collection_errors_total', { type: 'business' });
    }
  }

  /**
   * Vérification de santé des services
   */
  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Vérification Firestore
    const firestoreCheck = await this.checkFirestore();
    checks.push(firestoreCheck);

    // Vérification Redis (si utilisé)
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    // Vérification des services externes
    const geolocationCheck = await this.checkGeolocationService();
    checks.push(geolocationCheck);

    return checks;
  }

  /**
   * Vérifier Firestore
   */
  private async checkFirestore(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.db.collection('health_check').doc('test').get();
      const responseTime = Date.now() - startTime;
      
      this.recordMetric('attendancex_firestore_response_time_ms', responseTime);
      
      return {
        service: 'firestore',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: { latency: `${responseTime}ms` }
      };
    } catch (error) {
      this.incrementCounter('attendancex_firestore_errors_total');
      
      return {
        service: 'firestore',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Vérifier Redis
   */
  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simuler une vérification Redis
      // Dans un vrai projet, vous utiliseriez votre client Redis
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'redis',
        status: 'healthy',
        responseTime,
        details: { status: 'connected' }
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Vérifier le service de géolocalisation
   */
  private async checkGeolocationService(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simuler une vérification du service de géolocalisation
      const responseTime = Date.now() - startTime;
      
      this.recordMetric('attendancex_geolocation_service_up', 1);
      
      return {
        service: 'geolocation',
        status: 'healthy',
        responseTime,
        details: { provider: 'internal' }
      };
    } catch (error) {
      this.recordMetric('attendancex_geolocation_service_up', 0);
      
      return {
        service: 'geolocation',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Exporter les métriques au format Prometheus
   */
  exportPrometheusMetrics(): string {
    let output = '';

    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;

      // En-tête de la métrique
      output += `# HELP ${name} AttendanceX metric\n`;
      output += `# TYPE ${name} gauge\n`;

      // Valeurs
      for (const metric of metrics) {
        let line = name;
        
        if (metric.labels && Object.keys(metric.labels).length > 0) {
          const labelPairs = Object.entries(metric.labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');
          line += `{${labelPairs}}`;
        }
        
        line += ` ${metric.value} ${metric.timestamp}\n`;
        output += line;
      }
      
      output += '\n';
    }

    return output;
  }

  /**
   * Endpoint de métriques pour Prometheus
   */
  async metricsEndpoint(req: Request, res: Response) {
    try {
      // Collecter les métriques métier avant l'export
      await this.collectBusinessMetrics();
      
      const metrics = this.exportPrometheusMetrics();
      
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      console.error('Error exporting metrics:', error);
      res.status(500).json({ error: 'Failed to export metrics' });
    }
  }

  /**
   * Endpoint de santé
   */
  async healthEndpoint(req: Request, res: Response) {
    try {
      const checks = await this.performHealthChecks();
      const overallStatus = checks.every(check => check.status === 'healthy') 
        ? 'healthy' 
        : checks.some(check => check.status === 'unhealthy') 
          ? 'unhealthy' 
          : 'degraded';

      const response = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: (Date.now() - this.startTime) / 1000,
        version: process.env.APP_VERSION || '1.0.0',
        checks
      };

      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      console.error('Error performing health checks:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  }

  /**
   * Middleware pour mesurer les requêtes HTTP
   */
  httpMetricsMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = Date.now();
      
      // Incrémenter le compteur de requêtes
      this.incrementCounter('attendancex_http_requests_total', {
        method: req.method,
        route: req.route?.path || req.path
      });

      // Mesurer la durée à la fin de la requête
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000;
        
        this.recordMetric('attendancex_http_request_duration_seconds', duration, {
          method: req.method,
          route: req.route?.path || req.path,
          status: res.statusCode.toString()
        });

        // Compter les erreurs
        if (res.statusCode >= 400) {
          this.incrementCounter('attendancex_http_errors_total', {
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode.toString()
          });
        }
      });

      next();
    };
  }

  /**
   * Enregistrer les métriques métier spécifiques
   */
  recordClockIn(success: boolean, employeeId: string) {
    this.incrementCounter('attendancex_clock_in_total', { 
      status: success ? 'success' : 'failure',
      employee: employeeId 
    });
    
    if (!success) {
      this.incrementCounter('attendancex_clock_in_failures_total');
    }
  }

  recordLeaveRequest(type: string, status: string) {
    this.incrementCounter('attendancex_leave_requests_total', { type, status });
  }

  recordSyncOperation(success: boolean, type: string) {
    this.incrementCounter('attendancex_sync_operations_total', { 
      status: success ? 'success' : 'failure',
      type 
    });
    
    if (!success) {
      this.incrementCounter('attendancex_sync_failures_total', { type });
    }
  }

  recordSecurityEvent(type: string, severity: string) {
    this.incrementCounter('attendancex_security_events_total', { type, severity });
  }

  recordFailedLogin(reason: string) {
    this.incrementCounter('attendancex_failed_logins_total', { reason });
  }

  recordDatabaseQuery(operation: string, duration: number, success: boolean) {
    this.recordMetric('attendancex_db_query_duration_seconds', duration / 1000, { 
      operation,
      status: success ? 'success' : 'failure'
    });
  }

  recordBackupOperation(success: boolean, type: string) {
    this.incrementCounter('attendancex_backup_operations_total', { 
      status: success ? 'success' : 'failure',
      type 
    });
    
    if (success) {
      this.recordMetric('attendancex_last_successful_backup_timestamp', Date.now() / 1000);
    }
  }
}

// Instance singleton
export const monitoringService = new MonitoringService();