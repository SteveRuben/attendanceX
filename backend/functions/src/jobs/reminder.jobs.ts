import {logger} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {FieldValue} from "firebase-admin/firestore";
import {EventModel} from "../models/event.model";
import { collections } from "../config";
import { NotificationService } from "../services/notification/notification.service";
import { NotificationChannel, NotificationPriority, NotificationType } from "../common/types/notification.types";



/**
 * Vérification des rappels - Toutes les 15 minutes
 */
export const checkReminders = onSchedule({
  schedule: "*/15 * * * *",
  timeZone: "Europe/Paris",
  memory: "512MiB",
}, async (event) => {
  logger.info("⏰ Checking for event reminders");

  try {
    const results = await Promise.allSettled([
      processEventReminders(),
      processCustomReminders(),
      processFollowUpReminders(),
    ]);

    const summary = results.map((result, index) => ({
      type: ["event_reminders", "custom_reminders", "followup_reminders"][index],
      status: result.status,
      ...(result.status === "fulfilled" && {data: result.value}),
      ...(result.status === "rejected" && {error: result.reason?.message}),
    }));

    logger.info("✅ Reminder check completed", {summary});
  } catch (error) {
    logger.error("❌ Reminder check failed", {error});
  }
});

/**
 * Rappels quotidiens - 8h du matin
 */
export const dailyReminders = onSchedule({
  schedule: "0 8 * * *",
  timeZone: "Europe/Paris",
  memory: "1GiB",
}, async (event) => {
  logger.info("📅 Processing daily reminders");

  try {
    const results = await Promise.allSettled([
      sendTodayEventReminders(),
      sendWeeklyDigest(),
      sendPendingApprovals(),
      sendAttendanceReminders(),
    ]);

    logger.info("✅ Daily reminders sent", {results: results.length});
  } catch (error) {
    logger.error("❌ Daily reminders failed", {error});
  }
});

/**
 * Rappels de suivi post-événement - Toutes les heures
 */
export const postEventFollowUp = onSchedule({
  schedule: "0 * * * *",
  timeZone: "Europe/Paris",
  memory: "512MiB",
}, async (event) => {
  logger.info("📋 Processing post-event follow-ups");

  try {
    await sendPostEventSurveys();
    await sendAttendanceSummaries();
    await processEventFeedback();

    logger.info("✅ Post-event follow-ups completed");
  } catch (error) {
    logger.error("❌ Post-event follow-ups failed", {error});
  }
});

// ===== FONCTIONS DE RAPPEL =====

async function processEventReminders(): Promise<{ sent: number }> {
  const now = new Date();
  const upcomingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h dans le futur

  const eventsQuery = collections.events
    .where("status", "==", "published")
    .where("startDateTime", ">", now)
    .where("startDateTime", "<=", upcomingTime)
    .where("reminderSettings.enabled", "==", true);

  const eventsSnapshot = await eventsQuery.get();
  let sentCount = 0;

  for (const eventDoc of eventsSnapshot.docs) {
    const event = EventModel.fromFirestore(eventDoc);
    if (!event) {continue;}

    const eventData = event.getData();
    const timeUntilEvent = eventData.startDateTime.getTime() - now.getTime();
    const minutesUntilEvent = Math.round(timeUntilEvent / (1000 * 60));

    // Vérifier si c'est le bon moment pour envoyer un rappel
    const shouldSendReminder = eventData.reminderSettings.intervals.some((interval) =>
      Math.abs(minutesUntilEvent - interval) <= 7 // Tolérance de 7 minutes
    );

    if (shouldSendReminder) {
      await sendEventReminder(event, minutesUntilEvent);
      sentCount++;
    }
  }

  logger.info(`📨 Sent ${sentCount} event reminders`);
  return {sent: sentCount};
}

async function sendEventReminder(event: EventModel, minutesUntilEvent: number): Promise<void> {
  const eventData = event.getData();
  const notificationService = new NotificationService();

  // Préparer le message
  const timeText = minutesUntilEvent < 60 ?
    `${minutesUntilEvent} minutes` :
    `${Math.round(minutesUntilEvent / 60)} heures`;

  const message = {
    title: `Rappel : ${eventData.title}`,
    content: `Votre événement "${eventData.title}" commence dans ${timeText}.`,
    eventDetails: {
      date: eventData.startDateTime.toLocaleDateString("fr-FR"),
      time: eventData.startDateTime.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: eventData.location.type === "physical" ?
        eventData.location.address :
        "En ligne",
    },
  };

  // Envoyer aux participants
  const participantPromises = eventData.participants.map(async (userId) => {
    try {
      await notificationService.sendNotification({
        userId,
        type: NotificationType.EVENT_REMINDER,
        title: message.title,
        message: message.content,
        channels: eventData.reminderSettings.channels.map(c => c as NotificationChannel),
        priority: NotificationPriority.HIGH,
        data: {
          eventId: eventData.id,
          eventTitle: eventData.title,
          startDateTime: eventData.startDateTime.toISOString(),
          ...message.eventDetails,
        },
      });
    } catch (error) {
      logger.error("Failed to send reminder to participant", {userId, error});
    }
  });

  await Promise.allSettled(participantPromises);

  // Envoyer aux organisateurs si configuré
  if (eventData.reminderSettings.sendToOrganizers) {
    try {
      await notificationService.sendNotification({
        userId: eventData.organizerId,
        type: NotificationType.EVENT_REMINDER,
        title: `Rappel organisateur : ${eventData.title}`,
        message: `Votre événement commence dans ${timeText}. ${eventData.participants.length} participants inscrits.`,
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
        priority: NotificationPriority.LOW,
        data: {
          eventId: eventData.id,
          participantCount: eventData.participants.length,
          confirmedCount: eventData.confirmedParticipants.length,
        },
      });
    } catch (error) {
      logger.error("Failed to send reminder to organizer", {
        organizerId: eventData.organizerId,
        error,
      });
    }
  }

  // Marquer le rappel comme envoyé
  event.update({
    lastReminderSent: new Date(),
    // @ts-ignore
    remindersSent: FieldValue.increment(1),
  });
}

async function processCustomReminders(): Promise<{ processed: number }> {
  const now = new Date();

  const remindersQuery = collections.custom_reminders
    .where("scheduledFor", "<=", now)
    .where("sent", "==", false)
    .limit(100);

  const snapshot = await remindersQuery.get();
  let processed = 0;

  for (const doc of snapshot.docs) {
    try {
      const reminder = doc.data();
      const notificationService = new NotificationService();

      await notificationService.sendNotification({
        userId: reminder.userId,
        type: reminder.type || "custom_reminder",
        title: reminder.title,
        message: reminder.message,
        channels: reminder.channels || ["push"],
        priority: reminder.priority || "medium",
        data: reminder.data,
      });

      // Marquer comme envoyé
      await doc.ref.update({
        sent: true,
        sentAt: new Date(),
      });

      processed++;
    } catch (error) {
      logger.error("Failed to process custom reminder", {
        reminderId: doc.id,
        error,
      });
    }
  }

  logger.info(`📨 Processed ${processed} custom reminders`);
  return {processed};
}

async function sendTodayEventReminders(): Promise<void> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const eventsQuery = collections.events
    .where("startDateTime", ">=", startOfDay)
    .where("startDateTime", "<=", endOfDay)
    .where("status", "==", "published");

  const snapshot = await eventsQuery.get();

  for (const doc of snapshot.docs) {
    const event = EventModel.fromFirestore(doc);
    if (!event) {continue;}

    const eventData = event.getData();
    const notificationService = new NotificationService();

    // Envoyer un digest quotidien aux participants
    for (const userId of eventData.participants) {
      await notificationService.sendNotification({
        userId,
        type: NotificationType.DAILY_EVENT_REMINDER,
        title: "Vos événements aujourd'hui",
        message: `N'oubliez pas : "${eventData.title}" à ${eventData.startDateTime.toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"})}`,
        channels: [NotificationChannel.PUSH],
        priority: NotificationPriority.MEDIUM,
        data: {
          eventId: eventData.id,
          eventTitle: eventData.title,
          startDateTime: eventData.startDateTime.toISOString(),
        },
      });
    }
  }
}

async function sendWeeklyDigest(): Promise<void> {
  // Envoyer seulement le lundi
  if (new Date().getDay() !== 1) {return;}

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("startDateTime", ">=", today)
    .where("startDateTime", "<=", nextWeek)
    .where("status", "==", "published");

  const snapshot = await eventsQuery.get();

  // Grouper par utilisateur
  // @ts-ignore
  const userEvents: { [userId: string]: any[] } = {};

  for (const doc of snapshot.docs) {
    const event = doc.data();
    const notificationService = new NotificationService();

    // Récupérer les présences pour cet événement
    const attendanceQuery = collections.attendances
      .where("eventId", "==", doc.id)
      .where("status", "in", ["present", "late", "left_early"]);

    const attendanceSnapshot = await attendanceQuery.get();

    for (const attendanceDoc of attendanceSnapshot.docs) {
      const attendance = attendanceDoc.data();

      // Vérifier si le feedback n'a pas déjà été donné
      if (!attendance.feedback) {
        await notificationService.sendNotification({
          userId: attendance.userId,
          type: NotificationType.FEEDBACK_REQUEST,
          title: "Donnez votre avis",
          message: `Comment avez-vous trouvé l'événement "${event.title}" ? Votre avis nous intéresse !`,
          channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
          priority: NotificationPriority.LOW,
          data: {
            eventId: event.id,
            eventTitle: event.title,
            attendanceId: attendanceDoc.id,
            surveyUrl: `https://app.attendance-x.com/feedback/${attendanceDoc.id}`,
          },
        });
      }
    }
  }
}

async function sendAttendanceSummaries(): Promise<void> {
  // Envoyer des résumés de présence 24h après les événements
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("endDateTime", ">=", twoDaysAgo)
    .where("endDateTime", "<=", yesterday)
    .where("status", "==", "completed");

  const snapshot = await eventsQuery.get();

  for (const doc of snapshot.docs) {
    const event = doc.data();

    // Calculer les statistiques de présence
    const attendanceQuery = collections.attendances
      .where("eventId", "==", doc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    const stats = {
      totalInvited: event.participants.length,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
    };

    attendanceSnapshot.docs.forEach((attendanceDoc) => {
      const attendance = attendanceDoc.data();
      switch (attendance.status) {
      case "present":
        stats.totalPresent++;
        break;
      case "absent":
        stats.totalAbsent++;
        break;
      case "late":
        stats.totalLate++;
        stats.totalPresent++; // Comptés comme présents aussi
        break;
      case "excused":
        stats.totalExcused++;
        break;
      }
    });

    const attendanceRate = stats.totalInvited > 0 ?
      Math.round((stats.totalPresent / stats.totalInvited) * 100) :
      0;

    const notificationService = new NotificationService();

    // Envoyer le résumé à l'organisateur
    await notificationService.sendNotification({
      userId: event.organizerId,
      type: NotificationType.ATTENDANCE_SUMMARY,
      title: `Résumé des présences - ${event.title}`,
      message: `Taux de présence : ${attendanceRate}% (${stats.totalPresent}/${stats.totalInvited} participants)`,
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.LOW,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        stats,
        attendanceRate,
        reportUrl: `https://app.attendance-x.com/reports/event/${event.id}`,
      },
    });

    // Mettre à jour les statistiques de l'événement
    await doc.ref.update({
      "stats.totalPresent": stats.totalPresent,
      "stats.totalAbsent": stats.totalAbsent,
      "stats.totalLate": stats.totalLate,
      "stats.totalExcused": stats.totalExcused,
      "stats.attendanceRate": attendanceRate,
      "stats.lastUpdated": new Date(),
    });
  }
}

async function processEventFeedback(): Promise<void> {
  // Traiter et agréger les retours d'événements
  const recentFeedbackQuery = collections.attendances
    .where("feedback", "!=", null)
    .where("updatedAt", ">=", new Date(Date.now() - 24 * 60 * 60 * 1000));

  const snapshot = await recentFeedbackQuery.get();
  const eventFeedbacks: { [eventId: string]: any[] } = {};

  // Grouper par événement
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!eventFeedbacks[data.eventId]) {
      eventFeedbacks[data.eventId] = [];
    }
    eventFeedbacks[data.eventId].push(data.feedback);
  });

  // Calculer les métriques pour chaque événement
  for (const [eventId, feedbacks] of Object.entries(eventFeedbacks)) {
    const ratings = feedbacks.map((f) => f.rating).filter((r) => r !== null);
    const avgRating = ratings.length > 0 ?
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length :
      0;

    const recommendationRate = feedbacks.filter((f) => f.wouldRecommend === true).length / feedbacks.length * 100;

    // Mettre à jour l'événement avec les métriques de feedback
    await collections.events.doc(eventId).update({
      "feedbackMetrics.averageRating": Math.round(avgRating * 10) / 10,
      "feedbackMetrics.recommendationRate": Math.round(recommendationRate),
      "feedbackMetrics.totalResponses": feedbacks.length,
      "feedbackMetrics.lastUpdated": new Date(),
    });
  }
}
function processFollowUpReminders(): any {
  throw new Error("Function not implemented.");
}

function sendPostEventSurveys() {
  throw new Error("Function not implemented.");
}

function sendPendingApprovals(): any {
  throw new Error("Function not implemented.");
}

function sendAttendanceReminders(): any {
  throw new Error("Function not implemented.");
}

