import {logger} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {Timestamp} from "firebase-admin/firestore";
import {db, storage} from "../config";

const COLLECTIONS = {
  SYSTEM_METRICS: "system_metrics",
  PERFORMANCE_LOGS: "performance_logs",
  USER_SESSIONS: "user_sessions",
  EVENTS: "events",
  ATTENDANCES: "attendances",
  REPORTS: "reports",
  ALERTS: "alerts",
};

interface SystemMetrics {
  timestamp: Date;
  performance: {
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
    throughput: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  business: {
    activeUsers: number;
    eventsCreated: number;
    attendanceMarked: number;
    reportsGenerated: number;
  };
  costs: {
    firestoreReads: number;
    firestoreWrites: number;
    storageGB: number;
    functionInvocations: number;
    estimatedCost: number;
  };
}

interface AlertRule {
  metric: string;
  operator: "gt" | "lt" | "eq";
  threshold: number;
  severity: "info" | "warning" | "critical";
  cooldown: number; // minutes
}

/**
 * Endpoint de métriques en temps réel
 */
export const metrics = onRequest({
  memory: "512MiB",
  timeoutSeconds: 60,
  cors: true,
}, async (req, res) => {
  try {
    const timeframe = req.query.timeframe as string || "1h";
    const metrics = await collectSystemMetrics(timeframe);

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date(),
      timeframe,
    });
  } catch (error) {
    logger.error("Failed to collect metrics", {error});
    res.status(500).json({
      success: false,
      error: "Failed to collect metrics",
    });
  }
});

/**
 * Collection périodique des métriques - Toutes les minutes
 */
export const collectMetrics = onSchedule({
  schedule: "* * * * *",
  timeZone: "Europe/Paris",
  memory: "256MiB",
}, async (event) => {
  try {
    const metrics = await collectSystemMetrics("1m");

    // Sauvegarder les métriques
    await db.collection("system_metrics").add({
      ...metrics,
      type: "periodic",
    });

    // Vérifier les règles d'alerte
    await checkAlertRules(metrics);

    // Nettoyer les anciennes métriques (garder 7 jours)
    await cleanupOldMetrics();

    logger.debug("Metrics collected", {
      responseTime: metrics.performance.avgResponseTime,
      memoryUsage: metrics.resources.memoryUsage,
      activeUsers: metrics.business.activeUsers,
    });
  } catch (error) {
    logger.error("Failed to collect periodic metrics", {error});
  }
});

/**
 * Nettoie les métriques de plus de 7 jours.
 */
async function cleanupOldMetrics(): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oldMetricsQuery = db.collection(COLLECTIONS.SYSTEM_METRICS)
    .where("timestamp", "<", sevenDaysAgo);

  const snapshot = await oldMetricsQuery.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  logger.info(`Nettoyage de ${snapshot.size} anciennes métriques.`);
}

/**
 * Collecter toutes les métriques système
 */
async function collectSystemMetrics(timeframe: string): Promise<SystemMetrics> {
  const [performance, resources, business, costs] = await Promise.all([
    collectPerformanceMetrics(timeframe),
    collectResourceMetrics(),
    collectBusinessMetrics(timeframe),
    collectCostMetrics(timeframe),
  ]);

  return {
    timestamp: new Date(),
    performance,
    resources,
    business,
    costs,
  };
}

/**
 * Convertit une chaîne de temps (ex: "1h", "10m") en millisecondes.
 */
function parseTimeframe(timeframe: string): number {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1), 10);
  if (isNaN(value)) return 60000; // 1 minute par défaut

  switch (unit) {
  case "m": return value * 60 * 1000;
  case "h": return value * 60 * 60 * 1000;
  case "d": return value * 24 * 60 * 60 * 1000;
  default: return 60000;
  }
}

/**
 * Métriques de performance
 */
async function collectPerformanceMetrics(timeframe: string) {
  const timeframeParsed = parseTimeframe(timeframe);
  const startTime = new Date(Date.now() - timeframeParsed);

  // Récupérer les logs de performance (simulé)
  const performanceLogs = await db.collection("performance_logs")
    .where("timestamp", ">=", startTime)
    .orderBy("timestamp", "desc")
    .limit(1000)
    .get();

  const logs = performanceLogs.docs.map((doc) => doc.data());

  if (logs.length === 0) {
    return {
      avgResponseTime: 0,
      requestCount: 0,
      errorRate: 0,
      throughput: 0,
    };
  }

  const totalResponseTime = logs.reduce((sum, log) => sum + (log.responseTime || 0), 0);
  const errorCount = logs.filter((log) => log.status >= 400).length;
  const timeSpanMinutes = timeframeParsed / (1000 * 60);

  return {
    avgResponseTime: Math.round(totalResponseTime / logs.length),
    requestCount: logs.length,
    errorRate: Math.round((errorCount / logs.length) * 100 * 100) / 100,
    throughput: Math.round((logs.length / timeSpanMinutes) * 100) / 100,
  };
}

async function getStorageUsage(): Promise<number> {
  try {
    const bucket = (storage.bucket());
    let totalBytes = 0;

    const [files] = await bucket.getFiles();
    for (const file of files) {
      totalBytes += Number(file.metadata.size);
    }

    // Conversion des octets en gigaoctets (Go)
    return totalBytes / 1024 / 1024 / 1024;
  } catch (error) {
    logger.error("Failed to get storage usage", {error});
    return 0; // Retourne 0 en cas d'erreur
  }
}

/**
 * La bande passante est incluse dans les coûts et n'est pas facilement isolable
 * via une API simple en temps réel. Il est préférable de la suivre via la console.
 */
async function getBandwidthUsage(): Promise<number> {
  logger.info("Real-time bandwidth usage is not available via a simple API. Refer to Cloud Billing reports.");
  return 0; // Retourne 0 car non disponible
}

/**
 * Métriques de ressources
 */
async function collectResourceMetrics() {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

  // Simuler les métriques CPU et stockage
  const cpuUsage = Math.random() * 50 + 10; // 10-60%
  const storageUsed = await getStorageUsage();
  const bandwidthUsed = await getBandwidthUsage();

  return {
    memoryUsage: Math.round((heapUsedMB / heapTotalMB) * 100 * 100) / 100,
    cpuUsage: Math.round(cpuUsage * 100) / 100,
    storageUsed: Math.round(storageUsed * 100) / 100,
    bandwidthUsed: Math.round(bandwidthUsed * 100) / 100,
  };
}

/**
 * Métriques business
 */
async function collectBusinessMetrics(timeframe: string) {
  const timeframeParsed = parseTimeframe(timeframe);
  const startTime = new Date(Date.now() - timeframeParsed);

  const [activeUsersSnap, eventsSnap, attendancesSnap, reportsSnap] = await Promise.all([
    db.collection("user_sessions")
      .where("lastActivity", ">=", startTime)
      .where("isActive", "==", true)
      .get(),

    db.collection("events")
      .where("createdAt", ">=", startTime)
      .get(),

    db.collection("attendances")
      .where("createdAt", ">=", startTime)
      .get(),

    db.collection("reports")
      .where("createdAt", ">=", startTime)
      .get(),
  ]);

  return {
    activeUsers: activeUsersSnap.size,
    eventsCreated: eventsSnap.size,
    attendanceMarked: attendancesSnap.size,
    reportsGenerated: reportsSnap.size,
  };
}

/**
 * Métriques de coûts
 */
async function collectCostMetrics(timeframe: string) {
  // Ces métriques nécessiteraient une intégration avec Google Cloud Billing API
  // Pour l'instant, simulation basée sur l'utilisation

  const timeframeParsed = parseTimeframe(timeframe);
  const hours = timeframeParsed / (1000 * 60 * 60);

  // Estimation basée sur l'utilisation typique
  const estimatedReads = Math.round(Math.random() * 1000 * hours);
  const estimatedWrites = Math.round(Math.random() * 500 * hours);
  const estimatedStorage = Math.random() * 10; // GB
  const estimatedInvocations = Math.round(Math.random() * 2000 * hours);

  // Tarification Google Cloud (approximative)
  const readCost = (estimatedReads / 100000) * 0.036; // $0.036 per 100k reads
  const writeCost = (estimatedWrites / 100000) * 0.108; // $0.108 per 100k writes
  const storageCost = estimatedStorage * 0.18 / 30; // $0.18 per GB/month
  const functionCost = (estimatedInvocations / 1000000) * 0.40; // $0.40 per 1M invocations

  return {
    firestoreReads: estimatedReads,
    firestoreWrites: estimatedWrites,
    storageGB: Math.round(estimatedStorage * 100) / 100,
    functionInvocations: estimatedInvocations,
    estimatedCost: Math.round((readCost + writeCost + storageCost + functionCost) * 100) / 100,
  };
}

/**
 * Vérifier les règles d'alerte
 */
async function checkAlertRules(metrics: SystemMetrics) {
  const alertRules: AlertRule[] = [
    {metric: "performance.errorRate", operator: "gt", threshold: 5, severity: "warning", cooldown: 15},
    {metric: "performance.avgResponseTime", operator: "gt", threshold: 2000, severity: "warning", cooldown: 10},
    {metric: "resources.memoryUsage", operator: "gt", threshold: 85, severity: "critical", cooldown: 5},
    {metric: "resources.cpuUsage", operator: "gt", threshold: 80, severity: "warning", cooldown: 10},
    {metric: "costs.estimatedCost", operator: "gt", threshold: 10, severity: "info", cooldown: 60},
  ];

  for (const rule of alertRules) {
    await evaluateAlertRule(rule, metrics);
  }
}

/**
 * Récupère une valeur imbriquée d'un objet via un chemin (ex: "a.b.c")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Évaluer une règle d'alerte
 */
async function evaluateAlertRule(rule: AlertRule, metrics: SystemMetrics) {
  const value = getNestedValue(metrics, rule.metric);
  if (value === undefined) return;

  let triggered = false;

  switch (rule.operator) {
  case "gt":
    triggered = value > rule.threshold;
    break;
  case "lt":
    triggered = value < rule.threshold;
    break;
  case "eq":
    triggered = value === rule.threshold;
    break;
  }

  if (triggered) {
    // Vérifier le cooldown
    const lastAlert = await getLastAlert(rule.metric);
    const now = Date.now();
    const cooldownMs = rule.cooldown * 60 * 1000;

    if (!lastAlert || (now - lastAlert.timestamp.toMillis()) > cooldownMs) {
      await sendAlert(rule, value, metrics);
    }
  }
}

/**
 * Récupère la dernière alerte pour une métrique donnée.
 */
async function getLastAlert(metric: string): Promise<{timestamp: Timestamp} | null> {
  const snapshot = await db.collection(COLLECTIONS.ALERTS)
    .where("metric", "==", metric)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as {timestamp: Timestamp};
}
/**
 * Envoyer une alerte
 */
async function sendAlert(rule: AlertRule, value: number, metrics: SystemMetrics) {
  const alert = {
    metric: rule.metric,
    severity: rule.severity,
    threshold: rule.threshold,
    actualValue: value,
    timestamp: new Date(),
    resolved: false,
    context: {
      memoryUsage: metrics.resources.memoryUsage,
      responseTime: metrics.performance.avgResponseTime,
      errorRate: metrics.performance.errorRate,
    },
  };

  await db.collection("alerts").add(alert);

  logger.warn(`🚨 METRIC ALERT: ${rule.metric}`, {
    severity: rule.severity,
    threshold: rule.threshold,
    actualValue: value,
    operator: rule.operator,
  });
}
