// =====================================================================
// ATTENDANCE TRIGGERS - attendanceTriggers.ts
// Gestion des événements de présence avec notifications intelligentes
// Compatible Firebase Functions v2
// =====================================================================

import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions/v2";
import {HttpsError} from "firebase-functions/v2/https";
import {checkRateLimits,
  checkUserAchievements,
  createAuditLog,
  getChangedFields,
  handleLateArrival,
  sendAttendanceConfirmation,
  TriggerLogger,
  updateEventStatistics,
  updateUserAttendanceStats,
  validateTriggerData} from "./trigger.utils";
import { collections, db } from "../config";
import { NotificationService } from "../services";
import { MLService } from "../services/utility/ml.service";
import { AttendanceRecord, AttendanceStatus, NotificationChannel, NotificationPriority, NotificationType } from "../common/types";


const notificationService = new NotificationService();
const mlService = new MLService();

/**
 * Trigger lors de la création d'un enregistrement de présence
 * Gère les confirmations, statistics, achievements et notifications
 */
const onAttendanceCreate = onDocumentCreated({
  document: "attendances/{attendanceId}",
  region: "europe-west1", // Spécifiez votre région
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  const attendanceId = event.params.attendanceId;
  const snap = event.data;

  if (!snap) {
    logger.error("No data in attendance creation event", {attendanceId});
    return;
  }

  try {
    const attendance = snap.data() as AttendanceRecord;
    TriggerLogger.info("AttendanceTrigger", "onCreate", attendanceId, {
      userId: attendance.userId,
      eventId: attendance.eventId,
      status: attendance.status,
    });

    // Validation des données
    const validation = validateTriggerData(attendance, [
      "userId", "eventId", "status", "checkInTime",
    ]);

    if (!validation.isValid) {
      TriggerLogger.error("AttendanceTrigger", "onCreate", attendanceId, validation.errors);
      await createAuditLog("attendance_create_failed", attendanceId, {
        errors: validation.errors,
        data: attendance,
      });
      return;
    }

    // Exécuter les actions en parallèle quand possible
    const tasks = [];

    // 1. Mettre à jour les statistiques de l'événement
    tasks.push(updateEventStatistics(attendance.eventId));

    // 2. Mettre à jour les statistiques utilisateur
    tasks.push(updateUserAttendanceStats(attendance.userId));

    // 3. Envoyer notification de confirmation pour les présents
    if (attendance.status === AttendanceStatus.PRESENT || attendance.status === AttendanceStatus.LATE) {
      const canNotify = await checkRateLimits(attendance.userId, NotificationType.ATTENDANCE_CONFIRMATION);
      if (canNotify) {
        tasks.push(sendAttendanceConfirmation(attendance));
      }
    }

    // 4. Vérifier les achievements et badges
    tasks.push(checkUserAchievements(attendance.userId));

    // 5. Mettre à jour les données ML pour prédictions
    tasks.push(mlService.updateUserBehaviorData(attendance.userId, attendance));

    // 6. Gérer les arrivées tardives
    if (attendance.status === AttendanceStatus.LATE) {
      tasks.push(handleLateArrival(attendance));
    }

    // Exécuter toutes les tâches
    await Promise.allSettled(tasks);

    // 7. Notifier les organisateurs de l'événement
    await notifyEventOrganizers(attendance);

    // 8. Créer l'audit log de succès
    await createAuditLog("attendance_created", attendanceId, {
      userId: attendance.userId,
      eventId: attendance.eventId,
      status: attendance.status,
      method: attendance.method,
    }, attendance.userId);

    TriggerLogger.success("AttendanceTrigger", "onCreate", attendanceId);
  } catch (error) {
    TriggerLogger.error("AttendanceTrigger", "onCreate", attendanceId, error);

    // Log d'erreur pour debugging
    await createAuditLog("attendance_create_error", attendanceId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-lancer l'erreur pour que Firebase Functions la capture
    throw new HttpsError("internal", "Erreur lors de la création de la présence");
  }
});

/**
 * Trigger lors de la mise à jour d'un enregistrement de présence
 * Gère les changements de statut et les recalculs nécessaires
 */
const onAttendanceUpdate = onDocumentUpdated({
  document: "attendances/{attendanceId}",
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  const attendanceId = event.params.attendanceId;
  const change = event.data;

  if (!change) {
    logger.error("No data in attendance update event", {attendanceId});
    return;
  }

  try {
    const beforeData = change.before.data() as AttendanceRecord;
    const afterData = change.after.data() as AttendanceRecord;

    TriggerLogger.info("AttendanceTrigger", "onUpdate", attendanceId, {
      userId: afterData.userId,
      statusChange: `${beforeData.status} → ${afterData.status}`,
    });

    // Obtenir les champs modifiés
    const changedFields = getChangedFields(beforeData, afterData);

    if (changedFields.length === 0) {
      TriggerLogger.info("AttendanceTrigger", "onUpdate", attendanceId, "No significant changes detected");
      return;
    }

    // Détecter les changements significatifs
    const statusChanged = beforeData.status !== afterData.status;
    const timeChanged = beforeData.checkInTime !== afterData.checkInTime;
    const methodChanged = beforeData.method !== afterData.method;

    const tasks = [];

    if (statusChanged) {
      TriggerLogger.info("AttendanceTrigger", "statusChanged", attendanceId, {
        from: beforeData.status,
        to: afterData.status,
      });

      // 1. Mettre à jour les statistiques
      tasks.push(updateEventStatistics(afterData.eventId));
      tasks.push(updateUserAttendanceStats(afterData.userId));

      // 2. Envoyer notification de changement de statut
      tasks.push(notifyStatusChange(beforeData, afterData));

      // 3. Recalculer les métriques ML
      tasks.push(mlService.updateUserBehaviorData(afterData.userId, afterData));

      // 4. Vérifier les nouveaux achievements
      tasks.push(checkUserAchievements(afterData.userId));
    }

    if (timeChanged) {
      // 5. Mettre à jour les métriques de ponctualité
      tasks.push(updatePunctualityMetrics(afterData));
    }

    if (methodChanged) {
      // 6. Analyser les patterns de check-in pour ML
      tasks.push(mlService.analyzeCheckInPatterns(afterData.userId, afterData));
    }

    // Exécuter toutes les tâches
    await Promise.allSettled(tasks);

    // 7. Audit log des modifications
    await createAuditLog("attendance_updated", attendanceId, {
      before: beforeData,
      after: afterData,
      changedFields: changedFields.map((cf) => ({
        field: cf.field,
        oldValue: cf.oldValue,
        newValue: cf.newValue,
      })),
    }, afterData.userId);

    TriggerLogger.success("AttendanceTrigger", "onUpdate", attendanceId);
  } catch (error) {
    TriggerLogger.error("AttendanceTrigger", "onUpdate", attendanceId, error);

    await createAuditLog("attendance_update_error", attendanceId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new HttpsError("internal", "Erreur lors de la mise à jour de la présence");
  }
});

/**
 * Trigger lors de la suppression d'un enregistrement de présence
 * Nettoie les données associées et met à jour les statistiques
 */
const onAttendanceDelete = onDocumentDeleted({
  document: "attendances/{attendanceId}",
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 300,
}, async (event) => {
  const attendanceId = event.params.attendanceId;
  const snap = event.data;

  if (!snap) {
    logger.error("No data in attendance deletion event", {attendanceId});
    return;
  }

  try {
    const attendance = snap.data() as AttendanceRecord;

    TriggerLogger.info("AttendanceTrigger", "onDelete", attendanceId, {
      userId: attendance.userId,
      eventId: attendance.eventId,
      status: attendance.status,
    });

    const tasks = [];

    // 1. Mettre à jour les statistiques de l'événement
    tasks.push(updateEventStatistics(attendance.eventId));

    // 2. Mettre à jour les statistiques utilisateur
    tasks.push(updateUserAttendanceStats(attendance.userId));

    // 3. Mettre à jour les données ML
    tasks.push(mlService.removeUserBehaviorData(attendance.userId, attendance));

    // 4. Notifier les organisateurs si c'était une présence confirmée
    if (attendance.status === AttendanceStatus.PRESENT || attendance.status === AttendanceStatus.LATE) {
      tasks.push(notifyAttendanceDeletion(attendance));
    }

    // Exécuter toutes les tâches
    await Promise.allSettled(tasks);

    // 5. Audit log de suppression
    await createAuditLog("attendance_deleted", attendanceId, {
      userId: attendance.userId,
      eventId: attendance.eventId,
      status: attendance.status,
      checkInTime: attendance.checkInTime,
      deletedAt: new Date(),
    });

    TriggerLogger.success("AttendanceTrigger", "onDelete", attendanceId);
  } catch (error) {
    TriggerLogger.error("AttendanceTrigger", "onDelete", attendanceId, error);

    await createAuditLog("attendance_delete_error", attendanceId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw new HttpsError("internal", "Erreur lors de la suppression de la présence");
  }
});

/**
 * Fonction de nettoyage périodique des anciennes présences
 */
const cleanupOldAttendances = onSchedule({
  schedule: "0 3 * * 0", // Tous les dimanches à 3h du matin
  timeZone: "Europe/Paris",
  region: "europe-west1",
  memory: "1GiB",
  timeoutSeconds: 540,
}, async (event) => {
  try {
    TriggerLogger.info("AttendanceCleanup", "start", "system");

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); // Garder 2 ans

    // Archiver les anciennes présences au lieu de les supprimer
    const oldAttendances = await collections.attendances
      .where("checkInTime", "<", cutoffDate)
      .limit(1000) // Traiter par batches
      .get();

    if (oldAttendances.empty) {
      TriggerLogger.info("AttendanceCleanup", "completed", "system", "No old attendances to archive");
      return;
    }

    const batch = db.batch();
    const archiveBatch = db.batch();

    oldAttendances.docs.forEach((doc) => {
      // Copier vers l'archive
      const archiveRef = collections.attendances_archive.doc(doc.id);
      archiveBatch.set(archiveRef, {
        ...doc.data(),
        archivedAt: new Date(),
      });

      // Supprimer l'original
      batch.delete(doc.ref);
    });

    // Exécuter les batches
    await archiveBatch.commit();
    await batch.commit();

    TriggerLogger.success("AttendanceCleanup", "completed", "system", {
      archivedCount: oldAttendances.size,
    });

    // Log d'audit
    await createAuditLog("attendances_archived", "system", {
      count: oldAttendances.size,
      cutoffDate,
      archivedAt: new Date(),
    });
  } catch (error) {
    TriggerLogger.error("AttendanceCleanup", "error", "system", error);
    throw error;
  }
});

// =====================================================================
// FONCTIONS UTILITAIRES SPÉCIFIQUES AUX PRÉSENCES
// =====================================================================

/**
 * Notifier les organisateurs d'un événement d'une nouvelle présence
 */
async function notifyEventOrganizers(attendance: AttendanceRecord): Promise<void> {
  try {
    const eventDoc = await collections.events.doc(attendance.eventId).get();
    const eventData = eventDoc.data();

    if (!eventData?.organizers || eventData.organizers.length === 0) {
      return;
    }

    const userDoc = await collections.users.doc(attendance.userId).get();
    const userData = userDoc.data();
    const userName = userData ? `${userData.firstName} ${userData.lastName}` : "Un participant";

    // Ne notifier que pour les arrivées importantes ou les retards significatifs
    const shouldNotify =
      attendance.status === AttendanceStatus.PRESENT ||
      (attendance.status === AttendanceStatus.LATE && (attendance.delay || 0) > 10);

    if (!shouldNotify) {return;}

    const message = attendance.status === AttendanceStatus.PRESENT ?
      `${userName} vient d'arriver à "${eventData.title}"` :
      `${userName} est arrivé en retard (${attendance.delay}min) à "${eventData.title}"`;

    for (const organizerId of eventData.organizers) {
      // Vérifier les limites de rate limiting pour éviter le spam
      const canNotify = await checkRateLimits(organizerId, NotificationType.ORGANIZER_UPDATE);

      if (canNotify) {
        await notificationService.sendNotification({
          userId: organizerId,
          type: NotificationType.ORGANIZER_UPDATE,
          title: "Nouvelle arrivée",
          message,
          data: {
            eventId: attendance.eventId,
            eventTitle: eventData.title,
            participantId: attendance.userId,
            participantName: userName,
            status: attendance.status,
            delay: attendance.delay || 0,
          },
          channels: [NotificationChannel.IN_APP], // Notification discrète
          priority: NotificationPriority.LOW,
        });
      }
    }

    TriggerLogger.success("AttendanceUtils", "notifyEventOrganizers", attendance.eventId);
  } catch (error) {
    TriggerLogger.error("AttendanceUtils", "notifyEventOrganizers", attendance.eventId, error);
  }
}

/**
 * Notifier le changement de statut de présence
 */
async function notifyStatusChange(before: AttendanceRecord, after: AttendanceRecord): Promise<void> {
  try {
    const eventDoc = await collections.events.doc(after.eventId).get();
    const eventData = eventDoc.data();

    if (!eventData) {return;}

    const statusMessages: Record<string, string> = {
      [AttendanceStatus.PRESENT]: "Présent",
      [AttendanceStatus.LATE]: "En retard",
      [AttendanceStatus.ABSENT]: "Absent",
      [AttendanceStatus.EXCUSED]: "Excusé",
    };

    const message = `Votre statut pour "${eventData.title}" a été modifié : ${statusMessages[before.status]} → ${statusMessages[after.status]}`;

    await notificationService.sendNotification({
      userId: after.userId,
      type: NotificationType.STATUS_CHANGE,
      title: "Statut de présence modifié",
      message,
      data: {
        eventId: after.eventId,
        eventTitle: eventData.title,
        oldStatus: before.status,
        newStatus: after.status,
        updatedAt: new Date(),
      },
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL,
    });

    TriggerLogger.success("AttendanceUtils", "notifyStatusChange", after.userId);
  } catch (error) {
    TriggerLogger.error("AttendanceUtils", "notifyStatusChange", after.userId, error);
  }
}

/**
 * Notifier la suppression d'une présence
 */
async function notifyAttendanceDeletion(attendance: AttendanceRecord): Promise<void> {
  try {
    const eventDoc = await collections.events.doc(attendance.eventId).get();
    const eventData = eventDoc.data();

    if (!eventData) {return;}

    // Notifier l'utilisateur
    await notificationService.sendNotification({
      userId: attendance.userId,
      type: NotificationType.ATTENDANCE_REMOVED,
      title: "Présence supprimée",
      message: `Votre présence à "${eventData.title}" a été supprimée`,
      data: {
        eventId: attendance.eventId,
        eventTitle: eventData.title,
        originalStatus: attendance.status,
        deletedAt: new Date(),
      },
      channels: [NotificationChannel.IN_APP],
      priority: NotificationPriority.LOW,
    });

    // Notifier les organisateurs
    if (eventData.organizers && eventData.organizers.length > 0) {
      const userDoc = await collections.users.doc(attendance.userId).get();
      const userData = userDoc.data();
      const userName = userData ? `${userData.firstName} ${userData.lastName}` : "Un participant";

      for (const organizerId of eventData.organizers) {
        await notificationService.sendNotification({
          userId: organizerId,
          type: NotificationType.ORGANIZER_UPDATE,
          title: "Présence supprimée",
          message: `La présence de ${userName} à "${eventData.title}" a été supprimée`,
          data: {
            eventId: attendance.eventId,
            eventTitle: eventData.title,
            participantId: attendance.userId,
            participantName: userName,
            originalStatus: attendance.status,
            deletedAt: new Date(),
          },
          channels: [NotificationChannel.IN_APP],
          priority: NotificationPriority.LOW,
        });
      }
    }

    TriggerLogger.success("AttendanceUtils", "notifyAttendanceDeletion", attendance.userId);
  } catch (error) {
    TriggerLogger.error("AttendanceUtils", "notifyAttendanceDeletion", attendance.userId, error);
  }
}

/**
 * Mettre à jour les métriques de ponctualité
 */
async function updatePunctualityMetrics(attendance: AttendanceRecord): Promise<void> {
  try {
    // Calculer les nouvelles métriques de ponctualité pour l'utilisateur
    const userAttendances = await collections.attendances
      .where("userId", "==", attendance.userId)
      .where("status", "in", [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
      .get();

    const attendanceData = userAttendances.docs.map((doc) => doc.data() as AttendanceRecord);

    const totalAttendances = attendanceData.length;
    const onTimeAttendances = attendanceData.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const lateAttendances = attendanceData.filter((a) => a.status === AttendanceStatus.LATE && a.delay);

    const punctualityRate = totalAttendances > 0 ?
      Math.round((onTimeAttendances / totalAttendances) * 100 * 100) / 100 :
      100;

    const averageDelay = lateAttendances.length > 0 ?
      Math.round(lateAttendances.reduce((sum, a) => sum + (a.delay || 0), 0) / lateAttendances.length) :
      0;

    // Mettre à jour les métriques utilisateur
    await collections.users.doc(attendance.userId).update({
      "attendanceStatistics.punctualityRate": punctualityRate,
      "attendanceStatistics.averageDelay": averageDelay,
      "attendanceStatistics.lastPunctualityUpdate": new Date(),
    });

    TriggerLogger.success("AttendanceUtils", "updatePunctualityMetrics", attendance.userId, {
      punctualityRate,
      averageDelay,
    });
  } catch (error) {
    TriggerLogger.error("AttendanceUtils", "updatePunctualityMetrics", attendance.userId, error);
  }
}

// Export des triggers
export {
  onAttendanceCreate,
  onAttendanceUpdate,
  onAttendanceDelete,
  cleanupOldAttendances,
};
