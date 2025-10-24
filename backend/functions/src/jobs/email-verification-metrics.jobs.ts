import { EmailVerificationCleanupUtils } from "../utils/auth/email-verification-cleanup.utils";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

/**
 * Collecte des métriques de vérification d'email - Toutes les heures
 */
export const collectEmailVerificationMetrics = onSchedule({
  schedule: "0 * * * *", // Every hour at minute 0
  timeZone: "Europe/Paris",
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  logger.info("📊 Starting email verification metrics collection");

  try {
    const metrics = await EmailVerificationCleanupUtils.collectVerificationMetrics();

    logger.info("✅ Email verification metrics collected successfully", {
      totalTokens: metrics.totalTokensGenerated,
      successRate: metrics.successRate,
      avgTimeToVerification: metrics.averageTimeToVerification,
      usersWithTokens: metrics.userVerificationStats.totalUsersWithTokens,
      usersVerified: metrics.userVerificationStats.usersVerified
    });

  } catch (error) {
    logger.error("❌ Email verification metrics collection failed", { error });
    throw error;
  }
});

/**
 * Nettoyage intensif des tokens de vérification - Tous les jours à 3h du matin
 */
export const dailyEmailVerificationCleanup = onSchedule({
  schedule: "0 3 * * *", // Every day at 3 AM
  timeZone: "Europe/Paris",
  region: "europe-west1",
  memory: "1GiB",
  timeoutSeconds: 600,
}, async (event) => {
  logger.info("🧹 Starting daily email verification cleanup");

  try {
    const result = await EmailVerificationCleanupUtils.performFullCleanup({
      cleanExpired: true,
      cleanUsedOlderThanDays: 7, // More aggressive cleanup for daily job
      cleanOrphaned: true
    });

    // Collecter les métriques après le nettoyage
    const metrics = await EmailVerificationCleanupUtils.collectVerificationMetrics();

    logger.info("✅ Daily email verification cleanup completed", {
      cleanup: {
        totalCleaned: result.totalCleaned,
        expiredTokens: result.expiredTokens,
        usedTokens: result.usedTokens,
        orphanedTokens: result.orphanedTokens,
        errors: result.errors.length
      },
      metrics: {
        successRate: metrics.successRate,
        activeTokens: metrics.tokensStillActive,
        avgTimeToVerification: metrics.averageTimeToVerification
      }
    });

    if (result.errors.length > 0) {
      logger.warn("⚠️ Some cleanup operations had errors", { errors: result.errors });
    }

  } catch (error) {
    logger.error("❌ Daily email verification cleanup failed", { error });
    throw error;
  }
});

/**
 * Rapport hebdomadaire des métriques de vérification - Tous les lundis à 8h
 */
export const weeklyEmailVerificationReport = onSchedule({
  schedule: "0 8 * * 1", // Every Monday at 8 AM
  timeZone: "Europe/Paris",
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  logger.info("📈 Generating weekly email verification report");

  try {
    // Calculer les statistiques de la semaine passée
    const weeklyStats = await EmailVerificationCleanupUtils.calculateVerificationSuccessRate(7);
    
    // Récupérer les métriques des 7 derniers jours
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - 7);
    
    const weeklyMetrics = await EmailVerificationCleanupUtils.getVerificationMetrics({
      startDate: weekStartDate,
      endDate: new Date(),
      limit: 50
    });

    // Calculer les tendances
    const avgSuccessRate = weeklyMetrics.length > 0 
      ? weeklyMetrics.reduce((sum, m) => sum + m.successRate, 0) / weeklyMetrics.length 
      : 0;

    const avgTimeToVerification = weeklyMetrics.length > 0
      ? weeklyMetrics.reduce((sum, m) => sum + m.averageTimeToVerification, 0) / weeklyMetrics.length
      : 0;

    logger.info("📊 Weekly email verification report generated", {
      period: {
        start: weeklyStats.periodStart.toISOString(),
        end: weeklyStats.periodEnd.toISOString()
      },
      summary: {
        totalTokensGenerated: weeklyStats.totalTokensGenerated,
        successfulVerifications: weeklyStats.successfulVerifications,
        successRate: weeklyStats.successRate,
        avgTimeToVerification: weeklyStats.averageTimeToVerification
      },
      trends: {
        avgSuccessRateOverWeek: Math.round(avgSuccessRate * 100) / 100,
        avgTimeToVerificationOverWeek: Math.round(avgTimeToVerification * 100) / 100,
        metricsDataPoints: weeklyMetrics.length
      }
    });

    // Si le taux de succès est faible, générer une alerte
    if (weeklyStats.successRate < 70) {
      logger.warn("🚨 Low email verification success rate detected", {
        successRate: weeklyStats.successRate,
        threshold: 70,
        totalTokens: weeklyStats.totalTokensGenerated,
        period: "7 days"
      });
    }

    // Si le temps moyen de vérification est trop long, générer une alerte
    if (weeklyStats.averageTimeToVerification > 60) { // Plus d'1 heure
      logger.warn("🚨 High average time to verification detected", {
        avgTimeToVerification: weeklyStats.averageTimeToVerification,
        threshold: 60,
        unit: "minutes",
        period: "7 days"
      });
    }

  } catch (error) {
    logger.error("❌ Weekly email verification report generation failed", { error });
    throw error;
  }
});