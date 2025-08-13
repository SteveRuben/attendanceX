// =====================================================================
// TRIGGER UTILS - trigger.utils.ts
// Fonctions utilitaires partagées pour tous les triggers Firebase
// =====================================================================

import {firestore} from "firebase-admin";
import {
  AttendanceRecord,
  AttendanceStatus,
  NotificationChannel,
  NotificationPriority,
  NotificationType,
} from "@attendance-x/shared";

import {NotificationService} from "../services/notification";
import { collections } from "../config";

const db = firestore();
const notificationService = new NotificationService();


// =====================================================================
// FONCTIONS D'AUDIT ET LOGGING
// =====================================================================

/**
 * Créer un log d'audit pour toutes les actions importantes
 */
export async function createAuditLog(
  action: string,
  entityId: string,
  data: any,
  userId?: string,
  metadata?: any
): Promise<void> {
  try {
    const auditEntry = {
      action,
      entityId,
      data: typeof data === "object" ? data : {value: data},
      userId: userId || "system",
      timestamp: new Date(),
      source: "firestore_trigger",
      metadata: metadata || {},
      // Ajouter des informations contextuelles
      environment: process.env.APP_ENV || "development",
      version: process.env.APP_VERSION || "1.0.0",
    };

    await db.collection("audit_logs").add(auditEntry);
    console.log(`📝 Audit log created: ${action} for ${entityId}`);
  } catch (error) {
    console.error(`❌ Error creating audit log: ${error}`);
    // Ne pas faire échouer le trigger principal pour un problème d'audit
  }
}

/**
 * Obtenir les champs modifiés entre deux objets
 */
export function getChangedFields(before: any, after: any): Array<{
  field: string;
  oldValue: any;
  newValue: any;
}> {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  allKeys.forEach((key) => {
    const oldValue = before?.[key];
    const newValue = after?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  });

  return changes;
}

/**
 * Logger spécialisé pour les triggers avec formatage enrichi
 */
export class TriggerLogger {
  static info(triggerName: string, action: string, entityId: string, details?: any): void {
    console.log(`🔄 [${triggerName}] ${action}: ${entityId}`, details ? JSON.stringify(details, null, 2) : "");
  }

  static error(triggerName: string, action: string, entityId: string, error: any): void {
    console.error(`❌ [${triggerName}] Error in ${action} for ${entityId}:`, error);
  }

  static success(triggerName: string, action: string, entityId: string, result?: any): void {
    console.log(`✅ [${triggerName}] ${action} completed for ${entityId}`, result ? JSON.stringify(result, null, 2) : "");
  }

  static warning(triggerName: string, action: string, entityId: string, warning: string): void {
    console.warn(`⚠️ [${triggerName}] Warning in ${action} for ${entityId}: ${warning}`);
  }
}

// =====================================================================
// FONCTIONS UTILITAIRES POUR ÉVÉNEMENTS
// =====================================================================

/**
 * Mettre à jour les statistiques d'un événement
 */
export async function updateEventStatistics(eventId: string): Promise<void> {
  try {
    TriggerLogger.info("EventUtils", "updateStatistics", eventId);

    const attendances = await db.collection("attendances")
      .where("eventId", "==", eventId)
      .get();

    const attendanceData = attendances.docs.map((doc) => doc.data() as AttendanceRecord);

    const stats = {
      totalRegistered: attendanceData.length,
      totalPresent: attendanceData.filter((a) => a.status === AttendanceStatus.PRESENT).length,
      totalLate: attendanceData.filter((a) => a.status === AttendanceStatus.LATE).length,
      totalAbsent: attendanceData.filter((a) => a.status === AttendanceStatus.ABSENT).length,
      totalExcused: attendanceData.filter((a) => a.status === AttendanceStatus.EXCUSED).length,
      lastUpdated: new Date(),
      attendanceRate: 0,
      punctualityRate: 0,
      averageDelay: 0,
    };

    // Calculer les taux
    const totalActualAttendees = stats.totalPresent + stats.totalLate;
    stats.attendanceRate = stats.totalRegistered > 0 ?
      Math.round((totalActualAttendees / stats.totalRegistered) * 100 * 100) / 100 :
      0;

    stats.punctualityRate = totalActualAttendees > 0 ?
      Math.round((stats.totalPresent / totalActualAttendees) * 100 * 100) / 100 :
      100;

    // Calculer les retards moyens
    const lateAttendances = attendanceData.filter((a) => a.status === AttendanceStatus.LATE && a.delay);
    stats.averageDelay = lateAttendances.length > 0 ?
    // Calculate average delay in minutes, by defaulf is 0,a.delay
      Math.round(lateAttendances.reduce((sum, a) => sum + (a.delay || 0), 0) / lateAttendances.length) :
      0;

    await collections.events.doc(eventId).update({
      statistics: stats,
    });

    TriggerLogger.success("EventUtils", "updateStatistics", eventId, stats);
  } catch (error) {
    TriggerLogger.error("EventUtils", "updateStatistics", eventId, error);
    throw error;
  }
}

/**
 * Initialiser les statistiques d'un nouvel événement
 */
export async function initializeEventStatistics(eventId: string): Promise<void> {
  try {
    const initialStats = {
      totalRegistered: 0,
      totalPresent: 0,
      totalLate: 0,
      totalAbsent: 0,
      totalExcused: 0,
      attendanceRate: 0,
      punctualityRate: 100,
      averageDelay: 0,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    await collections.events.doc(eventId).update({
      statistics: initialStats,
    });

    TriggerLogger.success("EventUtils", "initializeStatistics", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "initializeStatistics", eventId, error);
  }
}

/**
 * Générer le QR code pour un événement
 */
export async function generateEventQRCode(eventId: string): Promise<void> {
  try {
    // URL de check-in pour l'événement
    const checkInUrl = `${process.env.APP_BASE_URL}/checkin/${eventId}`;

    // Générer le QR code (vous pouvez utiliser une librairie comme qrcode)
    const qrCodeData = {
      url: checkInUrl,
      eventId,
      type: "event_checkin",
      generatedAt: new Date(),
    };

    await collections.events.doc(eventId).update({
      qrCode: qrCodeData,
    });

    TriggerLogger.success("EventUtils", "generateQRCode", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "generateQRCode", eventId, error);
  }
}

/**
 * Programmer les rappels d'événement
 */
export async function scheduleEventReminders(eventId: string, event: any): Promise<void> {
  try {
    const eventDate = new Date(event.startTime);
    const now = new Date();

    // Rappels par défaut : 24h, 2h, 30min avant
    const reminderIntervals = [
      {hours: 24, type: "daily_reminder"},
      {hours: 2, type: "urgent_reminder"},
      {minutes: 30, type: "final_reminder"},
    ];

    for (const interval of reminderIntervals) {
      let reminderTime: Date;

      if (interval.hours) {
        reminderTime = new Date(eventDate.getTime() - (interval.hours * 60 * 60 * 1000));
      } else if (interval.minutes) {
        reminderTime = new Date(eventDate.getTime() - (interval.minutes * 60 * 1000));
      } else {
        continue;
      }

      // Ne programmer que les rappels futurs
      if (reminderTime > now) {
        await collections.scheduled_notifications.add({
          type: NotificationType.EVENT_REMINDER,
          eventId,
          scheduledFor: reminderTime,
          reminderType: interval.type,
          participants: event.participants || [],
          status: "scheduled",
          createdAt: new Date(),
        });
      }
    }

    TriggerLogger.success("EventUtils", "scheduleReminders", eventId);
  } catch (error) {
    TriggerLogger.error("EventUtils", "scheduleReminders", eventId, error);
  }
}

// =====================================================================
// FONCTIONS UTILITAIRES POUR UTILISATEURS
// =====================================================================

/**
 * Mettre à jour les statistiques de présence d'un utilisateur
 */
export async function updateUserAttendanceStats(userId: string): Promise<void> {
  try {
    TriggerLogger.info("UserUtils", "updateAttendanceStats", userId);

    const userAttendances = await db.collection("attendances")
      .where("userId", "==", userId)
      .get();

    const attendanceData = userAttendances.docs.map((doc) => doc.data() as AttendanceRecord);

    const stats = {
      totalEvents: attendanceData.length,
      totalPresent: attendanceData.filter((a) => a.status === AttendanceStatus.PRESENT).length,
      totalLate: attendanceData.filter((a) => a.status === AttendanceStatus.LATE).length,
      totalAbsent: attendanceData.filter((a) => a.status === AttendanceStatus.ABSENT).length,
      totalExcused: attendanceData.filter((a) => a.status === AttendanceStatus.EXCUSED).length,
      lastUpdated: new Date(),
      attendanceRate: 0,
      punctualityRate: 0,
      averageDelay: 0,
      currentStreak: 0,
      longestStreak: 0,
    };

    // Calculer les taux
    const totalActualAttendance = stats.totalPresent + stats.totalLate;
    stats.attendanceRate = stats.totalEvents > 0 ?
      Math.round((totalActualAttendance / stats.totalEvents) * 100 * 100) / 100 :
      0;

    stats.punctualityRate = totalActualAttendance > 0 ?
      Math.round((stats.totalPresent / totalActualAttendance) * 100 * 100) / 100 :
      100;

    // Calculer les retards moyens
    const lateAttendances = attendanceData.filter((a) => a.status === AttendanceStatus.LATE && a.delay);
    stats.averageDelay = lateAttendances.length > 0 ?
      Math.round(lateAttendances.reduce((sum, a) => sum + (a.delay || 0), 0) / lateAttendances.length) :
      0;

    // Calculer les streaks
    stats.currentStreak = calculateCurrentStreak(attendanceData);
    stats.longestStreak = calculateLongestStreak(attendanceData);

    await collections.users.doc(userId).update({
      attendanceStatistics: stats,
    });

    TriggerLogger.success("UserUtils", "updateAttendanceStats", userId, stats);
  } catch (error) {
    TriggerLogger.error("UserUtils", "updateAttendanceStats", userId, error);
  }
}

/**
 * Calculer la série actuelle de présences
 */
function calculateCurrentStreak(attendances: AttendanceRecord[]): number {
  if (attendances.length === 0) {return 0;}

  // Trier par date décroissante
  const sortedAttendances = attendances
    .sort((a, b) => new Date(b.checkInTime || 0).getTime() - new Date(a.checkInTime || 0).getTime());

  let streak = 0;
  for (const attendance of sortedAttendances) {
    if (attendance.status === AttendanceStatus.PRESENT || attendance.status === AttendanceStatus.LATE) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculer la plus longue série de présences
 */
function calculateLongestStreak(attendances: AttendanceRecord[]): number {
  if (attendances.length === 0) {return 0;}

  // Trier par date croissante
  const sortedAttendances = attendances
    .sort((a, b) => new Date(a.checkInTime || 0).getTime() - new Date(b.checkInTime || 0).getTime());

  let maxStreak = 0;
  let currentStreak = 0;

  for (const attendance of sortedAttendances) {
    if (attendance.status === AttendanceStatus.PRESENT || attendance.status === AttendanceStatus.LATE) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Initialiser le profil d'un nouvel utilisateur
 */
export async function initializeUserProfile(userId: string, user: any): Promise<void> {
  try {
    const initialProfile = {
      attendanceStatistics: {
        totalEvents: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
        totalExcused: 0,
        attendanceRate: 0,
        punctualityRate: 100,
        averageDelay: 0,
        currentStreak: 0,
        longestStreak: 0,
        createdAt: new Date(),
        lastUpdated: new Date(),
      },
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true,
          inApp: true,
        },
        reminders: {
          eventReminder24h: true,
          eventReminder2h: true,
          eventReminder30min: true,
        },
        privacy: {
          shareAttendanceStats: false,
          allowDataAnalytics: true,
        },
      },
      achievements: {},
      profile: {
        createdAt: new Date(),
        lastLoginAt: new Date(),
        profileCompleteness: calculateProfileCompleteness(user),
      },
    };

    await collections.users.doc(userId).update(initialProfile);
    TriggerLogger.success("UserUtils", "initializeProfile", userId);
  } catch (error) {
    TriggerLogger.error("UserUtils", "initializeProfile", userId, error);
  }
}

/**
 * Calculer le pourcentage de complétude du profil
 */
function calculateProfileCompleteness(user: any): number {
  const requiredFields = ["email", "firstName", "lastName", "department", "role"];
  const optionalFields = ["phone", "avatar", "bio", "preferredLanguage"];

  let completeness = 0;
  // @ts-ignore
  const totalFields = requiredFields.length + optionalFields.length;

  // Champs requis (60% du score)
  requiredFields.forEach((field) => {
    if (user[field]) {
      completeness += 60 / requiredFields.length;
    }
  });

  // Champs optionnels (40% du score)
  optionalFields.forEach((field) => {
    if (user[field]) {
      completeness += 40 / optionalFields.length;
    }
  });

  return Math.round(completeness);
}

// =====================================================================
// FONCTIONS UTILITAIRES POUR NOTIFICATIONS
// =====================================================================

/**
 * Envoyer une notification de confirmation de présence
 */
export async function sendAttendanceConfirmation(attendance: AttendanceRecord): Promise<void> {
  try {
    // Récupérer les informations de l'événement
    const eventDoc = await db.collection("events").doc(attendance.eventId).get();
    const eventData = eventDoc.data();

    if (!eventData) {
      TriggerLogger.warning("NotificationUtils", "sendAttendanceConfirmation", attendance.eventId, "Event not found");
      return;
    }

    const message = attendance.status === AttendanceStatus.PRESENT ?
      `Votre présence à "${eventData.title}" a été confirmée` :
      `Votre arrivée tardive à "${eventData.title}" a été enregistrée`;

    await notificationService.sendNotification({
      userId: attendance.userId,
      type: NotificationType.ATTENDANCE_CONFIRMATION,
      title: "Présence confirmée",
      message,
      data: {
        eventId: attendance.eventId,
        eventTitle: eventData.title,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        delay: attendance.delay || 0,
      },
      channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      priority: NotificationPriority.NORMAL,
    });

    TriggerLogger.success("NotificationUtils", "sendAttendanceConfirmation", attendance.userId);
  } catch (error) {
    TriggerLogger.error("NotificationUtils", "sendAttendanceConfirmation", attendance.userId, error);
  }
}

/**
 * Vérifier et attribuer des achievements
 */
export async function checkUserAchievements(userId: string): Promise<void> {
  try {
    const userDoc = await collections.users.doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {return;}

    const userAttendances = await db.collection("attendances")
      .where("userId", "==", userId)
      .where("status", "in", [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
      .get();

    const attendanceCount = userAttendances.size;
    const currentAchievements = userData.achievements || {};
    const newAchievements: string[] = [];

    // Définir les achievements basés sur le nombre de présences
    const achievementThresholds = [
      {count: 1, badge: "first_attendance", name: "Première présence"},
      {count: 5, badge: "getting_started", name: "Bon début"},
      {count: 10, badge: "regular_attendee", name: "Participant régulier"},
      {count: 25, badge: "committed_member", name: "Membre engagé"},
      {count: 50, badge: "dedicated_participant", name: "Participant dévoué"},
      {count: 100, badge: "attendance_champion", name: "Champion de la présence"},
      {count: 200, badge: "presence_master", name: "Maître de la présence"},
    ];

    // Vérifier les nouveaux achievements
    for (const achievement of achievementThresholds) {
      if (attendanceCount >= achievement.count && !currentAchievements[achievement.badge]) {
        currentAchievements[achievement.badge] = {
          unlockedAt: new Date(),
          name: achievement.name,
          description: `Atteint avec ${achievement.count} présences`,
        };
        newAchievements.push(achievement.badge);
      }
    }

    // Vérifier les achievements spéciaux (streaks, ponctualité, etc.)
    const stats = userData.attendanceStatistics;
    if (stats) {
      // Achievement pour ponctualité parfaite
      if (stats.punctualityRate === 100 && stats.totalEvents >= 10 && !currentAchievements.punctuality_perfect) {
        currentAchievements.punctuality_perfect = {
          unlockedAt: new Date(),
          name: "Ponctualité parfaite",
          description: "Aucun retard sur 10+ événements",
        };
        newAchievements.push("punctuality_perfect");
      }

      // Achievement pour série de présences
      if (stats.currentStreak >= 20 && !currentAchievements.streak_master) {
        currentAchievements.streak_master = {
          unlockedAt: new Date(),
          name: "Maître des séries",
          description: "20 présences consécutives",
        };
        newAchievements.push("streak_master");
      }
    }

    // Sauvegarder les nouveaux achievements
    if (newAchievements.length > 0) {
      await collections.users.doc(userId).update({
        achievements: currentAchievements,
      });

      // Notifier chaque nouvel achievement
      for (const badge of newAchievements) {
        const achievement = currentAchievements[badge];
        await notificationService.sendNotification({
          userId,
          type: NotificationType.ACHIEVEMENT_UNLOCKED,
          title: "Nouveau badge débloqué ! 🏆",
          message: `Félicitations ! Vous avez débloqué "${achievement.name}"`,
          data: {
            badge,
            achievement,
            totalAchievements: Object.keys(currentAchievements).length,
          },
          channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        });
      }

      TriggerLogger.success("AchievementUtils", "checkUserAchievements", userId, {newAchievements});
    }
  } catch (error) {
    TriggerLogger.error("AchievementUtils", "checkUserAchievements", userId, error);
  }
}

/**
 * Gérer les notifications d'arrivée tardive
 */
export async function handleLateArrival(attendance: AttendanceRecord): Promise<void> {
  try {
    const eventDoc = await collections.events.doc(attendance.eventId).get();
    const eventData = eventDoc.data();

    if (!eventData) {return;}

    // Notifier l'utilisateur
    await notificationService.sendNotification({
      userId: attendance.userId,
      type: NotificationType.LATE_ARRIVAL,
      title: "Arrivée en retard enregistrée",
      message: `Vous êtes arrivé ${attendance.delay}min en retard à "${eventData.title}"`,
      data: {
        eventId: attendance.eventId,
        eventTitle: eventData.title,
        delay: attendance.delay || 0,
      },
      channels: [NotificationChannel.IN_APP],
      priority: NotificationPriority.LOW,
    });

    // Notifier les organisateurs pour les retards significatifs (>15min)
    if (attendance.delay && attendance.delay > 15 && eventData.organizers) {
      const userDoc = await collections.users.doc(attendance.userId).get();
      const userData = userDoc.data();
      const userName = userData ? `${userData.firstName} ${userData.lastName}` : "Un participant";

      for (const organizerId of eventData.organizers) {
        await notificationService.sendNotification({
          userId: organizerId,
          type: NotificationType.SIGNIFICANT_DELAY,
          title: "Retard significatif détecté",
          message: `${userName} a ${attendance.delay}min de retard à "${eventData.title}"`,
          data: {
            eventId: attendance.eventId,
            eventTitle: eventData.title,
            userId: attendance.userId,
            userName,
            delay: attendance.delay,
          },
          channels: [NotificationChannel.IN_APP],
          priority: NotificationPriority.LOW,
        });
      }
    }

    TriggerLogger.success("NotificationUtils", "handleLateArrival", attendance.userId);
  } catch (error) {
    TriggerLogger.error("NotificationUtils", "handleLateArrival", attendance.userId, error);
  }
}

// =====================================================================
// FONCTIONS UTILITAIRES POUR RATE LIMITING
// =====================================================================

/**
 * Vérifier les limites de rate limiting pour les notifications
 */
export async function checkRateLimits(userId: string, notificationType: string): Promise<boolean> {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Compter les notifications envoyées dans la dernière heure
    const recentNotifications = await collections.notifications
      .where("userId", "==", userId)
      .where("type", "==", notificationType)
      .where("createdAt", ">=", oneHourAgo)
      .get();

    // Limites par type de notification (par heure)
    const limits: Record<string, number> = {
      [NotificationType.EVENT_REMINDER]: 5,
      [NotificationType.ATTENDANCE_CONFIRMATION]: 10,
      [NotificationType.ACHIEVEMENT_UNLOCKED]: 3,
      [NotificationType.LATE_ARRIVAL]: 5,
      default: 20,
    };

    const limit = limits[notificationType] || limits.default;
    const currentCount = recentNotifications.size;

    if (currentCount >= limit) {
      TriggerLogger.warning("RateLimit", "checkRateLimits", userId,
        `Rate limit exceeded: ${currentCount}/${limit} for ${notificationType}`);
      return false;
    }

    return true;
  } catch (error) {
    TriggerLogger.error("RateLimit", "checkRateLimits", userId, error);
    return true; // En cas d'erreur, on autorise l'envoi
  }
}

/**
 * Valider les données avant traitement
 */
export function validateTriggerData(data: any, requiredFields: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data) {
    errors.push("Data is null or undefined");
    return {isValid: false, errors};
  }

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      errors.push(`Required field missing: ${field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Fonction de retry avec backoff exponentiel
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Max retries exceeded");
}

/* export async function updateUserAttendanceStats(userId: string): Promise<void> {
  try {
    TriggerLogger.info("UserUtils", "updateAttendanceStats", userId);

    const userAttendances = await db.collection("attendances")
      .where("userId", "==", userId)
      .get();

    const attendanceData = userAttendances.docs.map((doc) => doc.data() as AttendanceRecord);

    const stats = {
      totalEvents: attendanceData.length,
      totalPresent: attendanceData.filter((a) => a.status === AttendanceStatus.PRESENT).length,
      totalLate: attendanceData.filter((a) => a.status === AttendanceStatus.LATE).length,
      totalAbsent: attendanceData.filter((a) => a.status === AttendanceStatus.ABSENT).length,
      totalExcused: attendanceData.filter((a) => a.status === AttendanceStatus.EXCUSED).length,
      lastUpdated: new Date(),
    };

    // Calculer les taux
    const totalActualAttendance = stats.totalPresent + stats.totalLate;
    stats.attendanceRate = stats.totalEvents > 0 ?
      Math.round((totalActualAttendance / stats.totalEvents) * 100 * 100) / 100 :
      0;

    stats.punctualityRate = totalActualAttendance > 0 ?
      Math.round((stats.totalPresent / totalActualAttendance) * 100 * 100) / 100 :
      100;

    // Calculer les retards moyens
    const lateAttendances = attendanceData.filter((a) => a.status === AttendanceStatus.LATE && a.delay);
    stats.averageDelay = lateAttendances.length > 0 ?
      Math.round(lateAttendances.reduce((sum, a) => sum + (a.delay || 0), 0) / lateAttendances.length) :
      0;

    // Calculer les streaks
    stats.currentStreak = calculateCurrentStreak(attendanceData);
    stats.longestStreak = calculateLongestStreak(attendanceData);

    await db.collection("users").doc(userId).update({
      attendanceStatistics: stats,
    });

    TriggerLogger.success("UserUtils", "updateAttendanceStats", userId, stats);
  } catch (error) {
    TriggerLogger.error("UserUtils", "updateAttendanceStats", userId, error);
  }
} */


// Export de toutes les fonctions utilitaires
export default {
  // Audit et logging
  createAuditLog,
  getChangedFields,
  TriggerLogger,

  // Event utils
  updateEventStatistics,
  initializeEventStatistics,
  generateEventQRCode,
  scheduleEventReminders,

  // User utils
  updateUserAttendanceStats,
  initializeUserProfile,

  // Notification utils
  sendAttendanceConfirmation,
  checkUserAchievements,
  handleLateArrival,

  // Rate limiting
  checkRateLimits,

  // Validation et retry
  validateTriggerData,
  retryWithBackoff,
};
