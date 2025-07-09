import {logger} from "firebase-functions";
import {db} from "../config";
import {onSchedule} from "firebase-functions/scheduler";

interface PerformanceTrace {
  functionName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

class PerformanceTracker {
  private traces: Map<string, PerformanceTrace> = new Map();

  /**
   * Démarrer un trace de performance
   */
  startTrace(traceId: string, functionName: string, metadata?: any): void {
    this.traces.set(traceId, {
      functionName,
      startTime: Date.now(),
      success: false,
      metadata,
    });
  }

  /**
   * Terminer un trace de performance
   */
  endTrace(traceId: string, success = true, error?: string): number {
    const trace = this.traces.get(traceId);
    if (!trace) {
      logger.warn("Performance trace not found", {traceId});
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - trace.startTime;

    trace.endTime = endTime;
    trace.duration = duration;
    trace.success = success;
    trace.error = error;

    // Log performance si trop lent
    if (duration > 1000) {
      logger.warn("Slow function detected", {
        functionName: trace.functionName,
        duration,
        traceId,
      });
    }

    // Sauvegarder en base pour métriques
    this.savePerformanceLog(trace);

    this.traces.delete(traceId);
    return duration;
  }

  /**
   * Sauvegarder le log de performance
   */
  private async savePerformanceLog(trace: PerformanceTrace): Promise<void> {
    try {
      await db.collection("performance_logs").add({
        ...trace,
        timestamp: new Date(trace.startTime),
        date: new Date().toISOString().split("T")[0], // Pour les requêtes par jour
      });
    } catch (error) {
      logger.error("Failed to save performance log", {error, trace});
    }
  }

  /**
   * Décorateur pour tracer automatiquement les fonctions
   */
  trace(functionName: string) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function(...args: any[]) {
        const traceId = `${functionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tracker = new PerformanceTracker();

        tracker.startTrace(traceId, functionName, {
          args: args.length,
          timestamp: new Date(),
        });

        try {
          const result = await originalMethod.apply(this, args);
          tracker.endTrace(traceId, true);
          return result;
        } catch (error:any) {
          tracker.endTrace(traceId, false, error.message);
          throw error;
        }
      };

      return descriptor;
    };
  }
}

/**
 * Middleware de performance pour les fonctions HTTP
 */
export function performanceMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const traceId = `http_${req.method}_${Date.now()}`;

  // Logger la requête
  logger.info("HTTP Request", {
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    traceId,
  });

  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;

    // Logger la réponse
    logger.info("HTTP Response", {
      statusCode: res.statusCode,
      duration,
      traceId,
    });

    // Sauvegarder les métriques
    db.collection("performance_logs").add({
      functionName: "http_request",
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date(),
      success: res.statusCode < 400,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
    }).catch((error) => {
      logger.error("Failed to save HTTP performance log", {error});
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Analyseur de performance automatique
 */
export const analyzePerformance = onSchedule({
  schedule: "0 */6 * * *", // Toutes les 6 heures
  timeZone: "Europe/Paris",
  memory: "512MiB",
}, async (event) => {
  try {
    const analysis = await performPerformanceAnalysis();

    await db.collection("performance_analysis").add({
      ...analysis,
      timestamp: new Date(),
    });

    // Créer des alertes si nécessaire
    if (analysis.recommendations.length > 0) {
      await createPerformanceRecommendations(analysis);
    }

    logger.info("Performance analysis completed", {
      totalFunctions: analysis.functions.length,
      recommendations: analysis.recommendations.length,
    });
  } catch (error) {
    logger.error("Performance analysis failed", {error});
  }
});

/**
 * Effectuer une analyse de performance
 */
async function performPerformanceAnalysis() {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Récupérer les logs de performance des dernières 24h
  const performanceLogs = await db.collection("performance_logs")
    .where("timestamp", ">=", last24h)
    .orderBy("timestamp", "desc")
    .limit(10000)
    .get();

  const logs = performanceLogs.docs.map((doc) => doc.data());

  // Analyser par fonction
  const functionStats = new Map();

  logs.forEach((log) => {
    const name = log.functionName;
    if (!functionStats.has(name)) {
      functionStats.set(name, {
        name,
        callCount: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errorCount: 0,
        errorRate: 0,
      });
    }

    const stats = functionStats.get(name);
    stats.callCount++;
    stats.totalDuration += log.duration || 0;
    stats.maxDuration = Math.max(stats.maxDuration, log.duration || 0);
    stats.minDuration = Math.min(stats.minDuration, log.duration || 0);

    if (!log.success) {
      stats.errorCount++;
    }
  });

  // Calculer les moyennes et identifier les problèmes
  const functions = Array.from(functionStats.values()).map((stats) => {
    stats.avgDuration = stats.totalDuration / stats.callCount;
    stats.errorRate = (stats.errorCount / stats.callCount) * 100;
    stats.minDuration = stats.minDuration === Infinity ? 0 : stats.minDuration;
    return stats;
  });

  // Générer des recommandations
  const recommendations: { type: string; function: any; message: string; severity: string; }[] = [];

  functions.forEach((func) => {
    if (func.avgDuration > 2000) {
      recommendations.push({
        type: "slow_function",
        function: func.name,
        message: `Fonction lente détectée: ${func.name} (moyenne: ${Math.round(func.avgDuration)}ms)`,
        severity: func.avgDuration > 5000 ? "high" : "medium",
      });
    }

    if (func.errorRate > 5) {
      recommendations.push({
        type: "high_error_rate",
        function: func.name,
        message: `Taux d'erreur élevé: ${func.name} (${func.errorRate.toFixed(1)}%)`,
        severity: func.errorRate > 15 ? "high" : "medium",
      });
    }
  });

  return {
    period: {start: last24h, end: new Date()},
    totalRequests: logs.length,
    avgResponseTime: logs.reduce((sum, log) => sum + (log.duration || 0), 0) / logs.length,
    errorRate: (logs.filter((log) => !log.success).length / logs.length) * 100,
    functions: functions.sort((a, b) => b.avgDuration - a.avgDuration),
    recommendations,
    topSlowestFunctions: functions
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10),
    topErrorFunctions: functions
      .filter((f) => f.errorRate > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10),
  };
}

// Utilitaires
// @ts-ignore
function parseTimeframe(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([smhd])$/);
  if (!match) return 60 * 60 * 1000; // 1h par défaut

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
  case "s": return value * 1000;
  case "m": return value * 60 * 1000;
  case "h": return value * 60 * 60 * 1000;
  case "d": return value * 24 * 60 * 60 * 1000;
  default: return 60 * 60 * 1000;
  }
}

// @ts-ignore
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// @ts-ignore
async function getLastAlert(metric: string) {
  const alertSnap = await db.collection("alerts")
    .where("metric", "==", metric)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();

  return alertSnap.empty ? null : alertSnap.docs[0].data();
}

// @ts-ignore
async function getStorageUsage(): Promise<number> {
  // Simuler l'usage du stockage (en production, utiliser l'API Google Cloud)
  return Math.random() * 100;
}

// @ts-ignore
async function getBandwidthUsage(): Promise<number> {
  // Simuler l'usage de la bande passante
  return Math.random() * 1000;
}


// @ts-ignore
async function cleanupOldMetrics(): Promise<void> {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours

  const oldMetrics = await db.collection("system_metrics")
    .where("timestamp", "<", cutoffDate)
    .limit(500)
    .get();

  if (!oldMetrics.empty) {
    const batch = db.batch();
    oldMetrics.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function createPerformanceRecommendations(analysis: any): Promise<void> {
  for (const recommendation of analysis.recommendations) {
    await db.collection("performance_recommendations").add({
      ...recommendation,
      timestamp: new Date(),
      status: "open",
    });
  }
}

// Export des instances
export const performanceTracker = new PerformanceTracker();
export {PerformanceTracker};
