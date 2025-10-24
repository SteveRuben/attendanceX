import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {NotificationService} from "../services/notification";
import {TriggerLogger} from "./trigger.utils";
import { collections } from "../config";
import { Notification, NotificationChannel, NotificationPriority, NotificationStatus, NotificationType } from "../common/types";

// Initialisation Firebase

const db = getFirestore();
const notificationService = new NotificationService();


/**
 * Trigger de création de notification (v2)
 */
const onNotificationCreate = onDocumentCreated("notifications/{notificationId}", async (event) => {
  const notificationId = event.params.notificationId;
  const notification = event.data?.data() as Notification;

  try {
    logger.info(`Notification created: ${notificationId}`, {
      userId: notification.userId,
      type: notification.type,
      priority: notification.priority,
    });

    // Validation des données
    const requiredFields = ["userId", "type", "title", "message", "channels"];
    const missingFields = requiredFields.filter((field) => !(field in notification));

    if (missingFields.length > 0) {
      logger.error("Missing required fields", {missingFields});
      await createAuditLog("notification_create_failed", notificationId, {
        errors: `Missing fields: ${missingFields.join(", ")}`,
        data: notification,
      });
      return;
    }

    // Vérifier les limites de rate limiting
    const canSend = await checkRateLimits(notification.userId, notification.type);
    if (!canSend) {
      logger.warn("Rate limit exceeded", {notificationId});
      await event.data?.ref.update({
        status: NotificationStatus.RATE_LIMITED,
        error: "Rate limit exceeded",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // Vérifier les préférences utilisateur
    const userPreferences = await getUserNotificationPreferences(notification.userId);
    const filteredChannels = filterChannelsByPreferences(notification.channels, notification.type, userPreferences);

    if (filteredChannels.length === 0) {
      logger.info("All channels blocked by user preferences", {notificationId});
      await event.data?.ref.update({
        status: NotificationStatus.BLOCKED,
        reason: "user_preferences",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // Traitement selon la priorité
    if ([NotificationPriority.URGENT, NotificationPriority.HIGH].includes(notification.priority)) {
      await processUrgentNotification(notificationId, notification, filteredChannels);
    } else {
      await scheduleNotificationDelivery(notificationId, notification, filteredChannels);
    }

    // Mise à jour des statistiques
    await updateNotificationStats(notification.type, filteredChannels);

    // Audit log
    await createAuditLog("notification_created", notificationId, {
      userId: notification.userId,
      type: notification.type,
      priority: notification.priority,
      channels: filteredChannels,
    });

    logger.log("Notification processed successfully", {notificationId});
  } catch (error: any) {
    logger.error("Notification processing failed", {
      notificationId,
      error: error.message,
      stack: error.stack,
    });

    await event.data?.ref.update({
      status: NotificationStatus.FAILED,
      error: error.message,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await createAuditLog("notification_create_error", notificationId, {
      error: error.message,
    });
  }
});

/**
 * Trigger de mise à jour de notification (v2)
 */
const onNotificationUpdate = onDocumentUpdated("notifications/{notificationId}", async (event) => {
  const notificationId = event.params.notificationId;
  const beforeData = event.data?.before.data() as Notification;
  const afterData = event.data?.after.data() as Notification;

  try {
    logger.info(`Notification updated: ${notificationId}`, {
      statusChange: beforeData.status !== afterData.status ?
        `${beforeData.status} → ${afterData.status}` : null,
    });

    const statusChanged = beforeData.status !== afterData.status;
    const readStatusChanged = beforeData.read !== afterData.read && afterData.read;
    const deliveryChanged = beforeData.deliveredAt !== afterData.deliveredAt && afterData.deliveredAt;

    if (statusChanged) {
      await handleStatusChange(notificationId, beforeData.status, afterData.status, afterData);
    }

    if (readStatusChanged) {
      await trackNotificationRead(notificationId, afterData);
    }

    if (deliveryChanged && afterData.deliveredAt) {
      const deliveryTime = afterData.deliveredAt.getTime() - afterData.createdAt.getTime();
      await trackDeliveryTime(notificationId, deliveryTime);
    }

    logger.log("Notification update processed", {notificationId});
  } catch (error: any) {
    logger.error("Notification update failed", {
      notificationId,
      error: error.message,
    });
  }
});

/**
 * Nettoyage périodique des anciennes notifications (v2)
 */
const cleanupOldNotifications = onSchedule({
  schedule: "0 2 * * *", // Tous les jours à 2h du matin
  timeZone: "Europe/Paris",
}, async () => {
  try {
    logger.info("Starting old notifications cleanup");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Garder 30 jours

    const query = db.collection("notifications")
      .where("createdAt", "<", cutoffDate)
      .where("status", "in", [
        NotificationStatus.DELIVERED,
        NotificationStatus.READ,
        NotificationStatus.FAILED,
      ])
      .limit(500);

    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info("No old notifications to clean");
      return;
    }

    const batch = db.batch();
    const archiveBatch = db.batch();

    snapshot.docs.forEach((doc) => {
      // Ajouter à l'archive
      const archiveRef = db.collection("notifications_archive").doc(doc.id);
      archiveBatch.set(archiveRef, {
        ...doc.data(),
        archivedAt: FieldValue.serverTimestamp(),
      });

      // Supprimer de la collection principale
      batch.delete(doc.ref);
    });

    await Promise.all([archiveBatch.commit(), batch.commit()]);

    logger.info("Old notifications cleanup completed", {
      count: snapshot.size,
    });

    await cleanupOldNotificationMetrics(cutoffDate);
  } catch (error: any) {
    logger.error("Cleanup failed", {
      error: error.message,
    });
  }
});

/**
 * Traitement des notifications programmées (v2)
 */
const processScheduledNotifications = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "Europe/Paris",
}, async () => {
  try {
    logger.info("Processing scheduled notifications");

    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const query = db.collection("scheduled_notifications")
      .where("scheduledFor", "<=", fiveMinutesFromNow)
      .where("status", "==", "scheduled")
      .limit(100);

    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info("No scheduled notifications to process");
      return;
    }

    const processingTasks = snapshot.docs.map(async (doc) => {
      try {
        const scheduled = doc.data();

        const notificationData = {
          userId: scheduled.userId,
          type: scheduled.type,
          title: scheduled.title,
          message: scheduled.message,
          data: scheduled.data,
          channels: scheduled.channels || ["push", "in_app"],
          priority: scheduled.priority || NotificationPriority.NORMAL,
          createdAt: FieldValue.serverTimestamp(),
          status: NotificationStatus.PENDING,
          scheduledNotificationId: doc.id,
        };

        // Créer la notification
        await db.collection("notifications").add(notificationData);

        // Marquer comme traité
        await doc.ref.update({
          status: "processed",
          processedAt: FieldValue.serverTimestamp(),
        });

        logger.log("Scheduled notification processed", {id: doc.id});
      } catch (error: any) {
        logger.error("Failed to process scheduled notification", {
          id: doc.id,
          error: error.message,
        });

        await doc.ref.update({
          status: "failed",
          error: error.message,
          failedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    await Promise.allSettled(processingTasks);
    logger.info("Scheduled notifications processing completed", {
      count: snapshot.size,
    });
  } catch (error: any) {
    logger.error("Scheduled notifications processing failed", {
      error: error.message,
    });
  }
});

// =====================================================================
// FONCTIONS UTILITAIRES (adaptées pour v2)
// =====================================================================

async function getUserNotificationPreferences(userId: string): Promise<any> {
  const doc = await collections.user_preferences.doc(userId).get();
  return doc.exists ? doc.data()?.notifications || {} : {};
}

function filterChannelsByPreferences(
  channels: NotificationChannel[],
  type: NotificationType,
  preferences: any
): NotificationChannel[] {
  return channels.filter((channel) => {
    // Vérifier les préférences globales du canal
    if (preferences[channel] === false) {return false;}

    // Vérifier les préférences spécifiques au type
    if (preferences.categories?.[type] === false) {return false;}

    return true;
  });
}

async function processUrgentNotification(
  notificationId: string,
  notification: Notification,
  channels: NotificationChannel[]
): Promise<void> {
  const ref = collections.notifications.doc(notificationId);

  await ref.update({
    status: NotificationStatus.PROCESSING,
    processedAt: FieldValue.serverTimestamp(),
  });

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      try {
        // Utiliser la méthode sendNotification du service avec le canal spécifique
        await notificationService.sendNotification({
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          channels: [channel],
          priority: notification.priority,
          sentBy: "system",
        });
        return { channel, success: true };
      } catch (error) {
        return { channel, success: false, error: error instanceof Error ? error.message : String(error) };
      }
    })
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;

  await ref.update({
    status: successful > 0 ? NotificationStatus.DELIVERED : NotificationStatus.FAILED,
    deliveredAt: successful > 0 ? FieldValue.serverTimestamp() : null,
    error: successful > 0 ? null : "All channels failed",
    deliveryStats: {
      attempted: channels.length,
      successful,
      failed: channels.length - successful,
    },
  });
}

async function processNotificationDelivery(
  notificationId: string,
  notification: any,
  channels: NotificationChannel[]
): Promise<void> {
  try {
    // Marquer comme en cours de traitement
    await collections.notifications.doc(notificationId).update({
      status: NotificationStatus.PROCESSING,
      processedAt: new Date(),
    });

    // Envoyer sur tous les canaux
    const sendTasks = channels.map(async (channel) => {
      try {
        await notificationService.sendNotification({
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          channels: [channel],
          priority: notification.priority,
          sentBy: "system",
        });
        return {channel, success: true};
      } catch (error:any) {
        TriggerLogger.error("NotificationUtils", "sendNotification", `${notificationId}-${channel}`, error);
        return {channel, success: false, error: error.message};
      }
    });

    const results = await Promise.allSettled(sendTasks);
    const channelResults = results.map((r) => r.status === "fulfilled" ? r.value : null).filter(Boolean);

    const successful = channelResults.filter((r) => r && r.success).length;
    const failed = channelResults.filter((r) => r && !r.success).length;

    // Mettre à jour le statut final
    if (successful > 0) {
      await collections.notifications.doc(notificationId).update({
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date(),
        deliveryStats: {
          successful,
          failed,
          channels: channels.length,
          results: channelResults,
        },
      });
    } else {
      await collections.notifications.doc(notificationId).update({
        status: NotificationStatus.FAILED,
        failedAt: new Date(),
        error: "All channels failed",
        deliveryStats: {
          successful: 0,
          failed,
          channels: channels.length,
          results: channelResults,
        },
      });
    }

    TriggerLogger.success("NotificationUtils", "processDelivery", notificationId, {
      successful,
      failed,
    });
  } catch (error) {
    TriggerLogger.error("NotificationUtils", "processDelivery", notificationId, error);
    throw error;
  }
}

async function scheduleNotificationDelivery(
  notificationId: string,
  notification: Notification,
  channels: NotificationChannel[]
): Promise<void> {
  const now = new Date();
  const deliveryTime = shouldDeliverNow(notification) ? now : calculateDeliveryTime(notification);

  if (deliveryTime.getTime() === now.getTime()) {
    await processNotificationDelivery(notificationId, notification, channels);
  } else {
    await collections.scheduled_notifications.add({
      notificationId,
      ...notification,
      scheduledFor: deliveryTime,
      status: "scheduled",
      createdAt: FieldValue.serverTimestamp(),
    });

    await collections.notifications.doc(notificationId).update({
      status: NotificationStatus.SCHEDULED,
      scheduledFor: deliveryTime,
    });
  }
}

function shouldDeliverNow(notification: Notification): boolean {
  // Implémentez votre logique de vérification des heures silencieuses
  return true; // Simplifié pour l'exemple
}

function calculateDeliveryTime(notification: Notification): Date {
  // Implémentez votre logique de calcul du temps de livraison optimal
  return new Date(Date.now() + 2 * 60 * 60 * 1000); // Exemple: 2 heures plus tard
}

async function updateNotificationStats(type: NotificationType, channels: NotificationChannel[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const statsRef = collections.notification_stats.doc(today);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(statsRef);
    const data = doc.exists ? doc.data() : {[type]: {total: 0, channels: {}}};

    if (data && !data[type]) {data[type] = {total: 0, channels: {}};}
    // @ts-ignore
    data[type].total += 1;
    channels.forEach((channel) => {
      // @ts-ignore
      data[type].channels[channel] = (data[type].channels[channel] || 0) + 1;
    });

    transaction.set(statsRef, data);
  });
}

/**
 * Déterminer si une notification doit être retentée
 */
function shouldRetryNotification(notification: any): boolean {
  const retryableErrors = [
    "network_error",
    "timeout",
    "service_unavailable",
    "rate_limit_provider",
  ];

  const nonRetryableErrors = [
    "invalid_token",
    "user_not_found",
    "permission_denied",
    "invalid_phone_number",
    "invalid_email",
  ];

  if (notification.error && typeof notification.error === "string") {
    if (nonRetryableErrors.some((error) => notification.error.includes(error))) {
      return false;
    }

    if (retryableErrors.some((error) => notification.error.includes(error))) {
      return true;
    }
  }

  // Par défaut, on essaie de renvoyer sauf si c'est explicitement marqué comme non-retryable
  return notification.retryable !== false;
}


/**
 * Gérer les échecs de notification
 */
async function handleNotificationFailure(notificationId: string, notification: any): Promise<void> {
  try {
    TriggerLogger.warning("NotificationUtils", "handleFailure", notificationId, notification.error);

    // Analyser le type d'échec et décider si on doit réessayer
    const shouldRetry = shouldRetryNotification(notification);

    if (shouldRetry && (notification.retryCount || 0) < 3) {
      // Programmer un nouvel essai
      const retryDelay = Math.pow(2, notification.retryCount || 0) * 60000; // Backoff exponentiel
      const retryTime = new Date(Date.now() + retryDelay);

      await collections.scheduled_notifications.add({
        notificationId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        channels: notification.channels,
        priority: notification.priority,
        scheduledFor: retryTime,
        status: "scheduled",
        isRetry: true,
        originalFailure: notification.error,
        retryCount: (notification.retryCount || 0) + 1,
        createdAt: new Date(),
      });

      // Mettre à jour la notification originale
      await collections.notifications.doc(notificationId).update({
        status: NotificationStatus.RETRY_SCHEDULED,
        retryScheduledFor: retryTime,
        retryCount: (notification.retryCount || 0) + 1,
      });
    } else {
      // Marquer comme définitivement échoué
      await collections.notifications.doc(notificationId).update({
        status: NotificationStatus.PERMANENTLY_FAILED,
        permanentlyFailedAt: new Date(),
      });

      // Alerter les administrateurs pour les notifications critiques
      if (notification.priority === NotificationPriority.URGENT || notification.priority === NotificationPriority.HIGH) {
        await alertAdministrators(notificationId, notification);
      }
    }
  } catch (error) {
    TriggerLogger.error("NotificationUtils", "handleFailure", notificationId, error);
  }
}

/**
 * Alerter les administrateurs pour les notifications critiques échouées
 */
async function alertAdministrators(notificationId: string, notification: any): Promise<void> {
  try {
    // Récupérer les administrateurs
    const admins = await collections.users
      .where("role", "in", ["admin", "super_admin"])
      .where("status", "==", "active")
      .get();

    if (admins.empty) {return;}

    const alertTasks = admins.docs.map((adminDoc) => {
      const adminData = adminDoc.data();
      return notificationService.sendNotification({
        userId: adminData.id,
        type: NotificationType.SYSTEM_ALERT,
        title: "Échec de notification critique",
        message: `Une notification critique (${notification.type}) a échoué définitivement`,
        data: {
          failedNotificationId: notificationId,
          originalUserId: notification.userId,
          notificationType: notification.type,
          error: notification.error,
          priority: notification.priority,
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
      });
    });

    await Promise.allSettled(alertTasks);
    TriggerLogger.success("NotificationUtils", "alertAdministrators", notificationId);
  } catch (error) {
    TriggerLogger.error("NotificationUtils", "alertAdministrators", notificationId, error);
  }
}

async function handleStatusChange(
  notificationId: string,
  oldStatus: NotificationStatus,
  newStatus: NotificationStatus,
  notification: Notification
): Promise<void> {
  // Tracker le changement de statut
  await collections.notification_analytics.add({
    notificationId,
    event: "status_change",
    oldStatus,
    newStatus,
    timestamp: FieldValue.serverTimestamp(),
  });

  // Gérer les cas spécifiques
  if (newStatus === NotificationStatus.FAILED) {
    await handleNotificationFailure(notificationId, notification);
  } else if (newStatus === NotificationStatus.DELIVERED) {
    await trackNotificationDelivery(notificationId, notification);
  } else if (newStatus === NotificationStatus.READ) {
    await trackNotificationRead(notificationId, notification);
  }
}

async function trackNotificationDelivery(notificationId: string, notification: Notification): Promise<void> {
  await collections.notification_analytics.add({
    notificationId,
    event: "delivered",
    userId: notification.userId,
    type: notification.type,
    timestamp: FieldValue.serverTimestamp(),
    // @ts-ignore
    deliveryTime: notification.deliveredAt?.getTime() - notification.createdAt.getTime(),
  });
}

async function trackNotificationRead(notificationId: string, notification: Notification): Promise<void> {
  await collections.notification_analytics.add({
    notificationId,
    event: "read",
    userId: notification.userId,
    timestamp: FieldValue.serverTimestamp(),
    // @ts-ignore
    timeToRead: notification.readAt?.getTime() - (notification.deliveredAt || notification.createdAt).getTime(),
  });
}

async function trackDeliveryTime(notificationId: string, deliveryTime: number): Promise<void> {
  await collections.notification_metrics.doc(notificationId).set({
    deliveryTime,
    timestamp: FieldValue.serverTimestamp(),
  }, {merge: true});
}

async function cleanupOldNotificationMetrics(cutoffDate: Date): Promise<void> {
  const query = collections.notification_metrics
    .where("timestamp", "<", cutoffDate)
    .limit(500);

  const snapshot = await query.get();

  if (snapshot.empty) {return;}

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function checkRateLimits(userId: string, type: NotificationType): Promise<boolean> {
  // Implémentez votre logique de rate limiting
  return true; // Simplifié pour l'exemple
}

async function createAuditLog(
  action: string,
  targetId: string,
  data: Record<string, any>,
  userId?: string
): Promise<void> {
  await collections.audit_logs.add({
    action,
    targetId,
    userId,
    data,
    timestamp: FieldValue.serverTimestamp(),
  });
}

export {
  onNotificationCreate,
  onNotificationUpdate,
  cleanupOldNotifications,
  processScheduledNotifications,
};
