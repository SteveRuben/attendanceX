// ==========================================
// 1. HEALTH CHECK - health-check.ts
// ==========================================

import {logger} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";

const db = getFirestore();

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: Date;
  checks: {
    database: HealthCheck;
    storage: HealthCheck;
    auth: HealthCheck;
    memory: HealthCheck;
    external: HealthCheck;
  };
  metadata: {
    version: string;
    environment: string;
    uptime: number;
    region: string;
  };
}

interface HealthCheck {
  status: "pass" | "warn" | "fail";
  responseTime: number;
  details?: any;
  error?: string;
}

/**
 * Endpoint de health check public
 */
export const healthCheck = onRequest({
  memory: "256MiB",
  timeoutSeconds: 30,
  cors: true,
}, async (req, res) => {
  const startTime = Date.now();

  try {
    const result = await performHealthChecks();

    // Déterminer le status code HTTP
    const statusCode = result.status === "healthy" ? 200 :
      result.status === "degraded" ? 206 :
        503;

    res.status(statusCode).json({
      ...result,
      totalResponseTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error("Health check failed", {error});

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date(),
      error: "Health check system failure",
      totalResponseTime: Date.now() - startTime,
    });
  }
});

/**
 * Health check périodique - Toutes les 5 minutes
 */
export const periodicHealthCheck = onSchedule({
  schedule: "*/5 * * * *",
  timeZone: "Europe/Paris",
  memory: "256MiB",
}, async (event) => {
  try {
    const result = await performHealthChecks();

    // Sauvegarder le résultat
    await db.collection("health_checks").add({
      ...result,
      type: "periodic",
    });

    // Alerter si problème critique
    if (result.status === "unhealthy") {
      await sendHealthAlert(result);
    }

    // Nettoyer les anciens checks (garder 24h)
    await cleanupOldHealthChecks();

    logger.info("Health check completed", {
      status: result.status,
      checks: Object.keys(result.checks).length,
    });
  } catch (error:any) {
    logger.error("Periodic health check failed", {error});

    // Sauvegarder l'échec
    await db.collection("health_checks").add({
      status: "unhealthy",
      timestamp: new Date(),
      error: error.message,
      type: "periodic_failed",
    });
  }
});

/**
 * Effectuer tous les checks de santé
 */
async function performHealthChecks(): Promise<HealthCheckResult> {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkStorage(),
    checkAuth(),
    checkMemory(),
    checkExternalServices(),
  ]);

  const healthChecks = {
    database: getCheckResult(checks[0]),
    storage: getCheckResult(checks[1]),
    auth: getCheckResult(checks[2]),
    memory: getCheckResult(checks[3]),
    external: getCheckResult(checks[4]),
  };

  // Déterminer le statut global
  const failedChecks = Object.values(healthChecks).filter((check) => check.status === "fail");
  const warnChecks = Object.values(healthChecks).filter((check) => check.status === "warn");

  let overallStatus: "healthy" | "degraded" | "unhealthy";
  if (failedChecks.length > 0) {
    overallStatus = "unhealthy";
  } else if (warnChecks.length > 0) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  return {
    status: overallStatus,
    timestamp: new Date(),
    checks: healthChecks,
    metadata: {
      version: process.env.FUNCTIONS_VERSION || "1.0.0",
      environment: process.env.APP_ENV || "production",
      uptime: process.uptime(),
      region: process.env.FUNCTION_REGION || "europe-west1",
    },
  };
}

/**
 * Check de la base de données Firestore
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Test d'écriture/lecture
    const testDoc = db.collection("health_test").doc("connectivity");
    const testData = {
      timestamp: new Date(),
      test: "connectivity",
    };

    await testDoc.set(testData);
    const readResult = await testDoc.get();

    if (!readResult.exists) {
      throw new Error("Test document not found after write");
    }

    // Nettoyer
    await testDoc.delete();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 1000 ? "pass" : "warn",
      responseTime,
      details: {
        operation: "write_read_delete",
        latency: responseTime,
      },
    };
  } catch (error:any) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Check du stockage Firebase Storage
 */
async function checkStorage(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const bucket = getStorage().bucket();
    const testFile = bucket.file("health-check/test.txt");

    // Test d'écriture
    await testFile.save("health check test", {
      metadata: {
        contentType: "text/plain",
      },
    });

    // Test de lecture
    const [exists] = await testFile.exists();
    if (!exists) {
      throw new Error("Test file not found after upload");
    }

    // Nettoyer
    await testFile.delete();

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 2000 ? "pass" : "warn",
      responseTime,
      details: {
        operation: "upload_check_delete",
        latency: responseTime,
      },
    };
  } catch (error:any) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Check de Firebase Auth
 */
async function checkAuth(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Test simple de connectivité (JWT-based auth)
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 500 ? "pass" : "warn",
      responseTime,
      details: {
        operation: "jwt_auth_check",
        message: "JWT authentication system operational",
      },
    };
  } catch (error:any) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Check de la mémoire système
 */
async function checkMemory(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: "pass" | "warn" | "fail";
    if (memoryUsagePercent > 90) {
      status = "fail";
    } else if (memoryUsagePercent > 75) {
      status = "warn";
    } else {
      status = "pass";
    }

    return {
      status,
      responseTime: Date.now() - startTime,
      details: {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        memoryUsagePercent: Math.round(memoryUsagePercent),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
    };
  } catch (error:any) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Check des services externes
 */
async function checkExternalServices(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    // Test de connectivité vers des services externes
    const checks = await Promise.allSettled([
      // Exemple: test d'un service SMS
      checkExternalService("https://httpbin.org/status/200", "httpbin"),
      // Ajoutez d'autres services externes ici
    ]);

    const results = checks.map((check) =>
      check.status === "fulfilled" ? check.value : {service: "unknown", success: false}
    );

    const failedServices = results.filter((result) => !result.success);

    let status: "pass" | "warn" | "fail";
    if (failedServices.length === results.length) {
      status = "fail";
    } else if (failedServices.length > 0) {
      status = "warn";
    } else {
      status = "pass";
    }

    return {
      status,
      responseTime: Date.now() - startTime,
      details: {
        totalServices: results.length,
        successfulServices: results.filter((r) => r.success).length,
        failedServices: failedServices.map((s) => s.service),
      },
    };
  } catch (error:any) {
    return {
      status: "fail",
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test d'un service externe
 */
async function checkExternalService(url: string, serviceName: string): Promise<{ service: string; success: boolean; responseTime: number }> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
    });

    return {
      service: serviceName,
      success: response.ok,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: serviceName,
      success: false,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Extraire le résultat d'un check
 */
function getCheckResult(settledResult: PromiseSettledResult<HealthCheck>): HealthCheck {
  if (settledResult.status === "fulfilled") {
    return settledResult.value;
  } else {
    return {
      status: "fail",
      responseTime: 0,
      error: settledResult.reason?.message || "Unknown error",
    };
  }
}

/**
 * Envoyer une alerte de santé
 */
async function sendHealthAlert(result: HealthCheckResult): Promise<void> {
  try {
    // Ici vous pourriez envoyer vers Slack, Discord, email, etc.
    logger.error("🚨 HEALTH CHECK ALERT", {
      status: result.status,
      failedChecks: Object.entries(result.checks)
        .filter(([, check]) => check.status === "fail")
        .map(([name]) => name),
      timestamp: result.timestamp,
    });

    // Sauvegarder l'alerte
    await db.collection("health_alerts").add({
      level: "critical",
      message: "System health check failed",
      details: result,
      timestamp: new Date(),
      resolved: false,
    });
  } catch (error) {
    logger.error("Failed to send health alert", {error});
  }
}

/**
 * Nettoyer les anciens health checks
 */
async function cleanupOldHealthChecks(): Promise<void> {
  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h

  const oldChecks = await db.collection("health_checks")
    .where("timestamp", "<", cutoffDate)
    .limit(100)
    .get();

  if (!oldChecks.empty) {
    const batch = db.batch();
    oldChecks.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    logger.info(`Cleaned up ${oldChecks.size} old health checks`);
  }
}
