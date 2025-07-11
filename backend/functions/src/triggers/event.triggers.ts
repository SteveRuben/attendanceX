import {
  onDocumentCreated, 
  onDocumentUpdated, 
  onDocumentDeleted
} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {
  Event,
  EventStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@attendance-x/shared";
import {MLService} from "../services/ml.service";
import {NotificationService} from "../services/notification";
import {
  createAuditLog, 
  generateEventQRCode, 
  getChangedFields, 
  initializeEventStatistics, 
  retryWithBackoff, 
  scheduleEventReminders, 
  TriggerLogger
} from "./trigger.utils";


const db = getFirestore();
const notificationService = new NotificationService();
const mlService = new MLService();



/**
 * Trigger de création d'événement (v2)
 */
const onEventCreate = onDocumentCreated("events/{eventId}", async (event) => {
  const eventId = event.params.eventId;
  const eventData = event.data?.data() as Event;

  try {
    logger.info(`Event created: ${eventId}`, {
      title: eventData.title,
      startTime: eventData.startDateTime,
      type: eventData.type,
    });
    TriggerLogger.info("EventTrigger", "onCreate", eventId, {
      title: eventData.title,
      startTime: eventData.startDateTime,
      type: eventData.type,
      organizers: eventData.coOrganizers?.length || 0,
    });


    // Validation des données
    const requiredFields = ["title", "startTime", "endTime", "organizers", "type"];
    const missingFields = requiredFields.filter((field) => !(field in eventData));

    if (missingFields.length > 0) {
      logger.error("Missing required fields", {missingFields});
      await createAuditLog("event_create_failed", eventId, {
        errors: `Missing fields: ${missingFields.join(", ")}`,
        data: eventData,
      });
      return;
    }

    // Vérifier que la date de début n'est pas dans le passé
    if (new Date(eventData.startDateTime) < new Date()) {
      logger.warn("Event start time is in the past", {eventId});
    }

    // Tâches d'initialisation parallèles
    await Promise.allSettled([
      initializeEventStatistics(eventId),
      generateEventQRCode(eventId),
      scheduleEventReminders(eventId, eventData),
    ]);

    // Tâches séquentielles
    /*  if (eventData.autoInvite && eventData.targetAudience) {
      await createAutoInvitations(eventId, eventData);
    } */

    if (eventData.participants?.length) {
      await addToParticipantCalendars(eventId, eventData);
    }

    await retryWithBackoff(() => mlService.predictEventAttendance(eventId, eventData));
    await notifyEventCreation(eventData);
    await checkCalendarConflicts(eventId, eventData);

    // Audit log
    await createAuditLog("event_created", eventId, {
      title: eventData.title,
      type: eventData.type,
      startTime: eventData.startDateTime,
      organizers: eventData.organizerId,
      participantCount: eventData.participants?.length || 0,
    }, eventData.coOrganizers[0]);

    logger.log("Event creation completed", {eventId});
  } catch (error: any) {
    logger.error("Event creation failed", {
      eventId,
      error: error.message,
      stack: error.stack,
    });

    await createAuditLog("event_create_error", eventId, {
      error: error.message,
    });

    throw error;
  }
});

/**
 * Notifier la création d'un événement aux organisateurs
 */
async function notifyEventCreation(event: any): Promise<void> {
  try {
    if (!event.organizers || event.organizers.length === 0) return;

    const notificationTasks = event.organizers.map(async (organizerId: string) => {
      await notificationService.sendNotification({
        userId: organizerId,
        type: NotificationType.EVENT_CREATED,
        title: "Événement créé avec succès",
        message: `L'événement "${event.title}" a été créé et programmé pour le ${formatEventDate(event.startTime)}`,
        data: {
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.startTime,
          participantCount: event.participants?.length || 0,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        priority: NotificationPriority.NORMAL,
      });
    });

    await Promise.allSettled(notificationTasks);
    TriggerLogger.success("EventUtils", "notifyEventCreation", event.id);
  } catch (error) {
    TriggerLogger.error("EventUtils", "notifyEventCreation", event.id, error);
  }
}

/**
 * Vérifier les conflits de calendrier
 */
async function checkCalendarConflicts(eventId: string, event: any): Promise<void> {
  try {
    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);

    // Vérifier les conflits pour chaque participant
    const conflictTasks = (event.participants || []).map(async (participantId: string) => {
      try {
        // Chercher les événements conflictuels
        const conflicts = await db.collection("events")
          .where("participants", "array-contains", participantId)
          .where("status", "==", EventStatus.CONFIRMED)
          .get();

        const conflictingEvents = conflicts.docs
          .filter((doc) => doc.id !== eventId)
          .filter((doc) => {
            const data = doc.data();
            const start = new Date(data.startTime);
            const end = new Date(data.endTime);

            // Vérifier le chevauchement
            return (eventStart < end) && (eventEnd > start);
          });

        if (conflictingEvents.length > 0) {
          // Notifier le participant du conflit
          await notificationService.sendNotification({
            userId: participantId,
            type: NotificationType.CALENDAR_CONFLICT,
            title: "Conflit de calendrier détecté",
            message: `L'événement "${event.title}" entre en conflit avec ${conflictingEvents.length} autre(s) événement(s)`,
            data: {
              eventId,
              eventTitle: event.title,
              conflictCount: conflictingEvents.length,
              conflictingEvents: conflictingEvents.map((doc) => ({
                id: doc.id,
                title: doc.data().title,
                startTime: doc.data().startTime,
              })),
            },
            channels: [NotificationChannel.IN_APP],
            priority: NotificationPriority.NORMAL,
          });

          // Notifier les organisateurs
          for (const organizerId of event.organizers) {
            const userDoc = await db.collection("users").doc(participantId).get();
            const userData = userDoc.data();
            const userName = userData ? `${userData.firstName} ${userData.lastName}` : "Un participant";

            await notificationService.sendNotification({
              userId: organizerId,
              type: NotificationType.ORGANIZER_ALERT,
              title: "Conflit de calendrier",
              message: `${userName} a un conflit de calendrier pour "${event.title}"`,
              data: {
                eventId,
                eventTitle: event.title,
                participantId,
                participantName: userName,
                conflictCount: conflictingEvents.length,
              },
              channels: [NotificationChannel.IN_APP],
              priority: NotificationPriority.NORMAL,
            });
          }
        }
      } catch (error) {
        TriggerLogger.error("EventUtils", "checkConflictForUser", participantId, error);
      }
    });

    await Promise.allSettled(conflictTasks);
    TriggerLogger.success("EventUtils", "checkCalendarConflicts", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "checkCalendarConflicts", eventId, error);
  }
}

/**
 * Gérer les changements de participants
 */
async function handleParticipantChanges(
  eventId: string,
  oldParticipants: string[],
  newParticipants: string[]
): Promise<void> {
  try {
    const addedParticipants = newParticipants.filter((p) => !oldParticipants.includes(p));
    const removedParticipants = oldParticipants.filter((p) => !newParticipants.includes(p));

    if (addedParticipants.length === 0 && removedParticipants.length === 0) {
      return;
    }

    TriggerLogger.info("EventUtils", "handleParticipantChanges", eventId, {
      added: addedParticipants.length,
      removed: removedParticipants.length,
    });

    const eventDoc = await db.collection("events").doc(eventId).get();
    const eventData = eventDoc.data();

    if (!eventData) return;

    // Notifier les nouveaux participants
    for (const participantId of addedParticipants) {
      await notificationService.sendNotification({
        userId: participantId,
        type: NotificationType.EVENT_INVITATION,
        title: "Ajouté à un événement",
        message: `Vous avez été ajouté à l'événement "${eventData.title}"`,
        data: {
          eventId,
          eventTitle: eventData.title,
          eventDate: eventData.startTime,
          eventLocation: eventData.location,
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
      });

      // Ajouter au calendrier
      await addToParticipantCalendars(eventId, {...eventData, participants: [participantId]});
    }

    // Notifier les participants supprimés
    for (const participantId of removedParticipants) {
      await notificationService.sendNotification({
        userId: participantId,
        type: NotificationType.EVENT_REMOVED,
        title: "Retiré d'un événement",
        message: `Vous avez été retiré de l'événement "${eventData.title}"`,
        data: {
          eventId,
          eventTitle: eventData.title,
          eventDate: eventData.startTime,
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        priority: NotificationPriority.NORMAL,
      });

      // Supprimer du calendrier
      await db.collection("calendar_events")
        .where("userId", "==", participantId)
        .where("eventId", "==", eventId)
        .get()
        .then((snapshot) => {
          const batch = db.batch();
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          return batch.commit();
        });
    }

    TriggerLogger.success("EventUtils", "handleParticipantChanges", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "handleParticipantChanges", eventId, error);
  }
}

/**
 * Gérer les changements de statut d'événement
 */
async function handleEventStatusChange(eventId: string, oldStatus: string, newStatus: string): Promise<void> {
  try {
    TriggerLogger.info("EventUtils", "handleStatusChange", eventId, {
      from: oldStatus,
      to: newStatus,
    });

    const eventDoc = await db.collection("events").doc(eventId).get();
    const eventData = eventDoc.data();

    if (!eventData) return;

    let notificationTitle: string;
    let notificationMessage: string;
    let notificationType: NotificationType;

    switch (newStatus) {
    case EventStatus.CONFIRMED:
      notificationTitle = "Événement confirmé";
      notificationMessage = `L'événement "${eventData.title}" a été confirmé`;
      notificationType = NotificationType.EVENT_CONFIRMED;
      break;

    case EventStatus.CANCELLED:
      notificationTitle = "Événement annulé";
      notificationMessage = `L'événement "${eventData.title}" a été annulé`;
      notificationType = NotificationType.EVENT_CANCELLED;
      break;

    case EventStatus.POSTPONED:
      notificationTitle = "Événement reporté";
      notificationMessage = `L'événement "${eventData.title}" a été reporté`;
      notificationType = NotificationType.EVENT_POSTPONED;
      break;

    default:
      return; // Pas de notification pour les autres statuts
    }

    // Notifier tous les participants
    if (eventData.participants && eventData.participants.length > 0) {
      const notificationTasks = eventData.participants.map((participantId: string) =>
        notificationService.sendNotification({
          userId: participantId,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            eventId,
            eventTitle: eventData.title,
            eventDate: eventData.startTime,
            oldStatus,
            newStatus,
          },
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
          priority: newStatus === EventStatus.CANCELLED ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
        })
      );

      await Promise.allSettled(notificationTasks);
    }

    // Actions spécifiques selon le nouveau statut
    if (newStatus === EventStatus.CANCELLED) {
      // Annuler les rappels programmés
      await cancelScheduledReminders(eventId);

      // Supprimer des calendriers
      await removeFromParticipantCalendars(eventId);
    }

    TriggerLogger.success("EventUtils", "handleStatusChange", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "handleStatusChange", eventId, error);
  }
}

/**
 * Notifier les changements d'événement
 */
async function notifyEventChanges(
  eventId: string,
  beforeData: any,
  afterData: any,
  changes: any
): Promise<void> {
  try {
    if (!afterData.participants || afterData.participants.length === 0) return;

    const changeMessages: string[] = [];

    if (changes.dateChanged) {
      const oldDate = formatEventDate(beforeData.startTime);
      const newDate = formatEventDate(afterData.startTime);
      changeMessages.push(`Date: ${oldDate} → ${newDate}`);
    }

    if (changes.locationChanged) {
      changeMessages.push(`Lieu: ${beforeData.location} → ${afterData.location}`);
    }

    if (changes.titleChanged) {
      changeMessages.push(`Titre: ${beforeData.title} → ${afterData.title}`);
    }

    if (changeMessages.length === 0) return;

    const message = `Modifications: ${changeMessages.join(", ")}`;

    const notificationTasks = afterData.participants.map((participantId: string) =>
      notificationService.sendNotification({
        userId: participantId,
        type: NotificationType.EVENT_UPDATED,
        title: `Événement modifié: ${afterData.title}`,
        message,
        data: {
          eventId,
          eventTitle: afterData.title,
          changes: changeMessages,
          newStartTime: afterData.startTime,
          newLocation: afterData.location,
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
      })
    );

    await Promise.allSettled(notificationTasks);
    TriggerLogger.success("EventUtils", "notifyEventChanges", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "notifyEventChanges", eventId, error);
  }
}

/**
 * Reprogrammer les rappels d'événement
 */
async function rescheduleEventReminders(eventId: string, event: any): Promise<void> {
  try {
    // Annuler les anciens rappels
    await cancelScheduledReminders(eventId);

    // Programmer les nouveaux rappels
    await scheduleEventReminders(eventId, event);

    TriggerLogger.success("EventUtils", "rescheduleEventReminders", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "rescheduleEventReminders", eventId, error);
  }
}

/**
 * Supprimer l'événement des calendriers des participants
 */
async function removeFromParticipantCalendars(eventId: string): Promise<void> {
  try {
    const calendarEvents = await db.collection("calendar_events")
      .where("eventId", "==", eventId)
      .get();

    const batch = db.batch();
    calendarEvents.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    TriggerLogger.success("EventUtils", "removeFromCalendars", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "removeFromCalendars", eventId, error);
  }
}

/**
 * Notifier l'annulation d'événement
 */
async function notifyEventCancellation(eventId: string, event: any): Promise<void> {
  try {
    if (!event.participants || event.participants.length === 0) return;

    const notificationTasks = event.participants.map((participantId: string) =>
      notificationService.sendNotification({
        userId: participantId,
        type: NotificationType.EVENT_CANCELLED,
        title: "Événement annulé",
        message: `L'événement "${event.title}" prévu le ${formatEventDate(event.startTime)} a été annulé`,
        data: {
          eventId,
          eventTitle: event.title,
          eventDate: event.startTime,
          eventLocation: event.location,
          cancelledAt: new Date(),
        },
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
        priority: NotificationPriority.HIGH,
      })
    );

    await Promise.allSettled(notificationTasks);
    TriggerLogger.success("EventUtils", "notifyEventCancellation", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "notifyEventCancellation", eventId, error);
  }
}

/**
 * Supprimer toutes les présences associées à l'événement
 */
async function deleteEventAttendances(eventId: string): Promise<void> {
  try {
    const attendances = await db.collection("attendances")
      .where("eventId", "==", eventId)
      .get();

    if (attendances.empty) return;

    // Archiver avant de supprimer
    const archiveBatch = db.batch();
    const deleteBatch = db.batch();

    attendances.docs.forEach((doc) => {
      // Archiver
      const archiveRef = db.collection("attendances_archive").doc(doc.id);
      archiveBatch.set(archiveRef, {
        ...doc.data(),
        archivedAt: new Date(),
        reason: "event_deleted",
      });

      // Supprimer
      deleteBatch.delete(doc.ref);
    });

    await archiveBatch.commit();
    await deleteBatch.commit();

    TriggerLogger.success("EventUtils", "deleteEventAttendances", eventId, {
      deletedCount: attendances.size,
    });
  } catch (error) {
    TriggerLogger.error("EventUtils", "deleteEventAttendances", eventId, error);
  }
}

/**
 * Annuler les rappels programmés
 */
async function cancelScheduledReminders(eventId: string): Promise<void> {
  try {
    const scheduledNotifications = await db.collection("scheduled_notifications")
      .where("eventId", "==", eventId)
      .where("status", "==", "scheduled")
      .get();

    if (scheduledNotifications.empty) return;

    const batch = db.batch();
    scheduledNotifications.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "cancelled",
        cancelledAt: new Date(),
      });
    });

    await batch.commit();
    TriggerLogger.success("EventUtils", "cancelScheduledReminders", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "cancelScheduledReminders", eventId, error);
  }
}

/**
 * Supprimer les invitations de l'événement
 */
async function deleteEventInvitations(eventId: string): Promise<void> {
  try {
    const invitations = await db.collection("invitations")
      .where("eventId", "==", eventId)
      .get();

    if (invitations.empty) return;

    const batch = db.batch();
    invitations.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    TriggerLogger.success("EventUtils", "deleteEventInvitations", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "deleteEventInvitations", eventId, error);
  }
}

/**
 * Nettoyer les ressources système de l'événement
 */
async function cleanupEventResources(eventId: string): Promise<void> {
  try {
    const cleanupTasks = [
      // Supprimer les fichiers uploadés
      cleanupEventFiles(eventId),

      // Nettoyer le cache
      cleanupEventCache(eventId),

      // Supprimer les métriques temporaires
      cleanupEventMetrics(eventId),
    ];

    await Promise.allSettled(cleanupTasks);
    TriggerLogger.success("EventUtils", "cleanupEventResources", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "cleanupEventResources", eventId, error);
  }
}

/**
 * Nettoyer les fichiers de l'événement
 */
async function cleanupEventFiles(eventId: string): Promise<void> {
  try {
    // Implémenter le nettoyage des fichiers selon votre système de stockage
    // Par exemple, Firebase Storage, AWS S3, etc.
    TriggerLogger.info("EventUtils", "cleanupEventFiles", eventId, "Files cleanup not implemented yet");
  } catch (error) {
    TriggerLogger.error("EventUtils", "cleanupEventFiles", eventId, error);
  }
}

/**
 * Nettoyer le cache de l'événement
 */
async function cleanupEventCache(eventId: string): Promise<void> {
  try {
    // Implémenter le nettoyage du cache selon votre système
    // Par exemple, Redis, Memcached, etc.
    TriggerLogger.info("EventUtils", "cleanupEventCache", eventId, "Cache cleanup not implemented yet");
  } catch (error) {
    TriggerLogger.error("EventUtils", "cleanupEventCache", eventId, error);
  }
}

/**
 * Nettoyer les métriques de l'événement
 */
async function cleanupEventMetrics(eventId: string): Promise<void> {
  try {
    // Nettoyer les métriques temporaires mais garder les historiques importantes
    const metricsToDelete = await db.collection("event_metrics")
      .where("eventId", "==", eventId)
      .where("temporary", "==", true)
      .get();

    if (!metricsToDelete.empty) {
      const batch = db.batch();
      metricsToDelete.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    TriggerLogger.success("EventUtils", "cleanupEventMetrics", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "cleanupEventMetrics", eventId, error);
  }
}

/**
 * Formater la date d'événement pour l'affichage
 */
function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ajouter l'événement aux calendriers des participants
 */
async function addToParticipantCalendars(
  eventId: string,
  event: any): Promise<void> {
  try {
    TriggerLogger.info("EventUtils", "addToCalendars", eventId);

    const calendarTasks =
        event.participants.map(async (participantId: string) => {
          try {
            // Vérifier les préférences du participant
            const userDoc =
                await db.collection("users").doc(participantId).get();
            const userData = userDoc.data();

            if (!userData ||
                userData.preferences?.calendar?.autoAdd === false) {
              return;
            }

            // Créer l'entrée de calendrier
            await db.collection("calendar_events").add({
              userId: participantId,
              eventId,
              title: event.title,
              description: event.description,
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              type: "attendance_event",
              source: "auto_added",
              createdAt: new Date(),
              metadata: {
                eventType: event.type,
                organizers: event.organizers,
              },
            });

            // Envoyer notification de calendrier si souhaité
            if (userData.preferences?.notifications?.calendarUpdates !== false ) {
              await notificationService.sendNotification({
                userId: participantId,
                type: NotificationType.CALENDAR_UPDATE,
                title: "Événement ajouté au calendrier",
                message: `"${event.title}" a été ajouté à votre calendrier`,
                data: {
                  eventId,
                  eventTitle: event.title,
                  eventDate: event.startTime,
                },
                channels: [NotificationChannel.IN_APP],
                priority: NotificationPriority.LOW,
              });
            }
          } catch (error) {
            TriggerLogger.error("EventUtils", "addToCalendar", participantId, error);
          }
        });

    await Promise.allSettled(calendarTasks);
    TriggerLogger.success("EventUtils", "addToCalendars", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "addToCalendars", eventId, error);
  }
}


/**
 * Trigger de mise à jour d'événement (v2)
 */
const onEventUpdate = onDocumentUpdated("events/{eventId}", async (event) => {
  const eventId = event.params.eventId;
  const beforeData = event.data?.before.data() as Event;
  const afterData = event.data?.after.data() as Event;

  try {
    logger.info(`Event updated: ${eventId}`, {
      statusChange: beforeData.status !== afterData.status ?
        `${beforeData.status} → ${afterData.status}` : null,
    });

    const changedFields = getChangedFields(beforeData, afterData);
    if (changedFields.length === 0) {
      logger.info("No significant changes detected", {eventId});
      return;
    }

    // Détection des changements critiques
    const criticalChanges = {
      dateChanged: beforeData.startDateTime !== afterData.startDateTime ||
          beforeData.endDateTime !== afterData.endDateTime,
      locationChanged: JSON.stringify(beforeData.location) !==
          JSON.stringify(afterData.location),
      statusChanged: beforeData.status !== afterData.status,
      participantsChanged: JSON.stringify(beforeData.participants || []) !==
          JSON.stringify(afterData.participants || []),
      titleChanged: beforeData.title !== afterData.title,
      organizersChanged: JSON.stringify(beforeData.organizerId) !==
          JSON.stringify(afterData.organizerId),
    };

    const hasCriticalChanges = Object.values(criticalChanges).some(Boolean);

    if (hasCriticalChanges) {
      logger.info("Critical changes detected", {eventId, criticalChanges});
    }

    const tasks = [];

    if (criticalChanges.participantsChanged) {
      tasks.push(handleParticipantChanges(
        eventId,
        beforeData.participants || [],
        afterData.participants || []
      ));
    }

    if (criticalChanges.statusChanged) {
      tasks.push(handleEventStatusChange(
        eventId,
        beforeData.status,
        afterData.status
      ));
    }

    if (criticalChanges.dateChanged || criticalChanges.locationChanged || criticalChanges.titleChanged) {
      tasks.push(notifyEventChanges(
        eventId,
        beforeData,
        afterData,
        criticalChanges
      ));

      if (criticalChanges.dateChanged) {
        tasks.push(rescheduleEventReminders(eventId, afterData));
      }
    }

    if (hasCriticalChanges) {
      tasks.push(mlService.updateEventPredictions(eventId, afterData));
    }

    if (criticalChanges.dateChanged || criticalChanges.participantsChanged) {
      tasks.push(checkCalendarConflicts(eventId, afterData));
    }

    await Promise.allSettled(tasks);

    if (hasCriticalChanges) {
      await createAuditLog("event_updated", eventId, {
        changedFields,
        criticalChanges,
      }, afterData.coOrganizers[0]);
    }

    logger.log("Event update processed", {eventId});
  } catch (error: any) {
    logger.error("Event update failed", {
      eventId,
      error: error.message,
    });

    await createAuditLog("event_update_error", eventId, {
      error: error.message,
    });

    throw error;
  }
});

/**
 * Trigger de suppression d'événement (v2)
 */
const onEventDelete = onDocumentDeleted("events/{eventId}", async (event) => {
  const eventId = event.params.eventId;
  const eventData = event.data?.data() as Event;

  try {
    logger.info(`Event deleted: ${eventId}`, {
      title: eventData.title,
      status: eventData.status,
    });

    // Tâches de nettoyage
    const cleanupTasks = [];

    if (eventData.participants?.length) {
      cleanupTasks.push(notifyEventCancellation(eventId, eventData));
    }

    cleanupTasks.push(
      deleteEventAttendances(eventId),
      cancelScheduledReminders(eventId),
      deleteEventInvitations(eventId),
      mlService.cleanupEventData(eventId)
    );

    await Promise.allSettled(cleanupTasks);
    await cleanupEventResources(eventId);

    // Audit log
    await createAuditLog("event_deleted", eventId, {
      title: eventData.title,
      type: eventData.type,
      status: eventData.status,
      participantCount: eventData.participants?.length || 0,
    });

    logger.log("Event deletion completed", {eventId});
  } catch (error: any) {
    logger.error("Event deletion failed", {
      eventId,
      error: error.message,
    });

    await createAuditLog("event_delete_error", eventId, {
      error: error.message,
    });

    throw error;
  }
});

/**
 * Nettoyage périodique des événements terminés (v2)
 */
const cleanupCompletedEvents = onSchedule({
  schedule: "0 4 * * 1", // Tous les lundis à 4h
  timeZone: "Europe/Paris",
}, async () => {
  try {
    logger.info("Starting completed events cleanup");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Événements terminés depuis +1 semaine

    const query = db.collection("events")
      .where("status", "==", EventStatus.COMPLETED)
      .where("endTime", "<", cutoffDate)
      .limit(100);

    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info("No completed events to clean");
      return;
    }

    const cleanupTasks = snapshot.docs.map(async (doc) => {
      try {
        // Archiver
        await db.collection("events_archive").doc(doc.id).set({
          ...doc.data(),
          archivedAt: FieldValue.serverTimestamp(),
        });

        // Nettoyer les ressources
        await cleanupEventResources(doc.id);

        // Supprimer
        await doc.ref.delete();
      } catch (error: any) {
        logger.error(`Failed to cleanup event ${doc.id}`, {
          error: error.message,
        });
      }
    });

    await Promise.allSettled(cleanupTasks);

    logger.info("Completed events cleanup finished", {
      count: snapshot.size,
    });

    await createAuditLog("events_archived", "system", {
      count: snapshot.size,
      cutoffDate,
    });
  } catch (error: any) {
    logger.error("Completed events cleanup failed", {
      error: error.message,
    });
    throw error;
  }
});



/*async function createAutoInvitations(eventId: string, event: any): Promise<void> {
  try {
    TriggerLogger.info("EventUtils", "createAutoInvitations", eventId);
    const {targetAudience} = event;
    let targetUsers: any[] = [];

    if (!targetAudience) return;

    // Construire la requête selon l'audience cible
    let query = db.collection("users").where("status", "==", "active");

    if (targetAudience.departments?.length) {
      query = query.where("department", "in", targetAudience.departments);
    }

    if (targetAudience.roles && targetAudience.roles.length > 0) {
      // Firestore ne supporte pas les requêtes avec plusieurs 'in',
      // donc on filtre après
      const users = await query.get();
      targetUsers = users.docs
        .map((doc) => ({id: doc.id, ...doc.data()}))
        // @ts-ignore
        .filter((user) => targetAudience.roles.includes(user.role));
    } else {
      const users = await query.get();
      targetUsers = users.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    }

    // Filtrer par localisation si spécifiée
    if (targetAudience.locations?.length) {
      targetUsers = targetUsers.filter((user) =>
        targetAudience.locations.includes(user.location)
      );
    }

    // Limiter le nombre d'invitations si spécifié
    if (targetAudience.maxInvitations &&
        targetUsers.length > targetAudience.maxInvitations) {
      const userScores = await scoreUsersForEvent(eventId, targetUsers);
      targetUsers = userScores
        .sort((a, b) => b.score - a.score)
        .slice(0, targetAudience.maxInvitations)
        .map((scored) => scored.user);
    }

    // Créer les invitations
    const batch = db.batch();
    const notificationPromises: Promise<Notification>[] = [];

    for (const user of targetUsers) {
      const invitationId = `${eventId}_${user.id}`;
      const invitationRef = db.collection("invitations").doc(invitationId);

      batch.set(invitationRef, {
        id: invitationId,
        eventId,
        userId: user.id,
        status: InvitationStatus.PENDING,
        sentAt: FieldValue.serverTimestamp(),
        createdBy: "system",
        autoInvited: true,
        metadata: {
          reason: "auto_invite",
          audienceCriteria: targetAudience,
        },
      });

      notificationPromises.push(
        notificationService.sendNotification({
          userId: user.id,
          type: NotificationType.EVENT_INVITATION,
          title: `Invitation : ${event.title}`,
          message: `Vous êtes invité à "${event.title}"
           le ${formatEventDate(event.startTime)}`,
          data: {
            eventId,
            eventTitle: event.title,
            eventDate: event.startTime,
            eventLocation: event.location,
            invitationId,
          },
          channels: [
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
            NotificationChannel.IN_APP,
          ],
          priority: NotificationPriority.NORMAL,
        })
      );
    }

    await batch.commit();
    await Promise.allSettled(notificationPromises);

    // Mettre à jour l'événement
    const newParticipants = [
      ...(event.participants || []),
      ...targetUsers.map((u) => u.id),
    ];

    await db.collection("events").doc(eventId).update({
      participants: newParticipants,
      autoInviteStats: {
        targetCount: targetUsers.length,
        sentAt: FieldValue.serverTimestamp(),
        criteria: targetAudience,
      },
    });

    logger.log("Auto invitations created", {
      eventId,
      count: targetUsers.length,
    });
    TriggerLogger.success("EventUtils", "createAutoInvitations", eventId, {
      invitationsSent: targetUsers.length,
      totalParticipants: newParticipants.length,
    });
  } catch (error: any) {
    logger.error("Failed to create auto invitations", {
      eventId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Score les utilisateurs pour un événement spécifique
 * @param eventId - ID de l'événement
 * @param userIds - Liste des IDs utilisateurs à scorer
 * @returns Array d'objets avec utilisateur et score
 *//*
export async function scoreUsersForEvent(
  eventId: string,
  userIds: string[]
): Promise<Array<{ user: string; score: number; factors: ScoringFactors }>> {
  try {
    // 1. Récupérer les données de l'événement
    const event = await eventService.getEventById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // 2. Récupérer les données des utilisateurs en parallèle
    const [users, userAttendances, userProfiles] = await Promise.all([
      userService.getUsersByIds(userIds),
      attendanceService.getUsersAttendanceHistory(userIds, 365), // 1 an d'historique
      userService.getUsersProfiles(userIds)
    ]);

    // 3. Scorer chaque utilisateur
    const scoredUsers = await Promise.all(
      userIds.map(async (userId) => {
        const user = users.find(u => u.id === userId);
        const attendanceHistory = userAttendances[userId] || [];
        const profile = userProfiles[userId];

        if (!user) {
          return { user: userId, score: 0, factors: {} as ScoringFactors };
        }

        const factors = await calculateScoringFactors(
          userId,
          event,
          user,
          attendanceHistory,
          profile
        );

        const score = calculateFinalScore(factors);

        return {
          user: userId,
          score: Math.round(score * 100) / 100, // Arrondir à 2 décimales
          factors
        };
      })
    );

    // 4. Trier par score décroissant
    return scoredUsers.sort((a, b) => b.score - a.score);

  } catch (error) {
    logger.error('Error scoring users for event:', error);
    throw new Error(`Failed to score users for event: ${error.message}`);
  }
}

/**
 * Interface pour les facteurs de scoring
 *//*
interface ScoringFactors {
  // Facteurs de présence (40% du score total)
  overallAttendanceRate: number;        // 0-100: Taux de présence global
  recentAttendanceRate: number;         // 0-100: Taux de présence récent (3 mois)
  similarEventsAttendanceRate: number;  // 0-100: Présence aux événements similaires
  
  // Facteurs de ponctualité (20% du score total)
  punctualityRate: number;              // 0-100: Taux de ponctualité
  avgDelayMinutes: number;              // Retard moyen en minutes
  
  // Facteurs d'engagement (25% du score total)
  eventTypePreference: number;          // 0-100: Préférence pour ce type d'événement
  departmentMatch: number;              // 0-100: Match avec le département
  roleRelevance: number;                // 0-100: Pertinence du rôle
  lastActivityDays: number;             // Jours depuis dernière activité
  
  // Facteurs contextuels (15% du score total)
  timeSlotPreference: number;           // 0-100: Préférence horaire
  locationPreference: number;           // 0-100: Préférence géographique
  conflictEvents: number;               // Nombre d'événements en conflit
  pastNoShows: number;                  // Nombre d'absences récentes sans justification
}

/**
 * Calcule les facteurs de scoring pour un utilisateur
 *//*
async function calculateScoringFactors(
  userId: string,
  event: any,
  user: any,
  attendanceHistory: any[],
  profile: any
): Promise<ScoringFactors> {
  
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentAttendances = attendanceHistory.filter(a => a.createdAt >= threeMonthsAgo);
  
  // === FACTEURS DE PRÉSENCE (40%) ===
  
  // Taux de présence global
  const totalEvents = attendanceHistory.length;
  const presentEvents = attendanceHistory.filter(a => a.status === 'present').length;
  const overallAttendanceRate = totalEvents > 0 ? (presentEvents / totalEvents) * 100 : 50;
  
  // Taux de présence récent (3 derniers mois)
  const recentTotalEvents = recentAttendances.length;
  const recentPresentEvents = recentAttendances.filter(a => a.status === 'present').length;
  const recentAttendanceRate = recentTotalEvents > 0 ? (recentPresentEvents / recentTotalEvents) * 100 : overallAttendanceRate;
  
  // Présence aux événements similaires
  const similarEvents = attendanceHistory.filter(a => 
    a.event?.type === event.type || 
    a.event?.department === event.department ||
    a.event?.category === event.category
  );
  const similarPresentEvents = similarEvents.filter(a => a.status === 'present').length;
  const similarEventsAttendanceRate = similarEvents.length > 0 ? 
    (similarPresentEvents / similarEvents.length) * 100 : overallAttendanceRate;
  
  // === FACTEURS DE PONCTUALITÉ (20%) ===
  
  const presentAttendances = attendanceHistory.filter(a => a.status === 'present');
  let totalDelayMinutes = 0;
  let punctualCount = 0;
  
  presentAttendances.forEach(attendance => {
    if (attendance.checkInTime && attendance.event?.startTime) {
      const checkIn = new Date(attendance.checkInTime);
      const eventStart = new Date(attendance.event.startTime);
      const delayMinutes = Math.max(0, (checkIn.getTime() - eventStart.getTime()) / (1000 * 60));
      
      totalDelayMinutes += delayMinutes;
      if (delayMinutes <= 5) punctualCount++; // Considéré ponctuel si <= 5min de retard
    }
  });
  
  const punctualityRate = presentAttendances.length > 0 ? 
    (punctualCount / presentAttendances.length) * 100 : 85; // Défaut optimiste
  const avgDelayMinutes = presentAttendances.length > 0 ? 
    totalDelayMinutes / presentAttendances.length : 0;
  
  // === FACTEURS D'ENGAGEMENT (25%) ===
  
  // Préférence pour le type d'événement
  const eventTypeAttendances = attendanceHistory.filter(a => a.event?.type === event.type);
  const eventTypePreference = eventTypeAttendances.length > 0 ?
    (eventTypeAttendances.filter(a => a.status === 'present').length / eventTypeAttendances.length) * 100 : 60;
  
  // Match avec le département
  const departmentMatch = user.department === event.department ? 100 :
    user.departments?.includes(event.department) ? 80 : 30;
  
  // Pertinence du rôle
  const roleRelevance = calculateRoleRelevance(user.role, event.targetRoles || []);
  
  // Dernière activité
  const lastActivity = attendanceHistory.length > 0 ? 
    Math.max(...attendanceHistory.map(a => new Date(a.createdAt).getTime())) : 0;
  const lastActivityDays = lastActivity > 0 ? 
    Math.floor((now.getTime() - lastActivity) / (24 * 60 * 60 * 1000)) : 365;
  
  // === FACTEURS CONTEXTUELS (15%) ===
  
  // Préférence horaire (basée sur l'historique)
  const eventHour = new Date(event.startTime).getHours();
  const timeSlotPreference = calculateTimeSlotPreference(attendanceHistory, eventHour);
  
  // Préférence géographique
  const locationPreference = calculateLocationPreference(attendanceHistory, event.location, user.location);
  
  // Événements en conflit
  const conflictEvents = await eventService.getConflictingEvents(userId, event.startTime, event.endTime);
  
  // Absences récentes sans justification
  const pastNoShows = recentAttendances.filter(a => 
    a.status === 'absent' && (!a.reason || a.reason === 'no_show')
  ).length;
  
  return {
    overallAttendanceRate,
    recentAttendanceRate,
    similarEventsAttendanceRate,
    punctualityRate,
    avgDelayMinutes,
    eventTypePreference,
    departmentMatch,
    roleRelevance,
    lastActivityDays,
    timeSlotPreference,
    locationPreference,
    conflictEvents: conflictEvents.length,
    pastNoShows
  };
}

/**
 * Calcule le score final basé sur les facteurs
 *//*
function calculateFinalScore(factors: ScoringFactors): number {
  // Poids des différentes catégories
  const weights = {
    attendance: 0.40,    // 40% - Facteurs de présence
    punctuality: 0.20,   // 20% - Facteurs de ponctualité
    engagement: 0.25,    // 25% - Facteurs d'engagement
    contextual: 0.15     // 15% - Facteurs contextuels
  };
  
  // === SCORE DE PRÉSENCE (40%) ===
  const attendanceScore = (
    factors.overallAttendanceRate * 0.4 +           // 40% du score présence
    factors.recentAttendanceRate * 0.4 +            // 40% du score présence
    factors.similarEventsAttendanceRate * 0.2       // 20% du score présence
  );
  
  // === SCORE DE PONCTUALITÉ (20%) ===
  const punctualityScore = factors.punctualityRate - (factors.avgDelayMinutes * 2);
  const normalizedPunctualityScore = Math.max(0, Math.min(100, punctualityScore));
  
  // === SCORE D'ENGAGEMENT (25%) ===
  const engagementScore = (
    factors.eventTypePreference * 0.3 +             // 30% du score engagement
    factors.departmentMatch * 0.25 +                // 25% du score engagement
    factors.roleRelevance * 0.25 +                  // 25% du score engagement
    Math.max(0, 100 - factors.lastActivityDays) * 0.2  // 20% du score engagement (plus récent = mieux)
  );
  
  // === SCORE CONTEXTUEL (15%) ===
  const contextualScore = (
    factors.timeSlotPreference * 0.3 +              // 30% du score contextuel
    factors.locationPreference * 0.3 +              // 30% du score contextuel
    Math.max(0, 100 - factors.conflictEvents * 20) * 0.2 +  // 20% - pénalité pour conflits
    Math.max(0, 100 - factors.pastNoShows * 15) * 0.2      // 20% - pénalité pour no-shows
  );
  
  // === CALCUL FINAL ===
  const finalScore = (
    attendanceScore * weights.attendance +
    normalizedPunctualityScore * weights.punctuality +
    engagementScore * weights.engagement +
    contextualScore * weights.contextual
  );
  
  // Bonus/Malus supplémentaires
  let adjustedScore = finalScore;
  
  // Bonus pour les utilisateurs très engagés récemment
  if (factors.recentAttendanceRate > 90 && factors.punctualityRate > 90) {
    adjustedScore += 5;
  }
  
  // Malus pour les utilisateurs inactifs
  if (factors.lastActivityDays > 90) {
    adjustedScore -= 10;
  }
  
  // Malus pour les no-shows répétés
  if (factors.pastNoShows > 2) {
    adjustedScore -= factors.pastNoShows * 5;
  }
  
  // S'assurer que le score reste entre 0 et 100
  return Math.max(0, Math.min(100, adjustedScore));
}

/**
 * Calcule la pertinence du rôle
 *//*
function calculateRoleRelevance(userRole: string, targetRoles: string[]): number {
  if (!targetRoles || targetRoles.length === 0) return 70; // Neutre si pas de rôles cibles
  
  if (targetRoles.includes(userRole)) return 100;
  
  // Logique de hiérarchie des rôles (à adapter selon votre organisation)
  const roleHierarchy: Record<string, string[]> = {
    'admin': ['manager', 'employee', 'intern'],
    'manager': ['employee', 'intern'],
    'employee': ['intern'],
    'hr': ['manager', 'employee'],
    'it': ['employee']
  };
  
  const relatedRoles = roleHierarchy[userRole] || [];
  const hasRelatedRole = targetRoles.some(role => relatedRoles.includes(role));
  
  return hasRelatedRole ? 60 : 30;
}

/**
 * Calcule la préférence horaire basée sur l'historique
 *//*
function calculateTimeSlotPreference(attendanceHistory: any[], eventHour: number): number {
  const hourlyAttendance: Record<number, { total: number; present: number }> = {};
  
  attendanceHistory.forEach(attendance => {
    if (attendance.event?.startTime) {
      const hour = new Date(attendance.event.startTime).getHours();
      if (!hourlyAttendance[hour]) {
        hourlyAttendance[hour] = { total: 0, present: 0 };
      }
      hourlyAttendance[hour].total++;
      if (attendance.status === 'present') {
        hourlyAttendance[hour].present++;
      }
    }
  });
  
  // Préférence pour la tranche horaire de l'événement
  const eventHourData = hourlyAttendance[eventHour];
  if (!eventHourData || eventHourData.total === 0) return 70; // Neutre si pas de données
  
  return (eventHourData.present / eventHourData.total) * 100;
}

/**
 * Calcule la préférence géographique
 *//*
function calculateLocationPreference(
  attendanceHistory: any[], 
  eventLocation: any, 
  userLocation: any
): number {
  if (!eventLocation) return 70; // Neutre si pas de lieu
  
  // Analyser l'historique des lieux fréquentés
  const locationAttendance: Record<string, { total: number; present: number }> = {};
  
  attendanceHistory.forEach(attendance => {
    if (attendance.event?.location?.name) {
      const locationName = attendance.event.location.name;
      if (!locationAttendance[locationName]) {
        locationAttendance[locationName] = { total: 0, present: 0 };
      }
      locationAttendance[locationName].total++;
      if (attendance.status === 'present') {
        locationAttendance[locationName].present++;
      }
    }
  });
  
  // Vérifier si l'utilisateur a déjà assisté à des événements dans ce lieu
  const eventLocationData = locationAttendance[eventLocation.name];
  if (eventLocationData && eventLocationData.total > 0) {
    return (eventLocationData.present / eventLocationData.total) * 100;
  }
  
  // Calculer la distance si les coordonnées sont disponibles
  if (eventLocation.coordinates && userLocation?.coordinates) {
    const distance = calculateDistance(
      userLocation.coordinates,
      eventLocation.coordinates
    );
    
    // Score basé sur la distance (plus proche = meilleur score)
    if (distance < 5) return 90;      // < 5km
    if (distance < 15) return 75;     // 5-15km
    if (distance < 30) return 60;     // 15-30km
    if (distance < 50) return 45;     // 30-50km
    return 30;                        // > 50km
  }
  
  return 70; // Score neutre par défaut
}

/**
 * Calcule la distance entre deux points (formule haversine)
 *//*
function calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}*/

export {
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  cleanupCompletedEvents,
};
