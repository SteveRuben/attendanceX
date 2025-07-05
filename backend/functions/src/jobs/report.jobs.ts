import {logger} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";
import {EmailService} from "../services/notification";
import {storage} from "../config";


const db = getFirestore();

/**
 * Génération des rapports quotidiens - 6h du matin
 */
export const generateDailyReports = onSchedule({
  schedule: "0 6 * * *",
  timeZone: "Europe/Paris",
  memory: "2GiB",
  timeoutSeconds: 300,
}, async (event) => {
  logger.info("📊 Generating daily reports");

  try {
    const results = await Promise.allSettled([
      generateAttendanceReport(),
      generateEventSummaryReport(),
      generateUserActivityReport(),
      generateNotificationReport(),
    ]);

    const summary = results.map((result, index) => ({
      report: ["attendance", "event_summary", "user_activity", "notifications"][index],
      status: result.status,
      ...(result.status === "fulfilled" && {data: result.value}),
      ...(result.status === "rejected" && {error: result.reason?.message}),
    }));

    logger.info("✅ Daily reports generated", {summary});
  } catch (error) {
    logger.error("❌ Daily report generation failed", {error});
  }
});

/**
 * Génération des rapports hebdomadaires - Lundi 7h du matin
 */
export const generateWeeklyReports = onSchedule({
  schedule: "0 7 * * 1",
  timeZone: "Europe/Paris",
  memory: "4GiB",
  timeoutSeconds: 540,
}, async (event) => {
  logger.info("📊 Generating weekly reports");

  try {
    const results = await Promise.allSettled([
      generateWeeklyAttendanceReport(),
      generateWeeklyEventReport(),
      generateWeeklyUserEngagementReport(),
      generateWeeklyPerformanceReport(),
      generateTrendAnalysisReport(),
    ]);

    // Envoyer les rapports aux administrateurs
    await sendReportsToAdmins(results);

    logger.info("✅ Weekly reports generated and sent");
  } catch (error) {
    logger.error("❌ Weekly report generation failed", {error});
  }
});

/**
 * Génération des rapports mensuels - 1er du mois à 8h
 */
export const generateMonthlyReports = onSchedule({
  schedule: "0 8 1 * *",
  timeZone: "Europe/Paris",
  memory: "8GiB",
  timeoutSeconds: 900,
}, async (event) => {
  logger.info("📊 Generating monthly reports");

  try {
    const results = await Promise.allSettled([
      generateMonthlyExecutiveSummary(),
      generateMonthlyTrendsReport(),
      generateMonthlyPerformanceReport(),
      generateMonthlyFinancialReport(),
      generateMonthlyUserGrowthReport(),
    ]);

    // Envoyer aux dirigeants
    await sendExecutiveReports(results);

    logger.info("✅ Monthly reports generated and sent");
  } catch (error) {
    logger.error("❌ Monthly report generation failed", {error});
  }
});

/**
 * Rapports en temps réel - Toutes les heures
 */
export const generateRealTimeReports = onSchedule({
  schedule: "0 * * * *",
  timeZone: "Europe/Paris",
  memory: "1GiB",
}, async (event) => {
  logger.info("⚡ Updating real-time reports");

  try {
    await Promise.allSettled([
      updateLiveEventDashboard(),
      updateAttendanceMetrics(),
      updateSystemHealthMetrics(),
      updateNotificationMetrics(),
    ]);

    logger.info("✅ Real-time reports updated");
  } catch (error) {
    logger.error("❌ Real-time report update failed", {error});
  }
});

// ===== FONCTIONS DE GÉNÉRATION DE RAPPORTS =====

async function generateAttendanceReport(): Promise<{ reportId: string; stats: any }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Récupérer les événements d'hier
  const eventsQuery = db.collection("events")
    .where("startDateTime", ">=", yesterday)
    .where("startDateTime", "<", today);

  const eventsSnapshot = await eventsQuery.get();

  const stats = {
    totalEvents: eventsSnapshot.size,
    totalParticipants: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    averageAttendanceRate: 0,
    eventDetails: [] as any[],
  };

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    // Récupérer les présences
    const attendanceQuery = db.collection("attendance")
      .where("eventId", "==", eventDoc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    const eventStats = {
      eventId: eventDoc.id,
      eventTitle: event.title,
      totalParticipants: event.participants.length,
      present: 0,
      absent: 0,
      late: 0,
      attendanceRate: 0,
    };

    attendanceSnapshot.docs.forEach((doc) => {
      const attendance = doc.data();
      switch (attendance.status) {
      case "present":
        eventStats.present++;
        break;
      case "absent":
        eventStats.absent++;
        break;
      case "late":
        eventStats.late++;
        eventStats.present++; // Comptés comme présents
        break;
      }
    });

    eventStats.attendanceRate = eventStats.totalParticipants > 0 ?
      Math.round((eventStats.present / eventStats.totalParticipants) * 100) :
      0;

    stats.totalParticipants += eventStats.totalParticipants;
    stats.totalPresent += eventStats.present;
    stats.totalAbsent += eventStats.absent;
    stats.totalLate += eventStats.late;
    stats.eventDetails.push(eventStats);
  }

  stats.averageAttendanceRate = stats.totalParticipants > 0 ?
    Math.round((stats.totalPresent / stats.totalParticipants) * 100) :
    0;

  // Sauvegarder le rapport
  const reportRef = await db.collection("reports").add({
    type: "daily_attendance",
    date: yesterday,
    stats,
    createdAt: new Date(),
    generatedBy: "system",
  });

  logger.info("📊 Daily attendance report generated", {
    reportId: reportRef.id,
    stats: {
      totalEvents: stats.totalEvents,
      averageAttendanceRate: stats.averageAttendanceRate,
    },
  });

  return {reportId: reportRef.id, stats};
}

async function generateEventSummaryReport(): Promise<{ reportId: string; summary: any }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  const eventsQuery = db.collection("events")
    .where("createdAt", ">=", yesterday)
    .where("createdAt", "<", today);

  const snapshot = await eventsQuery.get();

  const summary = {
    totalCreated: snapshot.size,
    byStatus: {} as any,
    byType: {} as any,
    totalParticipants: 0,
    averageParticipants: 0,
  };

  snapshot.docs.forEach((doc) => {
    const event = doc.data();

    // Compter par statut
    summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;

    // Compter par type
    summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;

    // Compter les participants
    summary.totalParticipants += event.participants?.length || 0;
  });

  summary.averageParticipants = summary.totalCreated > 0 ?
    Math.round(summary.totalParticipants / summary.totalCreated) :
    0;

  // Sauvegarder le rapport
  const reportRef = await db.collection("reports").add({
    type: "daily_event_summary",
    date: yesterday,
    summary,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, summary};
}

async function generateUserActivityReport(): Promise<{ reportId: string; activity: any }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Activité des utilisateurs
  const activity = {
    newUsers: 0,
    activeUsers: 0,
    totalLogins: 0,
    averageSessionDuration: 0,
    topActions: {} as any,
  };

  // Nouveaux utilisateurs
  const newUsersQuery = db.collection("users")
    .where("createdAt", ">=", yesterday)
    .where("createdAt", "<", today);

  const newUsersSnapshot = await newUsersQuery.get();
  activity.newUsers = newUsersSnapshot.size;

  // Sessions actives
  const sessionsQuery = db.collection("sessions")
    .where("lastActive", ">=", yesterday)
    .where("lastActive", "<", today);

  const sessionsSnapshot = await sessionsQuery.get();

  const uniqueUsers = new Set();
  let totalDuration = 0;

  sessionsSnapshot.docs.forEach((doc) => {
    const session = doc.data();
    uniqueUsers.add(session.userId);

    if (session.duration) {
      totalDuration += session.duration;
    }
  });

  activity.activeUsers = uniqueUsers.size;
  activity.totalLogins = sessionsSnapshot.size;
  activity.averageSessionDuration = sessionsSnapshot.size > 0 ?
    Math.round(totalDuration / sessionsSnapshot.size) :
    0;

  // Actions les plus fréquentes (si vous trackez les actions)
  const actionsQuery = db.collection("user_actions")
    .where("timestamp", ">=", yesterday)
    .where("timestamp", "<", today);

  const actionsSnapshot = await actionsQuery.get();

  actionsSnapshot.docs.forEach((doc) => {
    const action = doc.data();
    activity.topActions[action.type] = (activity.topActions[action.type] || 0) + 1;
  });

  // Sauvegarder le rapport
  const reportRef = await db.collection("reports").add({
    type: "daily_user_activity",
    date: yesterday,
    activity,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, activity};
}

async function generateNotificationReport(): Promise<{ reportId: string; metrics: any }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  const notificationsQuery = db.collection("notifications")
    .where("createdAt", ">=", yesterday)
    .where("createdAt", "<", today);

  const snapshot = await notificationsQuery.get();

  const metrics = {
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalClicked: 0,
    byChannel: {} as any,
    byType: {} as any,
    deliveryRate: 0,
    readRate: 0,
    clickRate: 0,
    averageDeliveryTime: 0,
  };

  let totalDeliveryTime = 0;
  let deliveryTimeCount = 0;

  snapshot.docs.forEach((doc) => {
    const notification = doc.data();

    if (notification.sent) metrics.totalSent++;
    if (notification.delivered) metrics.totalDelivered++;
    if (notification.read) metrics.totalRead++;
    if (notification.clicked) metrics.totalClicked++;

    // Par canal
    notification.channels?.forEach((channel: string) => {
      metrics.byChannel[channel] = (metrics.byChannel[channel] || 0) + 1;
    });

    // Par type
    metrics.byType[notification.type] = (metrics.byType[notification.type] || 0) + 1;

    // Temps de livraison
    if (notification.sentAt && notification.deliveredAt) {
      const deliveryTime = notification.deliveredAt.toDate().getTime() - notification.sentAt.toDate().getTime();
      totalDeliveryTime += deliveryTime;
      deliveryTimeCount++;
    }
  });

  // Calculer les taux
  metrics.deliveryRate = metrics.totalSent > 0 ?
    Math.round((metrics.totalDelivered / metrics.totalSent) * 100) :
    0;

  metrics.readRate = metrics.totalDelivered > 0 ?
    Math.round((metrics.totalRead / metrics.totalDelivered) * 100) :
    0;

  metrics.clickRate = metrics.totalRead > 0 ?
    Math.round((metrics.totalClicked / metrics.totalRead) * 100) :
    0;

  metrics.averageDeliveryTime = deliveryTimeCount > 0 ?
    Math.round(totalDeliveryTime / deliveryTimeCount / 1000) : // en secondes
    0;

  // Sauvegarder le rapport
  const reportRef = await db.collection("reports").add({
    type: "daily_notification_metrics",
    date: yesterday,
    metrics,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, metrics};
}

async function generateWeeklyAttendanceReport(): Promise<any> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const eventsQuery = db.collection("events")
    .where("startDateTime", ">=", startDate)
    .where("startDateTime", "<", endDate);

  const eventsSnapshot = await eventsQuery.get();

  const weeklyStats = {
    period: {start: startDate, end: endDate},
    totalEvents: eventsSnapshot.size,
    totalParticipants: 0,
    totalPresent: 0,
    averageAttendanceRate: 0,
    trendsFromLastWeek: {} as any,
    topPerformingEvents: [] as any[],
    attendanceByDay: {} as any,
    attendanceByEventType: {} as any,
  };

  // Initialiser les jours
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayKey = date.toISOString().split("T")[0];
    weeklyStats.attendanceByDay[dayKey] = {
      events: 0,
      participants: 0,
      present: 0,
      rate: 0,
    };
  }

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    const eventDate = event.startDateTime.toDate();
    const dayKey = eventDate.toISOString().split("T")[0];

    // Récupérer les présences
    const attendanceQuery = db.collection("attendance")
      .where("eventId", "==", eventDoc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    let presentCount = 0;
    attendanceSnapshot.docs.forEach((doc) => {
      const attendance = doc.data();
      if (["present", "late"].includes(attendance.status)) {
        presentCount++;
      }
    });

    const participantCount = event.participants?.length || 0;
    const attendanceRate = participantCount > 0 ? (presentCount / participantCount) * 100 : 0;

    // Statistiques globales
    weeklyStats.totalParticipants += participantCount;
    weeklyStats.totalPresent += presentCount;

    // Par jour
    if (weeklyStats.attendanceByDay[dayKey]) {
      weeklyStats.attendanceByDay[dayKey].events++;
      weeklyStats.attendanceByDay[dayKey].participants += participantCount;
      weeklyStats.attendanceByDay[dayKey].present += presentCount;
    }

    // Par type d'événement
    const eventType = event.type || "unknown";
    if (!weeklyStats.attendanceByEventType[eventType]) {
      weeklyStats.attendanceByEventType[eventType] = {
        events: 0,
        participants: 0,
        present: 0,
        rate: 0,
      };
    }
    weeklyStats.attendanceByEventType[eventType].events++;
    weeklyStats.attendanceByEventType[eventType].participants += participantCount;
    weeklyStats.attendanceByEventType[eventType].present += presentCount;

    // Top événements
    weeklyStats.topPerformingEvents.push({
      id: eventDoc.id,
      title: event.title,
      type: event.type,
      participants: participantCount,
      present: presentCount,
      rate: Math.round(attendanceRate),
    });
  }

  // Calculer les taux
  weeklyStats.averageAttendanceRate = weeklyStats.totalParticipants > 0 ?
    Math.round((weeklyStats.totalPresent / weeklyStats.totalParticipants) * 100) :
    0;

  // Calculer les taux par jour
  Object.keys(weeklyStats.attendanceByDay).forEach((day) => {
    const dayData = weeklyStats.attendanceByDay[day];
    dayData.rate = dayData.participants > 0 ?
      Math.round((dayData.present / dayData.participants) * 100) :
      0;
  });

  // Calculer les taux par type
  Object.keys(weeklyStats.attendanceByEventType).forEach((type) => {
    const typeData = weeklyStats.attendanceByEventType[type];
    typeData.rate = typeData.participants > 0 ?
      Math.round((typeData.present / typeData.participants) * 100) :
      0;
  });

  // Trier les top événements
  weeklyStats.topPerformingEvents.sort((a, b) => b.rate - a.rate);
  weeklyStats.topPerformingEvents = weeklyStats.topPerformingEvents.slice(0, 10);

  // Comparer avec la semaine précédente
  const previousWeekStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekQuery = db.collection("reports")
    .where("type", "==", "weekly_attendance")
    .where("period.start", ">=", previousWeekStart)
    .where("period.start", "<", startDate)
    .limit(1);

  const previousWeekSnapshot = await previousWeekQuery.get();
  if (!previousWeekSnapshot.empty) {
    const previousWeekData = previousWeekSnapshot.docs[0].data();
    weeklyStats.trendsFromLastWeek = {
      attendanceRateChange: weeklyStats.averageAttendanceRate - previousWeekData.averageAttendanceRate,
      eventsChange: weeklyStats.totalEvents - previousWeekData.totalEvents,
      participantsChange: weeklyStats.totalParticipants - previousWeekData.totalParticipants,
    };
  }

  // Sauvegarder le rapport
  const reportRef = await db.collection("reports").add({
    type: "weekly_attendance",
    period: {start: startDate, end: endDate},
    stats: weeklyStats,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, stats: weeklyStats};
}

async function generateWeeklyEventReport(): Promise<any> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stats = {
    period: {start: startDate, end: endDate},
    totalCreated: 0,
    totalCompleted: 0,
    totalCancelled: 0,
    averageParticipants: 0,
    eventsByStatus: {} as any,
    eventsByType: {} as any,
    organizerActivity: {} as any,
    completionRate: 0,
  };

  const eventsQuery = db.collection("events")
    .where("createdAt", ">=", startDate)
    .where("createdAt", "<", endDate);

  const snapshot = await eventsQuery.get();
  stats.totalCreated = snapshot.size;

  let totalParticipants = 0;

  snapshot.docs.forEach((doc) => {
    const event = doc.data();

    // Par statut
    stats.eventsByStatus[event.status] = (stats.eventsByStatus[event.status] || 0) + 1;

    // Par type
    stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

    // Activité des organisateurs
    stats.organizerActivity[event.organizerId] = (stats.organizerActivity[event.organizerId] || 0) + 1;

    // Compter les participants
    totalParticipants += event.participants?.length || 0;

    // Compter les complétés et annulés
    if (event.status === "completed") stats.totalCompleted++;
    if (event.status === "cancelled") stats.totalCancelled++;
  });

  stats.averageParticipants = stats.totalCreated > 0 ?
    Math.round(totalParticipants / stats.totalCreated) :
    0;

  stats.completionRate = stats.totalCreated > 0 ?
    Math.round((stats.totalCompleted / stats.totalCreated) * 100) :
    0;

  // Sauvegarder
  const reportRef = await db.collection("reports").add({
    type: "weekly_events",
    period: {start: startDate, end: endDate},
    stats,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, stats};
}

async function generateWeeklyUserEngagementReport(): Promise<any> {
  // Implementation similaire pour l'engagement utilisateur
  // ... code pour analyser l'activité des utilisateurs sur 7 jours
  return {reportId: "placeholder", stats: {}};
}

async function generateWeeklyPerformanceReport(): Promise<any> {
  // Implementation pour les performances système
  // ... code pour analyser les métriques de performance
  return {reportId: "placeholder", stats: {}};
}

async function generateTrendAnalysisReport(): Promise<any> {
  // Implementation pour l'analyse des tendances
  // ... code pour identifier les patterns et tendances
  return {reportId: "placeholder", stats: {}};
}

async function sendReportsToAdmins(reports: any[]): Promise<void> {
  const emailService = new EmailService();

  // Récupérer les administrateurs
  const adminsQuery = db.collection("users")
    .where("role", "in", ["admin", "super_admin"])
    .where("status", "==", "active");

  const adminsSnapshot = await adminsQuery.get();

  for (const adminDoc of adminsSnapshot.docs) {
    const admin = adminDoc.data();

    // Vérifier les préférences de notification
    if (admin.profile?.preferences?.emailNotifications !== false) {
      await emailService.sendWeeklyReportsEmail({
        to: admin.email,
        reports,
        adminName: admin.displayName,
      });
    }
  }
}

async function generateMonthlyExecutiveSummary(): Promise<any> {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);

  const summary = {
    period: {start: startDate, end: endDate},
    overview: {} as any,
    keyMetrics: {} as any,
    trends: {} as any,
    recommendations: [] as string[],
  };

  // Récupérer tous les événements du mois
  const eventsQuery = db.collection("events")
    .where("startDateTime", ">=", startDate)
    .where("startDateTime", "<", endDate);

  const eventsSnapshot = await eventsQuery.get();

  let totalParticipants = 0;
  let totalPresent = 0;
  const totalEvents = eventsSnapshot.size;

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    totalParticipants += event.participants?.length || 0;

    // Calculer présences
    const attendanceQuery = db.collection("attendance")
      .where("eventId", "==", eventDoc.id)
      .where("status", "in", ["present", "late"]);

    const attendanceSnapshot = await attendanceQuery.get();
    totalPresent += attendanceSnapshot.size;
  }

  summary.overview = {
    totalEvents,
    totalParticipants,
    totalPresent,
    overallAttendanceRate: totalParticipants > 0 ? Math.round((totalPresent / totalParticipants) * 100) : 0,
  };

  // Métriques clés
  summary.keyMetrics = {
    eventGrowth: await calculateEventGrowth(startDate, endDate),
    userGrowth: await calculateUserGrowth(startDate, endDate),
    engagementRate: await calculateEngagementRate(startDate, endDate),
    systemPerformance: await getSystemPerformanceMetrics(),
  };

  // Générer des recommandations basées sur les données
  if (summary.overview.overallAttendanceRate < 70) {
    summary.recommendations.push("Améliorer les stratégies de rappel pour augmenter le taux de présence");
  }

  if (summary.keyMetrics.eventGrowth < 0) {
    summary.recommendations.push("Analyser les causes de la baisse d'activité événementielle");
  }

  // Sauvegarder
  const reportRef = await db.collection("reports").add({
    type: "monthly_executive_summary",
    period: {start: startDate, end: endDate},
    summary,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, summary};
}

async function calculateEventGrowth(startDate: Date, endDate: Date): Promise<number> {
  const currentMonthEvents = await db.collection("events")
    .where("createdAt", ">=", startDate)
    .where("createdAt", "<", endDate)
    .get();

  const previousMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
  const previousMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const previousMonthEvents = await db.collection("events")
    .where("createdAt", ">=", previousMonthStart)
    .where("createdAt", "<", previousMonthEnd)
    .get();

  const currentCount = currentMonthEvents.size;
  const previousCount = previousMonthEvents.size;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

async function calculateUserGrowth(startDate: Date, endDate: Date): Promise<number> {
  const currentMonthUsers = await db.collection("users")
    .where("createdAt", ">=", startDate)
    .where("createdAt", "<", endDate)
    .get();

  const previousMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
  const previousMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  const previousMonthUsers = await db.collection("users")
    .where("createdAt", ">=", previousMonthStart)
    .where("createdAt", "<", previousMonthEnd)
    .get();

  const currentCount = currentMonthUsers.size;
  const previousCount = previousMonthUsers.size;

  return previousCount > 0 ? Math.round(((currentCount - previousCount) / previousCount) * 100) : 0;
}

async function calculateEngagementRate(startDate: Date, endDate: Date): Promise<number> {
  // Calculer le taux d'engagement basé sur l'activité utilisateur
  const sessionsQuery = db.collection("sessions")
    .where("createdAt", ">=", startDate)
    .where("createdAt", "<", endDate);

  const sessionsSnapshot = await sessionsQuery.get();
  const uniqueUsers = new Set();

  sessionsSnapshot.docs.forEach((doc) => {
    uniqueUsers.add(doc.data().userId);
  });

  const totalUsers = await db.collection("users").where("status", "==", "active").get();

  return totalUsers.size > 0 ? Math.round((uniqueUsers.size / totalUsers.size) * 100) : 0;
}

async function getSystemPerformanceMetrics(): Promise<any> {
  // Métriques de performance système
  return {
    uptime: 99.9, // À calculer depuis vos métriques de monitoring
    averageResponseTime: 250, // ms
    errorRate: 0.1, // %
    notificationDeliveryRate: 98.5, // %
  };
}

async function generateMonthlyTrendsReport(): Promise<any> {
  // Analyse des tendances mensuelles
  return {reportId: "trends-placeholder", trends: {}};
}

async function generateMonthlyPerformanceReport(): Promise<any> {
  // Rapport de performance mensuel
  return {reportId: "performance-placeholder", metrics: {}};
}

async function generateMonthlyFinancialReport(): Promise<any> {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);

  // Calculer les coûts SMS du mois
  const notificationsQuery = db.collection("notifications")
    .where("createdAt", ">=", startDate)
    .where("createdAt", "<", endDate)
    .where("channels", "array-contains", "sms");

  const notificationsSnapshot = await notificationsQuery.get();

  let totalSmsCost = 0;
  let totalSmsCount = 0;

  notificationsSnapshot.docs.forEach((doc) => {
    const notification = doc.data();
    if (notification.sendResults?.sms?.cost) {
      totalSmsCost += notification.sendResults.sms.cost;
      totalSmsCount++;
    }
  });

  const financialSummary = {
    period: {start: startDate, end: endDate},
    costs: {
      sms: {
        total: totalSmsCost,
        count: totalSmsCount,
        averageCost: totalSmsCount > 0 ? totalSmsCost / totalSmsCount : 0,
      },
      email: {
        total: 0, // À implémenter selon votre provider email
        count: 0,
      },
      storage: {
        total: 0, // À calculer depuis les métriques de stockage
      },
    },
    totalCosts: totalSmsCost,
    projectedNextMonth: totalSmsCost * 1.1, // Projection simple
  };

  const reportRef = await db.collection("reports").add({
    type: "monthly_financial",
    period: {start: startDate, end: endDate},
    financialSummary,
    createdAt: new Date(),
    generatedBy: "system",
  });

  return {reportId: reportRef.id, financialSummary};
}

async function generateMonthlyUserGrowthReport(): Promise<any> {
  // Rapport de croissance utilisateur mensuel
  return {reportId: "user-growth-placeholder", growth: {}};
}

async function sendExecutiveReports(reports: any[]): Promise<void> {
  const emailService = new EmailService();

  // Récupérer les dirigeants (super admin + role executive si vous en avez)
  const executivesQuery = db.collection("users")
    .where("role", "in", ["super_admin"])
    .where("status", "==", "active");

  const executivesSnapshot = await executivesQuery.get();

  for (const execDoc of executivesSnapshot.docs) {
    const executive = execDoc.data();

    await emailService.sendExecutiveMonthlyReport({
      to: executive.email,
      reports,
      executiveName: executive.displayName,
    });
  }
}

async function updateLiveEventDashboard(): Promise<void> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Événements en cours ou qui commencent bientôt
  const liveEventsQuery = db.collection("events")
    .where("startDateTime", ">=", oneHourAgo)
    .where("startDateTime", "<=", oneHourLater)
    .where("status", "in", ["published", "in_progress"]);

  const snapshot = await liveEventsQuery.get();

  const liveData = {
    activeEvents: [] as any[],
    totalActiveParticipants: 0,
    averageAttendanceRate: 0,
    lastUpdated: now,
  };

  for (const eventDoc of snapshot.docs) {
    const event = eventDoc.data();

    // Récupérer les présences en temps réel
    const attendanceQuery = db.collection("attendance")
      .where("eventId", "==", eventDoc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    let presentCount = 0;
    attendanceSnapshot.docs.forEach((doc) => {
      const attendance = doc.data();
      if (["present", "late"].includes(attendance.status)) {
        presentCount++;
      }
    });

    const participantCount = event.participants?.length || 0;
    const attendanceRate = participantCount > 0 ? (presentCount / participantCount) * 100 : 0;

    liveData.activeEvents.push({
      id: eventDoc.id,
      title: event.title,
      startDateTime: event.startDateTime,
      status: event.status,
      participants: participantCount,
      present: presentCount,
      attendanceRate: Math.round(attendanceRate),
    });

    liveData.totalActiveParticipants += presentCount;
  }

  liveData.averageAttendanceRate = liveData.activeEvents.length > 0 ?
    Math.round(liveData.activeEvents.reduce((sum, e) => sum + e.attendanceRate, 0) / liveData.activeEvents.length) :
    0;

  // Mettre à jour le dashboard en temps réel
  await db.collection("dashboard").doc("live_events").set(liveData);
}

async function updateAttendanceMetrics(): Promise<void> {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));

  // Métriques du jour en cours
  const todayEventsQuery = db.collection("events")
    .where("startDateTime", ">=", startOfDay)
    .where("startDateTime", "<", new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000));

  const eventsSnapshot = await todayEventsQuery.get();

  let totalTodayParticipants = 0;
  let totalTodayPresent = 0;

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    totalTodayParticipants += event.participants?.length || 0;

    const attendanceQuery = db.collection("attendance")
      .where("eventId", "==", eventDoc.id)
      .where("status", "in", ["present", "late"]);

    const attendanceSnapshot = await attendanceQuery.get();
    totalTodayPresent += attendanceSnapshot.size;
  }

  const metrics = {
    today: {
      events: eventsSnapshot.size,
      participants: totalTodayParticipants,
      present: totalTodayPresent,
      attendanceRate: totalTodayParticipants > 0 ? Math.round((totalTodayPresent / totalTodayParticipants) * 100) : 0,
    },
    lastUpdated: new Date(),
  };

  await db.collection("dashboard").doc("attendance_metrics").set(metrics);
}

async function updateSystemHealthMetrics(): Promise<void> {
  // Métriques de santé système (à adapter selon votre infrastructure)
  const healthMetrics = {
    database: {
      status: "healthy",
      responseTime: await measureDatabaseResponseTime(),
      connectionCount: 0, // À implémenter
    },
    storage: {
      status: "healthy",
      usage: await getStorageUsage(),
      quota: 1000, // GB par exemple
    },
    functions: {
      status: "healthy",
      executionCount: 0, // À récupérer des métriques Cloud Functions
      errorRate: 0,
    },
    lastUpdated: new Date(),
  };

  await db.collection("dashboard").doc("system_health").set(healthMetrics);
}

async function measureDatabaseResponseTime(): Promise<number> {
  const start = Date.now();
  await db.collection("health_check").doc("test").get();
  return Date.now() - start;
}

async function getStorageUsage(): Promise<number> {
  // Calculer l'utilisation du stockage
  try {
    const bucket = storage.bucket();
    const [files] = await bucket.getFiles({maxResults: 1000});

    let totalSize = 0;
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      totalSize += parseInt(String(metadata.size ?? "0"), 10) || 0;
    }

    return Math.round(totalSize / (1024 * 1024 * 1024)); // En GB
  } catch (error) {
    logger.error("Failed to calculate storage usage", {error});
    return 0;
  }
}

async function updateNotificationMetrics(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const notificationsQuery = db.collection("notifications")
    .where("createdAt", ">=", today)
    .where("createdAt", "<", tomorrow);

  const snapshot = await notificationsQuery.get();

  const metrics = {
    today: {
      total: snapshot.size,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      byChannel: {} as any,
    },
    lastUpdated: new Date(),
  };

  snapshot.docs.forEach((doc) => {
    const notification = doc.data();

    if (notification.sent) metrics.today.sent++;
    if (notification.delivered) metrics.today.delivered++;
    if (notification.read) metrics.today.read++;

    // Compter les échecs par canal
    Object.entries(notification.sendResults || {}).forEach(([channel, result]: [string, any]) => {
      if (!metrics.today.byChannel[channel]) {
        metrics.today.byChannel[channel] = {sent: 0, delivered: 0, failed: 0};
      }

      if (result.sent) {
        metrics.today.byChannel[channel].sent++;
      }
      if (result.delivered) {
        metrics.today.byChannel[channel].delivered++;
      }
      if (result.error) {
        metrics.today.byChannel[channel].failed++;
        metrics.today.failed++;
      }
    });
  });

  await db.collection("dashboard").doc("notification_metrics").set(metrics);
}
