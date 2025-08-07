import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { appointmentNotificationService } from "../services/appointment-notification.service";

/**
 * Fonction planifiée pour traiter les rappels de rendez-vous
 * S'exécute toutes les 5 minutes pour vérifier et envoyer les rappels en attente
 */
export const processAppointmentReminders = onSchedule({
  schedule: "*/5 * * * *", // Toutes les 5 minutes
  timeZone: "Europe/Paris",
  memory: "256MiB",
  timeoutSeconds: 300,
  retryConfig: {
    retryCount: 3,
    maxRetrySeconds: 60
  }
}, async (event) => {
  logger.info("Starting appointment reminders processing", { 
    timestamp: new Date().toISOString() 
  });

  try {
    await appointmentNotificationService.processScheduledReminders();
    logger.info("Appointment reminders processing completed successfully");
  } catch (error) {
    logger.error("Error processing appointment reminders", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw pour déclencher les retry
  }
});

/**
 * Fonction planifiée pour nettoyer les anciens rappels
 * S'exécute tous les jours à 2h du matin pour supprimer les rappels obsolètes
 */
export const cleanupOldReminders = onSchedule({
  schedule: "0 2 * * *", // Tous les jours à 2h du matin
  timeZone: "Europe/Paris",
  memory: "256MiB",
  timeoutSeconds: 600
}, async (event) => {
  logger.info("Starting old reminders cleanup");

  try {
    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore();
    
    // Supprimer les rappels de plus de 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const appointmentsSnapshot = await db.collection('appointments')
      .where('date', '<', thirtyDaysAgo)
      .get();

    let cleanedCount = 0;
    const batch = db.batch();

    for (const doc of appointmentsSnapshot.docs) {
      const appointment = doc.data();
      if (appointment.reminders && appointment.reminders.length > 0) {
        // Garder seulement les rappels des 30 derniers jours
        const recentReminders = appointment.reminders.filter((reminder: any) => 
          reminder.createdAt && reminder.createdAt.toDate() > thirtyDaysAgo
        );

        if (recentReminders.length !== appointment.reminders.length) {
          batch.update(doc.ref, { 
            reminders: recentReminders,
            updatedAt: new Date()
          });
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      await batch.commit();
    }

    logger.info(`Old reminders cleanup completed. Cleaned ${cleanedCount} appointments`);
  } catch (error) {
    logger.error("Error cleaning up old reminders", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
});