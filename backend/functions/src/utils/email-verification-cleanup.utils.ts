import { logger } from "firebase-functions";
import { collections } from "../config/database";
import { EmailVerificationTokenUtils } from "./email-verification-token.utils";
import { FieldValue } from "firebase-admin/firestore";

export interface CleanupResult {
  expiredTokens: number;
  usedTokens: number;
  orphanedTokens: number;
  totalCleaned: number;
  errors: string[];
}

export interface VerificationMetrics {
  timestamp: Date;
  totalTokensGenerated: number;
  tokensUsedSuccessfully: number;
  tokensExpired: number;
  tokensStillActive: number;
  successRate: number;
  averageTimeToVerification: number; // in minutes
  topFailureReasons: Array<{ reason: string; count: number }>;
  userVerificationStats: {
    totalUsersWithTokens: number;
    usersVerified: number;
    usersWithExpiredTokens: number;
    usersWithActiveTokens: number;
  };
}

export class EmailVerificationCleanupUtils {
  
  /**
   * Nettoie tous les tokens expirés et utilisés anciens
   */
  static async performFullCleanup(options: {
    cleanExpired?: boolean;
    cleanUsedOlderThanDays?: number;
    cleanOrphaned?: boolean;
  } = {}): Promise<CleanupResult> {
    const {
      cleanExpired = true,
      cleanUsedOlderThanDays = 30,
      cleanOrphaned = true
    } = options;

    const result: CleanupResult = {
      expiredTokens: 0,
      usedTokens: 0,
      orphanedTokens: 0,
      totalCleaned: 0,
      errors: []
    };

    try {
      // Nettoyer les tokens expirés
      if (cleanExpired) {
        try {
          result.expiredTokens = await EmailVerificationTokenUtils.cleanupExpiredTokens();
          logger.info(`🧹 Cleaned ${result.expiredTokens} expired verification tokens`);
        } catch (error) {
          const errorMsg = `Failed to clean expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Nettoyer les tokens utilisés anciens
      if (cleanUsedOlderThanDays > 0) {
        try {
          result.usedTokens = await EmailVerificationTokenUtils.cleanupUsedTokens(cleanUsedOlderThanDays);
          logger.info(`🧹 Cleaned ${result.usedTokens} old used verification tokens`);
        } catch (error) {
          const errorMsg = `Failed to clean used tokens: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Nettoyer les tokens orphelins (utilisateurs supprimés)
      if (cleanOrphaned) {
        try {
          result.orphanedTokens = await this.cleanupOrphanedTokens();
          logger.info(`🧹 Cleaned ${result.orphanedTokens} orphaned verification tokens`);
        } catch (error) {
          const errorMsg = `Failed to clean orphaned tokens: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      result.totalCleaned = result.expiredTokens + result.usedTokens + result.orphanedTokens;
      
      logger.info(`✅ Email verification cleanup completed`, {
        totalCleaned: result.totalCleaned,
        expiredTokens: result.expiredTokens,
        usedTokens: result.usedTokens,
        orphanedTokens: result.orphanedTokens,
        errors: result.errors.length
      });

      return result;
    } catch (error) {
      const errorMsg = `Email verification cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
      throw error;
    }
  }

  /**
   * Nettoie les tokens dont les utilisateurs n'existent plus
   */
  static async cleanupOrphanedTokens(): Promise<number> {
    try {
      let totalCleaned = 0;
      let hasMore = true;
      const batchSize = 100;

      while (hasMore) {
        // Récupérer un batch de tokens
        const tokensSnapshot = await collections.email_verification_tokens
          .limit(batchSize)
          .get();

        if (tokensSnapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = collections.email_verification_tokens.firestore.batch();
        let batchCount = 0;

        // Vérifier chaque token
        for (const tokenDoc of tokensSnapshot.docs) {
          const tokenData = tokenDoc.data();
          
          // Vérifier si l'utilisateur existe encore
          const userExists = await collections.users.doc(tokenData.userId).get();
          
          if (!userExists.exists) {
            batch.delete(tokenDoc.ref);
            batchCount++;
          }
        }

        // Exécuter le batch si nécessaire
        if (batchCount > 0) {
          await batch.commit();
          totalCleaned += batchCount;
        }

        // Si on a récupéré moins que la taille du batch, on a fini
        hasMore = tokensSnapshot.size === batchSize;
      }

      return totalCleaned;
    } catch (error) {
      throw new Error(`Failed to cleanup orphaned tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collecte les métriques de vérification d'email
   */
  static async collectVerificationMetrics(): Promise<VerificationMetrics> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Récupérer tous les tokens des dernières 24h pour les métriques
      const recentTokensSnapshot = await collections.email_verification_tokens
        .where("createdAt", ">=", oneDayAgo)
        .get();

      const recentTokens = recentTokensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any));

      // Calculer les métriques de base
      const totalTokensGenerated = recentTokens.length;
      const tokensUsedSuccessfully = recentTokens.filter(token => token.isUsed && token.usedAt).length;
      const tokensExpired = recentTokens.filter(token => !token.isUsed && token.expiresAt.toDate() <= now).length;
      const tokensStillActive = recentTokens.filter(token => !token.isUsed && token.expiresAt.toDate() > now).length;
      
      const successRate = totalTokensGenerated > 0 ? (tokensUsedSuccessfully / totalTokensGenerated) * 100 : 0;

      // Calculer le temps moyen de vérification
      const verifiedTokens = recentTokens.filter(token => token.isUsed && token.usedAt && token.createdAt);
      const averageTimeToVerification = verifiedTokens.length > 0 
        ? verifiedTokens.reduce((sum, token) => {
            const createdAt = token.createdAt.toDate();
            const usedAt = token.usedAt.toDate();
            return sum + (usedAt.getTime() - createdAt.getTime());
          }, 0) / verifiedTokens.length / (1000 * 60) // Convert to minutes
        : 0;

      // Analyser les raisons d'échec (tokens expirés)
      const topFailureReasons = [
        { reason: "Token expired", count: tokensExpired },
        { reason: "Token not used", count: tokensStillActive }
      ].filter(reason => reason.count > 0);

      // Statistiques utilisateur
      const uniqueUserIds = [...new Set(recentTokens.map(token => token.userId))];
      const userVerificationStats = await this.calculateUserVerificationStats(uniqueUserIds);

      const metrics: VerificationMetrics = {
        timestamp: now,
        totalTokensGenerated,
        tokensUsedSuccessfully,
        tokensExpired,
        tokensStillActive,
        successRate: Math.round(successRate * 100) / 100,
        averageTimeToVerification: Math.round(averageTimeToVerification * 100) / 100,
        topFailureReasons,
        userVerificationStats
      };

      // Sauvegarder les métriques
      await this.saveVerificationMetrics(metrics);

      logger.info("📊 Email verification metrics collected", {
        totalTokens: totalTokensGenerated,
        successRate: metrics.successRate,
        avgTimeToVerification: metrics.averageTimeToVerification
      });

      return metrics;
    } catch (error) {
      throw new Error(`Failed to collect verification metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcule les statistiques de vérification des utilisateurs
   */
  private static async calculateUserVerificationStats(userIds: string[]): Promise<VerificationMetrics['userVerificationStats']> {
    const stats = {
      totalUsersWithTokens: userIds.length,
      usersVerified: 0,
      usersWithExpiredTokens: 0,
      usersWithActiveTokens: 0
    };

    if (userIds.length === 0) {
      return stats;
    }

    // Traiter les utilisateurs par batch pour éviter les limites de requête
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      for (const userId of batch) {
        try {
          const userDoc = await collections.users.doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.emailVerified) {
              stats.usersVerified++;
            } else {
              // Vérifier s'il y a des tokens actifs ou expirés
              const activeTokens = await EmailVerificationTokenUtils.getActiveTokensForUser(userId);
              if (activeTokens.length > 0) {
                stats.usersWithActiveTokens++;
              } else {
                stats.usersWithExpiredTokens++;
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to check user verification status for ${userId}`, { error });
        }
      }
    }

    return stats;
  }

  /**
   * Sauvegarde les métriques de vérification
   */
  private static async saveVerificationMetrics(metrics: VerificationMetrics): Promise<void> {
    try {
      await collections.email_verification_metrics.add({
        ...metrics,
        timestamp: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp()
      });
    } catch (error) {
      logger.error("Failed to save verification metrics", { error });
      throw error;
    }
  }

  /**
   * Récupère les métriques de vérification pour une période donnée
   */
  static async getVerificationMetrics(options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<VerificationMetrics[]> {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate = new Date(),
        limit = 100
      } = options;

      let query = collections.email_verification_metrics
        .where("timestamp", ">=", startDate)
        .where("timestamp", "<=", endDate)
        .orderBy("timestamp", "desc");

      if (limit > 0) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as VerificationMetrics[];
    } catch (error) {
      throw new Error(`Failed to get verification metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcule les statistiques de succès de vérification
   */
  static async calculateVerificationSuccessRate(periodDays: number = 7): Promise<{
    totalTokensGenerated: number;
    successfulVerifications: number;
    successRate: number;
    averageTimeToVerification: number;
    periodStart: Date;
    periodEnd: Date;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const tokensSnapshot = await collections.email_verification_tokens
        .where("createdAt", ">=", startDate)
        .where("createdAt", "<=", endDate)
        .get();

      const tokens = tokensSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const totalTokensGenerated = tokens.length;
      const successfulVerifications = tokens.filter(token => token.isUsed && token.usedAt).length;
      const successRate = totalTokensGenerated > 0 ? (successfulVerifications / totalTokensGenerated) * 100 : 0;

      // Calculer le temps moyen de vérification
      const verifiedTokens = tokens.filter(token => token.isUsed && token.usedAt && token.createdAt);
      const averageTimeToVerification = verifiedTokens.length > 0 
        ? verifiedTokens.reduce((sum, token) => {
            const createdAt = token.createdAt.toDate();
            const usedAt = token.usedAt.toDate();
            return sum + (usedAt.getTime() - createdAt.getTime());
          }, 0) / verifiedTokens.length / (1000 * 60) // Convert to minutes
        : 0;

      return {
        totalTokensGenerated,
        successfulVerifications,
        successRate: Math.round(successRate * 100) / 100,
        averageTimeToVerification: Math.round(averageTimeToVerification * 100) / 100,
        periodStart: startDate,
        periodEnd: endDate
      };
    } catch (error) {
      throw new Error(`Failed to calculate verification success rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}