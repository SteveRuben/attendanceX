import {
  BatchPushResult,
  PushError,
  PushNotification,
  PushResult,
  PushToken,
} from '../../common/types';
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { collections, db } from "../../config";

/**
 * Service de gestion des notifications push
 * Gère l'envoi de notifications push via Firebase Cloud Messaging (FCM)
 */
/**
 * Service de gestion des notifications push
 * Gère l'envoi de notifications push via Firebase Cloud Messaging (FCM)
 */
export class PushService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    this.messaging = admin.messaging();
    logger.info("PushService initialized");
  }

  /**
   * Envoie une notification push à un token spécifique
   */
  async sendPushNotification(
    token: string | string[],
    notification: PushNotification
  ): Promise<PushResult> {
    try {
      // Valider la notification
      this.validatePushNotification(notification); // ✅ AJOUTÉ

      // Normaliser le token en tableau
      const tokens = Array.isArray(token) ? token : [token];

      if (tokens.length === 0) {
        throw new PushError("No push tokens provided", "no_tokens");
      }

      // Vérifier le nombre de tokens (FCM a une limite)
      if (tokens.length > 500) {
        return await this.sendBatchPushNotification(tokens, notification);
      }

      // Préparer le message FCM
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: this.sanitizeData(notification.data || {}),
        android: {
          notification: {
            icon: notification.icon || "ic_notification",
            color: notification.color || "#3B82F6",
            clickAction: notification.clickAction,
          },
          priority: notification.priority === "high" ? "high" : "normal",
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: notification.badge || 1,
              sound: notification.sound || "default",
            },
          },
          headers: {
            "apns-priority": notification.priority === "high" ? "10" : "5",
          },
        },
        webpush: {
          notification: {
            icon: notification.icon || "/icons/icon-192.png",
            badge: notification.badge?.toString() || "1",
            actions: notification.actions,
          },
          headers: {
            Urgency: notification.priority === "high" ? "high" : "normal",
            TTL: notification.ttl?.toString() || "86400",
          },
        },
      };

      // Envoyer la notification multicast
      const response = await this.messaging.sendMulticast(message);

      // Analyser les résultats
      const failedTokens: { token: string; error: string }[] = [];

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({
              token: tokens[idx],
              error: resp.error?.message || "Unknown error",
            });

            // Gérer les erreurs liées aux tokens invalides
            this.handleTokenError(tokens[idx], resp.error);
          }
        });
      }

      const result: PushResult = {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        messageId: response.responses.find((r) => r.messageId)?.messageId || null,
        failedTokens,
        sentAt: new Date(), // ✅ AJOUTÉ
      };

      logger.info(`Push notification sent: ${response.successCount}/${tokens.length} successful`, {
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      return result;
    } catch (error) {
      logger.error("Error sending push notification", {
        error: error instanceof Error ? error.message : String(error),
        tokenCount: Array.isArray(token) ? token.length : 1,
      });

      if (!(error instanceof PushError)) {
        // ✅ CORRIGÉ - Syntaxe propre
        throw new PushError(
          `Error sending push notification: ${error instanceof Error ? error.message : String(error)}`,
          "fcm_error"
        );
      }

      throw error;
    }
  }

  /**
   * Envoie une notification push à un grand nombre de tokens
   * Divise les tokens en batches pour respecter les limites de FCM
   */
  private async sendBatchPushNotification(
    tokens: string[],
    notification: PushNotification
  ): Promise<BatchPushResult> {
    try {
      const batchSize = 500; // FCM limite à 500 tokens par appel
      const batches = [];
      const startTime = Date.now(); // ✅ AJOUTÉ

      // Diviser les tokens en batches
      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }

      // Initialiser le résultat
      const result: BatchPushResult = {
        success: false,
        totalTokens: tokens.length,
        successCount: 0,
        failureCount: 0,
        batches: batches.length,
        batchResults: [],
        failedTokens: [],
        startedAt: new Date(), // ✅ AJOUTÉ
      };

      // Envoyer les notifications par batch
      for (let i = 0; i < batches.length; i++) {
        try {
          const batchTokens = batches[i];
          const batchResult = await this.sendPushNotification(batchTokens, notification);

          // Mettre à jour les stats globales
          result.successCount += batchResult.successCount;
          result.failureCount += batchResult.failureCount;
          result.failedTokens = [...result.failedTokens, ...batchResult.failedTokens];
          result.batchResults.push(batchResult);
        } catch (error) {
          logger.error(`Error sending batch ${i + 1}/${batches.length}`, {
            error: error instanceof Error ? error.message : String(error),
            batchSize: batches[i].length,
          });

          // Ajouter tous les tokens de ce batch comme échoués
          result.failureCount += batches[i].length;
          result.failedTokens = [
            ...result.failedTokens,
            ...batches[i].map((token) => ({
              token,
              error: error instanceof Error ? error.message : String(error) || "Batch failed",
            })),
          ];
        }
      }

      // Finaliser le résultat ✅ AJOUTÉ
      result.success = result.successCount > 0;
      result.completedAt = new Date();
      result.totalProcessingTime = Date.now() - startTime;

      logger.info(`Batch push notification sent: ${result.successCount}/${result.totalTokens} successful`, {
        successCount: result.successCount,
        failureCount: result.failureCount,
        batches: result.batches,
      });

      return result;
    } catch (error) {
      logger.error("Error sending batch push notification", {
        error: error instanceof Error ? error.message : String(error),
        tokenCount: tokens.length,
      });

      // ✅ CORRIGÉ - Syntaxe propre
      throw new PushError(
        `Error sending batch push notification: ${error instanceof Error ? error.message : String(error)}`,
        "batch_error"
      );
    }
  }

  /**
   *  Validation des notifications
   */
  private validatePushNotification(notification: PushNotification): void {
    if (!notification.title || notification.title.trim().length === 0) {
      throw new PushError("Notification title is required", "invalid_notification");
    }

    if (!notification.body || notification.body.trim().length === 0) {
      throw new PushError("Notification body is required", "invalid_notification");
    }

    if (notification.title.length > 100) {
      throw new PushError("Notification title too long (max 100 chars)", "invalid_notification");
    }

    if (notification.body.length > 500) {
      throw new PushError("Notification body too long (max 500 chars)", "invalid_notification");
    }
  }

  /**
   * Enregistre un nouveau token pour un utilisateur
   */
  async registerPushToken(userId: string, token: string, deviceInfo: {
    platform: "ios" | "android" | "web";
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
  }): Promise<void> {
    try {
      // Valider le token
      if (!token || token.length < 10) {
        throw new PushError("Invalid push token", "invalid_token");
      }

      // Vérifier si le token existe déjà pour cet utilisateur
      const tokensSnapshot = await collections.pushTokens
        .where("userId", "==", userId)
        .where("token", "==", token)
        .limit(1)
        .get();

      if (!tokensSnapshot.empty) {
        // Token existe déjà, mettre à jour lastUsed et deviceInfo
        const tokenDoc = tokensSnapshot.docs[0];
        await tokenDoc.ref.update({
          lastUsed: new Date(),
          deviceInfo: {
            ...tokenDoc.data().deviceInfo,
            ...deviceInfo,
          },
          updatedAt: new Date(),
        });

        logger.debug(`Push token updated for user: ${userId}`, {
          tokenId: tokenDoc.id,
          platform: deviceInfo.platform,
        });

        return;
      }

      // Créer un nouveau token
      const pushToken: PushToken = {
        userId,
        token,
        deviceInfo,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsed: new Date(),
        active: true,
      };

      await collections.pushTokens.add(pushToken);

      logger.info(`New push token registered for user: ${userId}`, {
        platform: deviceInfo.platform,
      });
    } catch (error) {
      logger.error("Error registering push token", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        platform: deviceInfo.platform,
      });

      throw error;
    }
  }

  /**
   * Désactive un token pour un utilisateur
   */
  async unregisterPushToken(userId: string, token: string): Promise<boolean> {
    try {
      // Rechercher le token
      const tokensSnapshot = await collections.pushTokens
        .where("userId", "==", userId)
        .where("token", "==", token)
        .limit(1)
        .get();

      if (tokensSnapshot.empty) {
        logger.warn(`Push token not found for user: ${userId}`);
        return false;
      }

      // Désactiver le token
      await tokensSnapshot.docs[0].ref.update({
        active: false,
        updatedAt: new Date(),
      });

      logger.info(`Push token unregistered for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error("Error unregistering push token", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        token,
      });

      return false;
    }
  }

  /**
   * Désactive tous les tokens d'un utilisateur
   */
  async unregisterAllPushTokens(userId: string): Promise<number> {
    try {
      // Rechercher tous les tokens actifs de l'utilisateur
      const tokensSnapshot = await collections.pushTokens
        .where("userId", "==", userId)
        .where("active", "==", true)
        .get();

      if (tokensSnapshot.empty) {
        return 0;
      }

      // Désactiver tous les tokens
      const batch = db.batch();
      tokensSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          active: false,
          updatedAt: new Date(),
        });
      });

      await batch.commit();

      const count = tokensSnapshot.size;
      logger.info(`${count} push tokens unregistered for user: ${userId}`);

      return count;
    } catch (error) {
      logger.error("Error unregistering all push tokens", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      throw error;
    }
  }

  /**
   * Récupère tous les tokens actifs d'un utilisateur
   */
  async getUserPushTokens(userId: string): Promise<string[]> {
    try {
      // Rechercher tous les tokens actifs de l'utilisateur
      const tokensSnapshot = await collections.pushTokens
        .where("userId", "==", userId)
        .where("active", "==", true)
        .get();

      // Extraire les tokens
      return tokensSnapshot.docs.map((doc) => doc.data().token);
    } catch (error) {
      logger.error("Error getting user push tokens", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      return [];
    }
  }

  /**
   * Gère les erreurs de token
   */
  private handleTokenError(token: string, error: admin.FirebaseError | undefined): void {
    if (!error) { return; }

    // Erreurs indiquant un token invalide
    const invalidTokenErrors = [
      "messaging/invalid-registration-token",
      "messaging/registration-token-not-registered",
    ];

    if (invalidTokenErrors.includes(error.code)) {
      // Marquer le token comme inactif dans la base de données
      this.deactivateToken(token)
        .catch((err) => {
          logger.error("Error deactivating invalid token", {
            error: err.message,
            token,
          });
        });
    }
  }

  /**
   * Désactive un token dans la base de données
   */
  private async deactivateToken(token: string): Promise<void> {
    try {
      const tokensSnapshot = await collections.pushTokens
        .where("token", "==", token)
        .limit(1)
        .get();

      if (!tokensSnapshot.empty) {
        await tokensSnapshot.docs[0].ref.update({
          active: false,
          updatedAt: new Date(),
          error: "Token invalid or not registered",
        });

        logger.debug(`Token deactivated: ${token}`);
      }
    } catch (error) {
      logger.error("Error deactivating token", {
        error: error instanceof Error ? error.message : String(error),
        token,
      });

      throw error;
    }
  }

  /**
   * Sanitize les données pour FCM
   * Les valeurs doivent être des chaînes de caractères
   */
  private sanitizeData(data: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Convertir en chaîne de caractères
      if (typeof value === "object") {
        sanitized[key] = JSON.stringify(value);
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Envoie une notification de test
   */
  async sendTestNotification(userId: string): Promise<PushResult> {
    try {
      // Récupérer les tokens de l'utilisateur
      const tokens = await this.getUserPushTokens(userId);

      if (tokens.length === 0) {
        throw new PushError("No push tokens found for user", "no_tokens");
      }

      // Envoyer une notification de test
      const notification: PushNotification = {
        title: "Test de notification",
        body: "Ceci est une notification de test. Si vous recevez ce message, les notifications push fonctionnent correctement.",
        data: {
          type: "test",
          timestamp: Date.now().toString(),
        },
      };

      return await this.sendPushNotification(tokens, notification);
    } catch (error) {
      logger.error("Error sending test notification", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });

      throw error;
    }
  }

  /**
   *  Vérification du rate limiting
   */
  async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Compter les notifications récentes
      const recentNotifications = await collections.pushMetrics
        .where("userId", "==", userId)
        .where("sentAt", ">", oneHourAgo)
        .where("platform", "==", "push")
        .get();

      return recentNotifications.size < 50; // Max 50 notifications par heure
    } catch (error) {
      logger.warn("Error checking rate limit", { error, userId });
      return true; // En cas d'erreur, on autorise
    }
  }

  /**
   *  Tracking des métriques
   */
  // @ts-ignore
  private async trackNotification(
    userId: string,
    notificationType: string,
    result: PushResult,
    platform: "ios" | "android" | "web" = "android"
  ): Promise<void> {
    try {
      const metrics = {
        userId,
        type: notificationType,
        platform,
        sentAt: new Date(),
        status: result.success ? "sent" : "failed",
        successCount: result.successCount,
        failureCount: result.failureCount,
        processingTime: result.processingTime,
        context: {
          messageId: result.messageId,
          totalTokens: result.successCount + result.failureCount,
        },
      };

      await collections.pushMetrics.add(metrics);
    } catch (error) {
      logger.warn("Failed to track notification metrics", { error });
    }
  }

  /**
   *  Envoi avec template
   */
  async sendTemplatedNotification(
    tokens: string[],
    templateId: string,
    variables: Record<string, string>
  ): Promise<PushResult> {
    try {
      // Récupérer le template
      const templateDoc = await collections.pushTemplates.doc(templateId).get();

      if (!templateDoc.exists) {
        throw new PushError("Template not found", "invalid_parameters");
      }

      const template = templateDoc.data();
      if (!template) {
        throw new PushError("Template data is missing", "invalid_parameters");
      }
      // Rendre le template
      let title = template.titleTemplate ?? "";
      let body = template.bodyTemplate ?? "";

      for (const [key, value] of Object.entries(variables)) {
        title = title.replace(new RegExp(`{{${key}}}`, 'g'), value);
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      // Créer la notification
      const notification: PushNotification = {
        title,
        body,
        ...template.defaultConfig,
      };

      return await this.sendPushNotification(tokens, notification);
    } catch (error) {
      logger.error("Error sending templated notification", {
        error: error instanceof Error ? error.message : String(error),
        templateId,
      });

      throw error;
    }
  }

  /**
   *  Notification programmée
   */
  async schedulePushNotification(
    tokens: string[],
    notification: PushNotification,
    scheduleTime: Date
  ): Promise<string> {
    try {
      // Créer la tâche programmée
      const scheduledNotification = {
        tokens,
        notification,
        scheduleTime,
        status: "pending",
        createdAt: new Date(),
      };

      const doc = await collections.scheduledPushNotifications.add(scheduledNotification);

      logger.info(`Push notification scheduled for ${scheduleTime.toISOString()}`, {
        taskId: doc.id,
        tokenCount: tokens.length,
      });

      return doc.id;
    } catch (error) {
      logger.error("Error scheduling push notification", {
        error: error instanceof Error ? error.message : String(error),
        scheduleTime,
      });

      throw error;
    }
  }

  /**
   *  Statistiques push
   */
  async getPushStats(): Promise<{
    totalTokens: number;
    activeTokens: number;
    byPlatform: Record<string, number>;
    sentToday: number;
    successRate: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Tokens totaux et actifs
      const [allTokens, activeTokens, todayMetrics] = await Promise.all([
        collections.pushTokens.get(),
        collections.pushTokens.where("active", "==", true).get(),
        collections.pushMetrics.where("sentAt", ">=", today).get(),
      ]);

      // Répartition par plateforme
      const byPlatform: Record<string, number> = {};
      activeTokens.forEach(doc => {
        const platform = doc.data().deviceInfo.platform;
        byPlatform[platform] = (byPlatform[platform] || 0) + 1;
      });

      // Calcul du taux de succès
      let totalSent = 0;
      let totalSuccess = 0;
      todayMetrics.forEach(doc => {
        const data = doc.data();
        totalSent += data.successCount + data.failureCount;
        totalSuccess += data.successCount;
      });

      const successRate = totalSent > 0 ? (totalSuccess / totalSent) * 100 : 0;

      return {
        totalTokens: allTokens.size,
        activeTokens: activeTokens.size,
        byPlatform,
        sentToday: totalSent,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      logger.error("Error getting push stats", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   *  Nettoyage des tokens inactifs
   */
  async cleanupInactiveTokens(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Rechercher les tokens inactifs
      const inactiveTokens = await collections.pushTokens
        .where("active", "==", false)
        .where("updatedAt", "<", cutoffDate)
        .get();

      if (inactiveTokens.empty) {
        return 0;
      }

      // Supprimer par batch
      const batch = db.batch();
      inactiveTokens.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      const count = inactiveTokens.size;
      logger.info(`Cleaned up ${count} inactive push tokens older than ${olderThanDays} days`);

      return count;
    } catch (error) {
      logger.error("Error cleaning up inactive tokens", {
        error: error instanceof Error ? error.message : String(error),
        olderThanDays,
      });

      throw error;
    }
  }
}