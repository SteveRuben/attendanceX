// ==========================================
// ANALYTICS JOBS - analytics.jobs.ts - PARTIE 1
// Configuration et fonctions principales d'analytics
// ==========================================

import {logger} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {MLService} from "../services/ml.service";
import { collections } from "../config";



/**
 * Traitement analytics quotidien - 5h du matin
 */
export const processAnalytics = onSchedule({
  schedule: "0 5 * * *",
  timeZone: "Europe/Paris",
  memory: "2GiB",
  timeoutSeconds: 540,
}, async (event) => {
  logger.info("📊 Processing daily analytics");

  try {
    const results = await Promise.allSettled([
      processUserBehaviorAnalytics(),
      processEventPerformanceAnalytics(),
      processAttendancePatterns(),
      processNotificationEffectiveness(),
      generatePredictiveInsights(),
    ]);

    const summary = results.map((result, index) => ({
      analytics: ["user_behavior", "event_performance", "attendance_patterns", "notification_effectiveness", "predictive_insights"][index],
      status: result.status,
      ...(result.status === "fulfilled" && {data: result.value}),
      ...(result.status === "rejected" && {error: result.reason?.message}),
    }));

    logger.info("✅ Daily analytics processing completed", {summary});
  } catch (error) {
    logger.error("❌ Analytics processing failed", {error});
  }
});

/**
 * Analyse de tendances - Toutes les 4 heures
 */
export const analyzeTrends = onSchedule({
  schedule: "0 */4 * * *",
  timeZone: "Europe/Paris",
  memory: "1GiB",
}, async (event) => {
  logger.info("📈 Analyzing trends");

  try {
    await Promise.allSettled([
      analyzeAttendanceTrends(),
      analyzeUserEngagementTrends(),
      analyzeEventPopularityTrends(),
      detectAnomalies(),
    ]);

    logger.info("✅ Trend analysis completed");
  } catch (error) {
    logger.error("❌ Trend analysis failed", {error});
  }
});

/**
 * Machine Learning et prédictions - 1h du matin
 */
export const runMLAnalysis = onSchedule({
  schedule: "0 1 * * *",
  timeZone: "Europe/Paris",
  memory: "4GiB",
  timeoutSeconds: 900,
}, async (event) => {
  logger.info("🤖 Running ML analysis");

  try {
    // @ts-ignore
    const mlService = new MLService();

    await Promise.allSettled([
      /*mlService.trainAttendancePredictionModel(),
      mlService.generatePersonalizedRecommendations(),
      mlService.detectChurnRisk(),
      mlService.optimizeNotificationTiming(),
      mlService.predictEventSuccess(),*/
    ]);

    logger.info("✅ ML analysis completed");
  } catch (error) {
    logger.error("❌ ML analysis failed", {error});
  }
});

/**
 * Génération d'insights - Toutes les 6 heures
 */
export const generateInsights = onSchedule({
  schedule: "0 */6 * * *",
  timeZone: "Europe/Paris",
  memory: "1GiB",
}, async (event) => {
  logger.info("💡 Generating insights");

  try {
    await Promise.allSettled([
      generateUserInsights(),
      generateEventInsights(),
      generateOrganizationInsights(),
      generateActionableRecommendations(),
    ]);

    logger.info("✅ Insights generation completed");
  } catch (error) {
    logger.error("❌ Insights generation failed", {error});
  }
});

// ===== FONCTIONS D'ANALYTICS PRINCIPALES =====

async function processUserBehaviorAnalytics(): Promise<any> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  // Analyser l'activité utilisateur
  const sessionsQuery = collections.user_sessions
    .where("createdAt", ">=", yesterday)
    .where("createdAt", "<", today);

  const sessionsSnapshot = await sessionsQuery.get();

  const userBehavior = {
    date: yesterday,
    totalSessions: sessionsSnapshot.size,
    uniqueUsers: new Set(sessionsSnapshot.docs.map((doc) => doc.data().userId)).size,
    averageSessionDuration: 0,
    bounceRate: 0,
    topPages: {} as any,
    deviceTypes: {} as any,
    peakHours: {} as any,
  };

  let totalDuration = 0;
  let bouncedSessions = 0;

  // Initialiser les heures
  for (let hour = 0; hour < 24; hour++) {
    userBehavior.peakHours[hour] = 0;
  }

  sessionsSnapshot.docs.forEach((doc) => {
    const session = doc.data();

    // Durée de session
    if (session.duration) {
      totalDuration += session.duration;
    }

    // Bounce rate (sessions < 30 secondes)
    if (!session.duration || session.duration < 30) {
      bouncedSessions++;
    }

    // Pages visitées
    if (session.pages) {
      session.pages.forEach((page: string) => {
        userBehavior.topPages[page] = (userBehavior.topPages[page] || 0) + 1;
      });
    }

    // Type d'appareil
    const deviceType = session.deviceType || "unknown";
    userBehavior.deviceTypes[deviceType] = (userBehavior.deviceTypes[deviceType] || 0) + 1;

    // Heures de pic
    const hour = session.createdAt.toDate().getHours();
    userBehavior.peakHours[hour]++;
  });

  userBehavior.averageSessionDuration = userBehavior.totalSessions > 0 ?
    Math.round(totalDuration / userBehavior.totalSessions) :
    0;

  userBehavior.bounceRate = userBehavior.totalSessions > 0 ?
    Math.round((bouncedSessions / userBehavior.totalSessions) * 100) :
    0;

  // Sauvegarder l'analyse
  await collections.analytics.doc(`user_behavior_${yesterday.toISOString().split("T")[0]}`).set({
    type: "user_behavior",
    date: yesterday,
    data: userBehavior,
    createdAt: new Date(),
  });

  return userBehavior;
}

async function processEventPerformanceAnalytics(): Promise<any> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("endDateTime", ">=", last30Days)
    .where("status", "==", "completed");

  const eventsSnapshot = await eventsQuery.get();

  const performance = {
    period: {start: last30Days, end: new Date()},
    totalEvents: eventsSnapshot.size,
    performanceMetrics: {} as any,
    topPerformers: [] as any[],
    underperformers: [] as any[],
    avgMetrics: {} as any,
  };

  let totalAttendanceRate = 0;
  let totalRating = 0;
  let totalEngagement = 0;
  let eventsWithRating = 0;

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    // Calculer les métriques pour chaque événement
    const attendanceQuery = collections.attendances
      .where("eventId", "==", eventDoc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    let presentCount = 0;
    let totalRatings = 0;
    let ratingSum = 0;

    attendanceSnapshot.docs.forEach((doc) => {
      const attendance = doc.data();

      if (["present", "late"].includes(attendance.status)) {
        presentCount++;
      }

      if (attendance.feedback?.rating) {
        ratingSum += attendance.feedback.rating;
        totalRatings++;
      }
    });

    const participantCount = event.participants?.length || 0;
    const attendanceRate = participantCount > 0 ? (presentCount / participantCount) * 100 : 0;
    const avgRating = totalRatings > 0 ? ratingSum / totalRatings : 0;
    const engagement = totalRatings / Math.max(presentCount, 1) * 100; // % qui ont donné feedback

    const eventMetrics = {
      id: eventDoc.id,
      title: event.title,
      type: event.type,
      attendanceRate: Math.round(attendanceRate),
      avgRating: Math.round(avgRating * 10) / 10,
      engagement: Math.round(engagement),
      participantCount,
      presentCount,
      feedbackCount: totalRatings,
    };

    performance.performanceMetrics[eventDoc.id] = eventMetrics;

    // Accumulation pour moyennes globales
    totalAttendanceRate += attendanceRate;
    if (avgRating > 0) {
      totalRating += avgRating;
      eventsWithRating++;
    }
    totalEngagement += engagement;

    // Identifier les top performers et underperformers
    if (attendanceRate >= 80 && avgRating >= 4) {
      performance.topPerformers.push(eventMetrics);
    } else if (attendanceRate < 50 || avgRating < 3) {
      performance.underperformers.push(eventMetrics);
    }
  }

  // Calculer les moyennes
  performance.avgMetrics = {
    attendanceRate: performance.totalEvents > 0 ? Math.round(totalAttendanceRate / performance.totalEvents) : 0,
    rating: eventsWithRating > 0 ? Math.round((totalRating / eventsWithRating) * 10) / 10 : 0,
    engagement: performance.totalEvents > 0 ? Math.round(totalEngagement / performance.totalEvents) : 0,
  };

  // Trier les listes
  performance.topPerformers.sort((a, b) => (b.attendanceRate + b.avgRating * 20) - (a.attendanceRate + a.avgRating * 20));
  performance.underperformers.sort((a, b) => (a.attendanceRate + a.avgRating * 20) - (b.attendanceRate + b.avgRating * 20));

  // Limiter à 10 chacun
  performance.topPerformers = performance.topPerformers.slice(0, 10);
  performance.underperformers = performance.underperformers.slice(0, 10);

  // Sauvegarder
  await collections.analytics.doc("event_performance_30d").set({
    type: "event_performance",
    period: performance.period,
    data: performance,
    createdAt: new Date(),
  });

  return performance;
}

async function processAttendancePatterns(): Promise<any> {
  const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const attendanceQuery = collections.attendances
    .where("createdAt", ">=", last90Days);

  const attendanceSnapshot = await attendanceQuery.get();

  const patterns = {
    period: {start: last90Days, end: new Date()},
    byDayOfWeek: {} as any,
    byTimeOfDay: {} as any,
    byEventType: {} as any,
    byWeather: {} as any, // Si vous trackez la météo
    seasonalTrends: {} as any,
    userPatterns: {} as any,
  };

  // Initialiser les structures
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  daysOfWeek.forEach((day) => {
    patterns.byDayOfWeek[day] = {total: 0, present: 0, rate: 0};
  });

  for (let hour = 0; hour < 24; hour++) {
    patterns.byTimeOfDay[hour] = {total: 0, present: 0, rate: 0};
  }

  // Analyser chaque enregistrement de présence
  for (const attendanceDoc of attendanceSnapshot.docs) {
    const attendance = attendanceDoc.data();

    // Récupérer l'événement associé
    const eventDoc = await collections.events.doc(attendance.eventId).get();
    if (!eventDoc.exists) {continue;}

    const event = eventDoc.data()!;
    const eventDate = event.startDateTime.toDate();
    const dayOfWeek = daysOfWeek[eventDate.getDay()];
    const hour = eventDate.getHours();
    const eventType = event.type || "unknown";

    const isPresent = ["present", "late"].includes(attendance.status);

    // Par jour de la semaine
    patterns.byDayOfWeek[dayOfWeek].total++;
    if (isPresent) {patterns.byDayOfWeek[dayOfWeek].present++;}

    // Par heure
    patterns.byTimeOfDay[hour].total++;
    if (isPresent) {patterns.byTimeOfDay[hour].present++;}

    // Par type d'événement
    if (!patterns.byEventType[eventType]) {
      patterns.byEventType[eventType] = {total: 0, present: 0, rate: 0};
    }
    patterns.byEventType[eventType].total++;
    if (isPresent) {patterns.byEventType[eventType].present++;}

    // Patterns utilisateur individuels
    const userId = attendance.userId;
    if (!patterns.userPatterns[userId]) {
      patterns.userPatterns[userId] = {
        totalEvents: 0,
        attended: 0,
        lateCount: 0,
        reliability: 0,
        preferredTimes: {} as any,
      };
    }

    patterns.userPatterns[userId].totalEvents++;
    if (isPresent) {patterns.userPatterns[userId].attended++;}
    if (attendance.status === "late") {patterns.userPatterns[userId].lateCount++;}

    // Heures préférées de l'utilisateur
    if (isPresent) {
      const timeSlot = Math.floor(hour / 4) * 4; // Créneaux de 4h
      patterns.userPatterns[userId].preferredTimes[timeSlot] =
        (patterns.userPatterns[userId].preferredTimes[timeSlot] || 0) + 1;
    }
  }

  // Calculer les taux
  Object.keys(patterns.byDayOfWeek).forEach((day) => {
    const data = patterns.byDayOfWeek[day];
    data.rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
  });

  Object.keys(patterns.byTimeOfDay).forEach((hour) => {
    const data = patterns.byTimeOfDay[hour];
    data.rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
  });

  Object.keys(patterns.byEventType).forEach((type) => {
    const data = patterns.byEventType[type];
    data.rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
  });

  // Calculer la fiabilité des utilisateurs
  Object.keys(patterns.userPatterns).forEach((userId) => {
    const userData = patterns.userPatterns[userId];
    userData.reliability = userData.totalEvents > 0 ?
      Math.round((userData.attended / userData.totalEvents) * 100) :
      0;
  });

  // Identifier les insights
  const insights = {
    bestDayForAttendance: Object.entries(patterns.byDayOfWeek)
      .sort(([, a], [, b]) => (b as any).rate - (a as any).rate)[0][0],
    bestTimeForAttendance: Object.entries(patterns.byTimeOfDay)
      .sort(([, a], [, b]) => (b as any).rate - (a as any).rate)[0][0],
    mostReliableEventType: Object.entries(patterns.byEventType)
      .sort(([, a], [, b]) => (b as any).rate - (a as any).rate)[0]?.[0] || "N/A",
      // @ts-ignore
    averageReliability: Object.values(patterns.userPatterns)
      .reduce((sum: number, user: any) => sum + (Number(user.reliability) || 0), 0) /
      Math.max(Object.keys(patterns.userPatterns).length, 1),
  };

  // Sauvegarder
  await collections.analytics.doc("attendance_patterns_90d").set({
    type: "attendance_patterns",
    period: patterns.period,
    data: patterns,
    insights,
    createdAt: new Date(),
  });

  return {patterns, insights};
}

async function processNotificationEffectiveness(): Promise<any> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const notificationsQuery = collections.notifications
    .where("createdAt", ">=", last30Days);

  const notificationsSnapshot = await notificationsQuery.get();

  const effectiveness = {
    period: {start: last30Days, end: new Date()},
    overall: {
      total: notificationsSnapshot.size,
      sent: 0,
      delivered: 0,
      read: 0,
      clicked: 0,
      deliveryRate: 0,
      readRate: 0,
      clickRate: 0,
    },
    byChannel: {} as any,
    byType: {} as any,
    byTimeOfDay: {} as any,
    optimalTiming: {} as any,
  };

  // Initialiser les heures
  for (let hour = 0; hour < 24; hour++) {
    effectiveness.byTimeOfDay[hour] = {
      sent: 0,
      delivered: 0,
      read: 0,
      clicked: 0,
      readRate: 0,
    };
  }

  notificationsSnapshot.docs.forEach((doc) => {
    const notification = doc.data();

    // Statistiques globales
    if (notification.sent) {effectiveness.overall.sent++;}
    if (notification.delivered) {effectiveness.overall.delivered++;}
    if (notification.read) {effectiveness.overall.read++;}
    if (notification.clicked) {effectiveness.overall.clicked++;}

    // Par canal
    notification.channels?.forEach((channel: string) => {
      if (!effectiveness.byChannel[channel]) {
        effectiveness.byChannel[channel] = {
          sent: 0, delivered: 0, read: 0, clicked: 0,
          deliveryRate: 0, readRate: 0, clickRate: 0,
        };
      }

      const channelResult = notification.sendResults?.[channel];
      if (channelResult?.sent) {effectiveness.byChannel[channel].sent++;}
      if (channelResult?.delivered) {effectiveness.byChannel[channel].delivered++;}
      if (notification.read) {effectiveness.byChannel[channel].read++;}
      if (notification.clicked) {effectiveness.byChannel[channel].clicked++;}
    });

    // Par type
    const type = notification.type || "unknown";
    if (!effectiveness.byType[type]) {
      effectiveness.byType[type] = {
        sent: 0, delivered: 0, read: 0, clicked: 0,
        deliveryRate: 0, readRate: 0, clickRate: 0,
      };
    }

    if (notification.sent) {effectiveness.byType[type].sent++;}
    if (notification.delivered) {effectiveness.byType[type].delivered++;}
    if (notification.read) {effectiveness.byType[type].read++;}
    if (notification.clicked) {effectiveness.byType[type].clicked++;}

    // Par heure d'envoi
    if (notification.sentAt) {
      const hour = notification.sentAt.toDate().getHours();
      effectiveness.byTimeOfDay[hour].sent++;
      if (notification.delivered) {effectiveness.byTimeOfDay[hour].delivered++;}
      if (notification.read) {effectiveness.byTimeOfDay[hour].read++;}
      if (notification.clicked) {effectiveness.byTimeOfDay[hour].clicked++;}
    }
  });

  // Calculer les taux globaux
  effectiveness.overall.deliveryRate = effectiveness.overall.sent > 0 ?
    Math.round((effectiveness.overall.delivered / effectiveness.overall.sent) * 100) : 0;
  effectiveness.overall.readRate = effectiveness.overall.delivered > 0 ?
    Math.round((effectiveness.overall.read / effectiveness.overall.delivered) * 100) : 0;
  effectiveness.overall.clickRate = effectiveness.overall.read > 0 ?
    Math.round((effectiveness.overall.clicked / effectiveness.overall.read) * 100) : 0;

  // Calculer les taux par canal
  Object.keys(effectiveness.byChannel).forEach((channel) => {
    const data = effectiveness.byChannel[channel];
    data.deliveryRate = data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0;
    data.readRate = data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0;
    data.clickRate = data.read > 0 ? Math.round((data.clicked / data.read) * 100) : 0;
  });

  // Calculer les taux par type
  Object.keys(effectiveness.byType).forEach((type) => {
    const data = effectiveness.byType[type];
    data.deliveryRate = data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0;
    data.readRate = data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0;
    data.clickRate = data.read > 0 ? Math.round((data.clicked / data.read) * 100) : 0;
  });

  // Calculer les taux par heure
  Object.keys(effectiveness.byTimeOfDay).forEach((hour) => {
    const data = effectiveness.byTimeOfDay[hour];
    data.readRate = data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0;
  });

  // Identifier les heures optimales
  const sortedHours = Object.entries(effectiveness.byTimeOfDay)
    .filter(([, data]) => (data as any).sent >= 5) // Minimum 5 notifications
    .sort(([, a], [, b]) => (b as any).readRate - (a as any).readRate);

  effectiveness.optimalTiming = {
    bestHour: sortedHours[0]?.[0] || "9",
    // @ts-ignore
    bestReadRate: sortedHours[0]?.[1]?.readRate || 0,
    recommendedTimeSlots: sortedHours.slice(0, 3).map(([hour, data]) => ({
      hour: parseInt(hour),
      readRate: (data as any).readRate,
    })),
  };

  // Sauvegarder
  await collections.analytics.doc("notification_effectiveness_30d").set({
    type: "notification_effectiveness",
    period: effectiveness.period,
    data: effectiveness,
    createdAt: new Date(),
  });

  return effectiveness;
}


async function generatePredictiveInsights(): Promise<any> {
  // Générer des insights prédictifs basés sur les données historiques
  const insights = {
    attendancePredictions: await predictAttendanceRates(),
    churnRiskUsers: await identifyChurnRisk(),
    optimalEventTiming: await findOptimalEventTiming(),
    capacityRecommendations: await generateCapacityRecommendations(),
    engagementForecasts: await forecastUserEngagement(),
  };

  await collections.analytics.doc("predictive_insights").set({
    type: "predictive_insights",
    data: insights,
    generatedAt: new Date(),
  });

  return insights;
}

type PredictionEntry = {
  predicted: number;
  confidence: number;
  sampleSize: number;
};

async function predictAttendanceRates(): Promise<any> {
  // Analyse des patterns d'attendance pour prédire les taux futurs
  const last6Months = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("endDateTime", ">=", last6Months)
    .where("status", "==", "completed");

  const eventsSnapshot = await eventsQuery.get();

  const patterns = {
    byDayOfWeek: {} as any,
    byEventType: {} as any,
    byTimeOfDay: {} as any,
    seasonal: {} as any,
  };

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    const eventDate = event.startDateTime.toDate();

    // Calculer le taux de présence
    const attendanceQuery = collections.attendances
      .where("eventId", "==", eventDoc.id)
      .where("status", "in", ["present", "late"]);

    const attendanceSnapshot = await attendanceQuery.get();
    const attendanceRate = event.participants?.length > 0 ?
      (attendanceSnapshot.size / event.participants.length) * 100 :
      0;

    // Grouper par patterns
    const dayOfWeek = eventDate.getDay();
    const hour = eventDate.getHours();
    const month = eventDate.getMonth();
    const eventType = event.type;

    // Accumulation des données
    if (!patterns.byDayOfWeek[dayOfWeek]) {patterns.byDayOfWeek[dayOfWeek] = [];}
    patterns.byDayOfWeek[dayOfWeek].push(attendanceRate);

    if (!patterns.byEventType[eventType]) {patterns.byEventType[eventType] = [];}
    patterns.byEventType[eventType].push(attendanceRate);

    const timeSlot = Math.floor(hour / 4);
    if (!patterns.byTimeOfDay[timeSlot]) {patterns.byTimeOfDay[timeSlot] = [];}
    patterns.byTimeOfDay[timeSlot].push(attendanceRate);

    if (!patterns.seasonal[month]) {patterns.seasonal[month] = [];}
    patterns.seasonal[month].push(attendanceRate);
  }

  // Calculer les moyennes et prédictions
  /* const predictions = {
    byDayOfWeek: {},
    byEventType: {},
    byTimeOfDay: {},
    seasonal: {},
    confidence: 0,
  }; */
  const predictions: {
  byDayOfWeek: { [key: string]: PredictionEntry };
  byEventType: { [key: string]: PredictionEntry };
  byTimeOfDay: { [key: string]: PredictionEntry };
  seasonal: { [key: string]: PredictionEntry };
  confidence: number;
} = {
  byDayOfWeek: {},
  byEventType: {},
  byTimeOfDay: {},
  seasonal: {},
  confidence: 0,
};

  Object.keys(patterns.byDayOfWeek).forEach((day) => {
    const rates = patterns.byDayOfWeek[day];
    predictions.byDayOfWeek[day] = {
      predicted: rates.reduce((sum: number, rate: number) => sum + rate, 0) / rates.length,
      confidence: Math.min(rates.length / 10, 1), // Plus d'événements = plus de confiance
      sampleSize: rates.length,
    };
  });

  Object.keys(patterns.byEventType).forEach((type) => {
    const rates = patterns.byEventType[type];
    predictions.byEventType[type] = {
      predicted: rates.reduce((sum: number, rate: number) => sum + rate, 0) / rates.length,
      confidence: Math.min(rates.length / 10, 1),
      sampleSize: rates.length,
    };
  });

  return predictions;
}

async function identifyChurnRisk(): Promise<any> {
  // Identifier les utilisateurs à risque de désengagement
  const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const usersQuery = collections.users
    .where("status", "==", "active");

  const usersSnapshot = await usersQuery.get();
  const churnRiskUsers = [];

  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data();

    // Analyser l'activité récente
    const recentEventsQuery = collections.events
      .where("participants", "array-contains", userDoc.id)
      .where("startDateTime", ">=", last90Days);

    const recentEventsSnapshot = await recentEventsQuery.get();

    const recentAttendanceQuery = collections.attendances
      .where("userId", "==", userDoc.id)
      .where("createdAt", ">=", last90Days);

    const recentAttendanceSnapshot = await recentAttendanceQuery.get();

    // Calculer les indicateurs de risque
    const eventsInvited = recentEventsSnapshot.size;
    const eventsAttended = recentAttendanceSnapshot.docs.filter((doc) =>
      ["present", "late"].includes(doc.data().status)
    ).length;

    const attendanceRate = eventsInvited > 0 ? (eventsAttended / eventsInvited) * 100 : 0;
    const daysSinceLastActivity = user.lastLoginAt ?
      Math.floor((Date.now() - user.lastLoginAt.toDate().getTime()) / (24 * 60 * 60 * 1000)) :
      999;

    // Score de risque (0-100, 100 = très haut risque)
    let riskScore = 0;

    if (attendanceRate < 50) {riskScore += 30;}
    if (daysSinceLastActivity > 30) {riskScore += 25;}
    if (daysSinceLastActivity > 60) {riskScore += 25;}
    if (eventsInvited === 0) {riskScore += 20;}

    if (riskScore >= 50) {
      churnRiskUsers.push({
        userId: userDoc.id,
        email: user.email,
        displayName: user.displayName,
        riskScore,
        attendanceRate: Math.round(attendanceRate),
        daysSinceLastActivity,
        eventsInvited,
        eventsAttended,
        recommendations: generateChurnPreventionRecommendations(riskScore, attendanceRate, daysSinceLastActivity),
      });
    }
  }

  // Trier par score de risque décroissant
  churnRiskUsers.sort((a, b) => b.riskScore - a.riskScore);

  return {
    totalAtRisk: churnRiskUsers.length,
    highRisk: churnRiskUsers.filter((u) => u.riskScore >= 75),
    mediumRisk: churnRiskUsers.filter((u) => u.riskScore >= 50 && u.riskScore < 75),
    users: churnRiskUsers.slice(0, 50), // Top 50 à risque
  };
}

function generateChurnPreventionRecommendations(riskScore: number, attendanceRate: number, daysSinceLastActivity: number): string[] {
  const recommendations = [];

  if (attendanceRate < 30) {
    recommendations.push("Contacter personnellement pour comprendre les obstacles à la participation");
    recommendations.push("Proposer des événements plus adaptés à ses préférences");
  }

  if (daysSinceLastActivity > 60) {
    recommendations.push("Envoyer un email de réengagement avec les highlights récents");
    recommendations.push("Offrir un incitatif pour revenir (événement spécial, formation gratuite)");
  }

  if (riskScore >= 75) {
    recommendations.push("Intervention immédiate requise");
    recommendations.push("Appel téléphonique de l'équipe support");
  }

  return recommendations;
}

async function findOptimalEventTiming(): Promise<any> {
  // Analyser les données pour trouver les créneaux optimaux
  // @ts-ignore
  const last6Months = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  // Cette analyse combine les taux de présence et la satisfaction
  const timingAnalysis: {
    optimalDays: string[];
    optimalHours: number[];
    avoidDays: string[];
    avoidHours: number[];
    seasonalRecommendations: Record<string, any>;
  } = {
    optimalDays: [],
    optimalHours: [],
    avoidDays: [],
    avoidHours: [],
    seasonalRecommendations: {},
  };

  // Récupérer les données d'attendance patterns
  const patternsDoc = await collections.analytics.doc("attendance_patterns_90d").get();

  if (patternsDoc.exists) {
    const patterns = patternsDoc.data()?.data;

    // Identifier les meilleurs jours
    const dayRates = Object.entries(patterns.byDayOfWeek)
      .map(([day, data]: [string, any]) => ({day, rate: data.rate}))
      .sort((a, b) => b.rate - a.rate);

    timingAnalysis.optimalDays = dayRates.slice(0, 3).map((d) => d.day);
    timingAnalysis.avoidDays = dayRates.slice(-2).map((d) => d.day);

    // Identifier les meilleures heures
    const hourRates = Object.entries(patterns.byTimeOfDay)
      .map(([hour, data]: [string, any]) => ({hour: parseInt(hour), rate: data.rate}))
      .filter((h) => h.rate > 0)
      .sort((a, b) => b.rate - a.rate);

    timingAnalysis.optimalHours = hourRates.slice(0, 3).map((h) => h.hour);
    timingAnalysis.avoidHours = hourRates.slice(-3).map((h) => h.hour);
  }

  return timingAnalysis;
}

async function generateCapacityRecommendations(): Promise<any> {
  // Analyser les tendances de participation pour recommander les capacités
  const last3Months = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("startDateTime", ">=", last3Months);

  const eventsSnapshot = await eventsQuery.get();

  const capacityAnalysis = {
    byEventType: {} as any,
    overallRecommendations: {},
    seasonalAdjustments: {},
  };

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    const eventType = event.type;
    const maxParticipants = event.maxParticipants || event.participants?.length || 0;
    const actualParticipants = event.participants?.length || 0;

    // Calculer le taux de remplissage
    // @ts-ignore
    const fillRate = maxParticipants > 0 ? (actualParticipants / maxParticipants) * 100 : 0;

    if (!capacityAnalysis.byEventType[eventType]) {
      capacityAnalysis.byEventType[eventType] = {
        events: 0,
        totalCapacity: 0,
        totalParticipants: 0,
        avgFillRate: 0,
        recommendedCapacity: 0,
      };
    }

    const typeData = capacityAnalysis.byEventType[eventType];
    typeData.events++;
    typeData.totalCapacity += maxParticipants;
    typeData.totalParticipants += actualParticipants;
  }

  // Calculer les recommandations
  Object.keys(capacityAnalysis.byEventType).forEach((type) => {
    const data = capacityAnalysis.byEventType[type];
    data.avgFillRate = data.totalCapacity > 0 ?
      Math.round((data.totalParticipants / data.totalCapacity) * 100) :
      0;

    // Recommander une capacité basée sur la participation moyenne + marge
    const avgParticipants = data.events > 0 ? data.totalParticipants / data.events : 0;
    data.recommendedCapacity = Math.ceil(avgParticipants * 1.2); // 20% de marge
  });

  return capacityAnalysis;
}

async function forecastUserEngagement(): Promise<any> {
  // Prévoir l'engagement des utilisateurs pour les prochains mois
  const last6Months = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const sessionsQuery = collections.user_sessions
    .where("createdAt", ">=", last6Months);

  const sessionsSnapshot = await sessionsQuery.get();

  // Analyser les tendances mensuelles
  const monthlyEngagement: { [month: number]: { sessions: number; uniqueUsers: Set<string>; totalDuration: number } } = {};

  sessionsSnapshot.docs.forEach((doc) => {
    const session = doc.data();
    const month = session.createdAt.toDate().getMonth();

    if (!monthlyEngagement[month]) {
      monthlyEngagement[month] = {
        sessions: 0,
        uniqueUsers: new Set(),
        totalDuration: 0,
      };
    }

    monthlyEngagement[month].sessions++;
    monthlyEngagement[month].uniqueUsers.add(session.userId);
    monthlyEngagement[month].totalDuration += session.duration || 0;
  });

  // Calculer les tendances et prédictions
  const forecast = {
    trend: "stable", // stable, growing, declining
    predictedGrowth: 0,
    recommendedActions: [] as string[],
  };

  // Analyser la tendance (simplifié)
  const months = Object.keys(monthlyEngagement).sort();
  if (months.length >= 3) {
    const recentMonth = Number(months[months.length - 1]);
    const olderMonth = Number(months[months.length - 3]);
    const recent = monthlyEngagement[recentMonth];
    const older = monthlyEngagement[olderMonth];

    const recentUsers = recent.uniqueUsers.size;
    const olderUsers = older.uniqueUsers.size;

    if (recentUsers > olderUsers * 1.1) {
      forecast.trend = "growing";
      forecast.predictedGrowth = Math.round(((recentUsers - olderUsers) / olderUsers) * 100);
    } else if (recentUsers < olderUsers * 0.9) {
      forecast.trend = "declining";
      forecast.predictedGrowth = Math.round(((recentUsers - olderUsers) / olderUsers) * 100);
    }
  }

  // Recommandations basées sur la tendance
  if (forecast.trend === "declining") {
    forecast.recommendedActions.push("Lancer une campagne de réengagement");
    forecast.recommendedActions.push("Analyser les causes de la baisse d'engagement");
    forecast.recommendedActions.push("Améliorer l'expérience utilisateur");
  } else if (forecast.trend === "growing") {
    forecast.recommendedActions.push("Préparer l'infrastructure pour la croissance");
    forecast.recommendedActions.push("Développer de nouvelles fonctionnalités");
  }

  return forecast;
}

// ===== FONCTIONS D'ANALYSE DES TENDANCES =====

async function analyzeAttendanceTrends(): Promise<void> {
  // Analyser les tendances de présence sur différentes périodes
  const trends = await calculateAttendanceTrends();

  await collections.analytics.doc("attendance_trends").set({
    type: "attendance_trends",
    data: trends,
    updatedAt: new Date(),
  });
}

async function calculateAttendanceTrends(): Promise<any> {
  const periods = [
    {name: "7d", days: 7},
    {name: "30d", days: 30},
    {name: "90d", days: 90},
  ];

  const trends: { [key: string]: any } = {};

  for (const period of periods) {
    const startDate = new Date(Date.now() - period.days * 24 * 60 * 60 * 1000);

    const eventsQuery = collections.events
      .where("endDateTime", ">=", startDate)
      .where("status", "==", "completed");

    const eventsSnapshot = await eventsQuery.get();

    let totalParticipants = 0;
    let totalPresent = 0;

    for (const eventDoc of eventsSnapshot.docs) {
      const event = eventDoc.data();
      totalParticipants += event.participants?.length || 0;

      const attendanceQuery = collections.attendances
        .where("eventId", "==", eventDoc.id)
        .where("status", "in", ["present", "late"]);

      const attendanceSnapshot = await attendanceQuery.get();
      totalPresent += attendanceSnapshot.size;
    }

    trends[period.name] = {
      totalEvents: eventsSnapshot.size,
      totalParticipants,
      totalPresent,
      attendanceRate: totalParticipants > 0 ? Math.round((totalPresent / totalParticipants) * 100) : 0,
    };
  }

  return trends;
}

async function analyzeUserEngagementTrends(): Promise<void> {
  // Analyser l'engagement des utilisateurs
  const engagement = await calculateUserEngagementTrends();

  await collections.analytics.doc("user_engagement_trends").set({
    type: "user_engagement_trends",
    data: engagement,
    updatedAt: new Date(),
  });
}

async function calculateUserEngagementTrends(): Promise<any> {
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Analyser les sessions
  const sessionsQuery = collections.user_sessions
    .where("createdAt", ">=", last30Days);

  const sessionsSnapshot = await sessionsQuery.get();

  const dailyEngagement: { [key: string]: { sessions: number; uniqueUsers: Set<string>; totalDuration: number } } = {};

  sessionsSnapshot.docs.forEach((doc) => {
    const session = doc.data();
    const day = session.createdAt.toDate().toISOString().split("T")[0];

    if (!dailyEngagement[day]) {
      dailyEngagement[day] = {
        sessions: 0,
        uniqueUsers: new Set(),
        totalDuration: 0,
      };
    }

    dailyEngagement[day].sessions++;
    dailyEngagement[day].uniqueUsers.add(session.userId);
    dailyEngagement[day].totalDuration += session.duration || 0;
  });

  // Convertir en format utilisable
  const trends = Object.entries(dailyEngagement).map(([date, data]: [string, any]) => ({
    date,
    sessions: data.sessions,
    uniqueUsers: data.uniqueUsers.size,
    avgSessionDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions) : 0,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    daily: trends,
    summary: {
      totalSessions: trends.reduce((sum, day) => sum + day.sessions, 0),
      totalUniqueUsers: new Set(sessionsSnapshot.docs.map((doc) => doc.data().userId)).size,
      avgDailyUsers: trends.length > 0 ? Math.round(trends.reduce((sum, day) => sum + day.uniqueUsers, 0) / trends.length) : 0,
      avgSessionDuration: trends.length > 0 ? Math.round(trends.reduce((sum, day) => sum + day.avgSessionDuration, 0) / trends.length) : 0,
    },
  };
}

async function analyzeEventPopularityTrends(): Promise<void> {
  // Analyser la popularité des événements par type et organisateur
  const last60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("createdAt", ">=", last60Days);

  const eventsSnapshot = await eventsQuery.get();

  const popularity = {
    byType: {} as any,
    byOrganizer: {} as any,
    trending: [] as any[],
    declining: [] as any[],
  };

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    const eventType = event.type;
    const organizerId = event.organizerId;

    // Calculer la popularité (participants + taux de présence)
    const participantCount = event.participants?.length || 0;

    const attendanceQuery = collections.attendances
      .where("eventId", "==", eventDoc.id)
      .where("status", "in", ["present", "late"]);

    const attendanceSnapshot = await attendanceQuery.get();
    const attendanceRate = participantCount > 0 ? (attendanceSnapshot.size / participantCount) * 100 : 0;

    const popularityScore = participantCount * (attendanceRate / 100); // Score pondéré

    // Par type
    if (!popularity.byType[eventType]) {
      popularity.byType[eventType] = {
        events: 0,
        totalParticipants: 0,
        avgAttendanceRate: 0,
        popularityScore: 0,
      };
    }

    popularity.byType[eventType].events++;
    popularity.byType[eventType].totalParticipants += participantCount;
    popularity.byType[eventType].popularityScore += popularityScore;

    // Par organisateur
    if (!popularity.byOrganizer[organizerId]) {
      popularity.byOrganizer[organizerId] = {
        events: 0,
        totalParticipants: 0,
        avgAttendanceRate: 0,
        popularityScore: 0,
      };
    }

    popularity.byOrganizer[organizerId].events++;
    popularity.byOrganizer[organizerId].totalParticipants += participantCount;
    popularity.byOrganizer[organizerId].popularityScore += popularityScore;
  }

  // Calculer les moyennes
  Object.keys(popularity.byType).forEach((type) => {
    const data = popularity.byType[type];
    data.avgParticipants = data.events > 0 ? Math.round(data.totalParticipants / data.events) : 0;
    data.avgPopularityScore = data.events > 0 ? Math.round(data.popularityScore / data.events) : 0;
  });

  Object.keys(popularity.byOrganizer).forEach((organizerId) => {
    const data = popularity.byOrganizer[organizerId];
    data.avgParticipants = data.events > 0 ? Math.round(data.totalParticipants / data.events) : 0;
    data.avgPopularityScore = data.events > 0 ? Math.round(data.popularityScore / data.events) : 0;
  });

  // Identifier les tendances
  const typeEntries = Object.entries(popularity.byType)
    .map(([type, data]: [string, any]) => ({type, ...data}))
    .sort((a, b) => b.avgPopularityScore - a.avgPopularityScore);

  popularity.trending = typeEntries.slice(0, 3);
  popularity.declining = typeEntries.slice(-3).reverse();

  await collections.analytics.doc("event_popularity_trends").set({
    type: "event_popularity_trends",
    data: popularity,
    updatedAt: new Date(),
  });
}

async function detectAnomalies(): Promise<void> {
  // Détecter les anomalies dans les données
  const anomalies = [];

  // Analyser les pics/chutes de présence
  const attendanceTrendsDoc = await collections.analytics.doc("attendance_trends").get();
  if (attendanceTrendsDoc.exists) {
    const trends = attendanceTrendsDoc.data()?.data;

    // Comparer les périodes
    const currentRate = trends["7d"]?.attendanceRate || 0;
    const previousRate = trends["30d"]?.attendanceRate || 0;

    if (Math.abs(currentRate - previousRate) > 20) {
      anomalies.push({
        type: "attendance_rate_anomaly",
        severity: currentRate < previousRate ? "high" : "medium",
        description: `Taux de présence ${currentRate < previousRate ? "en chute" : "en hausse"} significative`,
        currentValue: currentRate,
        previousValue: previousRate,
        change: currentRate - previousRate,
      });
    }
  }

  // Analyser les anomalies de notifications
  const notificationDoc = await collections.analytics.doc("notification_effectiveness_30d").get();
  if (notificationDoc.exists) {
    const effectiveness = notificationDoc.data()?.data;

    if (effectiveness.overall.deliveryRate < 80) {
      anomalies.push({
        type: "low_delivery_rate",
        severity: "high",
        description: "Taux de livraison des notifications anormalement bas",
        currentValue: effectiveness.overall.deliveryRate,
        threshold: 80,
      });
    }
  }

  // Analyser les pics d'activité
  const today = new Date();
  const sessionsQuery = collections.user_sessions
    .where("createdAt", ">=", new Date(today.setHours(0, 0, 0, 0)))
    .where("createdAt", "<", new Date(today.setHours(23, 59, 59, 999)));

  const todaySessionsSnapshot = await sessionsQuery.get();
  const todaySessions = todaySessionsSnapshot.size;

  // Comparer avec la moyenne des 7 derniers jours
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekSessionsQuery = collections.user_sessions
    .where("createdAt", ">=", last7Days);

  const weekSessionsSnapshot = await weekSessionsQuery.get();
  const avgDailySessions = Math.round(weekSessionsSnapshot.size / 7);

  if (todaySessions > avgDailySessions * 2) {
    anomalies.push({
      type: "activity_spike",
      severity: "medium",
      description: "Pic d'activité utilisateur détecté",
      currentValue: todaySessions,
      averageValue: avgDailySessions,
      multiplier: Math.round(todaySessions / avgDailySessions * 10) / 10,
    });
  }

  // Sauvegarder les anomalies
  if (anomalies.length > 0) {
    await collections.analytics.doc("anomalies").set({
      type: "anomaly_detection",
      anomalies,
      detectedAt: new Date(),
      count: anomalies.length,
    });

    logger.warn(`🚨 ${anomalies.length} anomalies detected`, {anomalies});
  }
}
async function analyzeUserLifecycle(): Promise<any> {
  // Analyser le cycle de vie des utilisateurs
  const lifecycle = {
    averageTimeToFirstEvent: 0,
    averageTimeToSecondEvent: 0,
    dropoffPoints: [],
    activationRate: 0,
  };

  const usersQuery = collections.users
    .where("createdAt", ">=", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
    .limit(100); // Échantillon

  const usersSnapshot = await usersQuery.get();

  let totalTimeToFirst = 0;
  let totalTimeToSecond = 0;
  let usersWithFirstEvent = 0;
  let usersWithSecondEvent = 0;
  let activatedUsers = 0;

  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data();
    const userId = userDoc.id;
    const signupDate = user.createdAt.toDate();

    // Trouver le premier événement auquel l'utilisateur a participé
    const firstEventQuery = collections.events
      .where("participants", "array-contains", userId)
      .where("startDateTime", ">=", signupDate)
      .orderBy("startDateTime")
      .limit(1);

    const firstEventSnapshot = await firstEventQuery.get();

    if (!firstEventSnapshot.empty) {
      const firstEvent = firstEventSnapshot.docs[0].data();
      const timeToFirst = firstEvent.startDateTime.toDate().getTime() - signupDate.getTime();

      totalTimeToFirst += timeToFirst;
      usersWithFirstEvent++;

      // Chercher le deuxième événement
      const secondEventQuery = collections.events
        .where("participants", "array-contains", userId)
        .where("startDateTime", ">", firstEvent.startDateTime)
        .orderBy("startDateTime")
        .limit(1);

      const secondEventSnapshot = await secondEventQuery.get();

      if (!secondEventSnapshot.empty) {
        const secondEvent = secondEventSnapshot.docs[0].data();
        const timeToSecond = secondEvent.startDateTime.toDate().getTime() - firstEvent.startDateTime.toDate().getTime();

        totalTimeToSecond += timeToSecond;
        usersWithSecondEvent++;
      }

      // Considérer comme activé si l'utilisateur a participé à au moins un événement
      const attendanceQuery = collections.attendances
        .where("userId", "==", userId)
        .where("status", "in", ["present", "late"])
        .limit(1);

      const attendanceSnapshot = await attendanceQuery.get();
      if (!attendanceSnapshot.empty) {
        activatedUsers++;
      }
    }
  }

  // Calculer les moyennes
  lifecycle.averageTimeToFirstEvent = usersWithFirstEvent > 0 ?
    Math.round(totalTimeToFirst / usersWithFirstEvent / (24 * 60 * 60 * 1000)) : // en jours
    0;

  lifecycle.averageTimeToSecondEvent = usersWithSecondEvent > 0 ?
    Math.round(totalTimeToSecond / usersWithSecondEvent / (24 * 60 * 60 * 1000)) : // en jours
    0;

  lifecycle.activationRate = usersSnapshot.size > 0 ?
    Math.round((activatedUsers / usersSnapshot.size) * 100) :
    0;

  return lifecycle;
}

async function generateEventInsights(): Promise<void> {
  // Générer des insights sur les événements
  const insights = {
    eventPerformance: await analyzeEventPerformanceInsights(),
    optimalEventSettings: await findOptimalEventSettings(),
    eventLifecycle: await analyzeEventLifecycle(),
    successFactors: await identifyEventSuccessFactors(),
  };

  await collections.analytics.doc("event_insights").set({
    type: "event_insights",
    data: insights,
    generatedAt: new Date(),
  });
}

async function analyzeEventPerformanceInsights(): Promise<any> {
  const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("endDateTime", ">=", last90Days)
    .where("status", "==", "completed");

  const eventsSnapshot = await eventsQuery.get();

  const insights = {
    totalEvents: eventsSnapshot.size,
    averageAttendanceRate: 0,
    bestPerformingTypes: [] as any[],
    underperformingTypes: [] as any[],
    timeToFullCapacity: {},
    cancellationReasons: {},
  };

  type TypePerformanceEntry = {
    events: number;
    totalAttendanceRate: number;
    avgAttendanceRate: number;
  };
  const typePerformance: { [key: string]: TypePerformanceEntry } = {};
  let totalAttendanceRate = 0;

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();
    const eventType = event.type;

    // Calculer le taux de présence
    const attendanceQuery = collections.attendances
      .where("eventId", "==", eventDoc.id)
      .where("status", "in", ["present", "late"]);

    const attendanceSnapshot = await attendanceQuery.get();
    const participantCount = event.participants?.length || 0;
    const attendanceRate = participantCount > 0 ? (attendanceSnapshot.size / participantCount) * 100 : 0;

    totalAttendanceRate += attendanceRate;

    // Grouper par type
    if (!typePerformance[eventType]) {
      typePerformance[eventType] = {
        events: 0,
        totalAttendanceRate: 0,
        avgAttendanceRate: 0,
      };
    }

    typePerformance[eventType].events++;
    typePerformance[eventType].totalAttendanceRate += attendanceRate;
  }

  // Calculer les moyennes par type
  Object.keys(typePerformance).forEach((type) => {
    const data = typePerformance[type];
    data.avgAttendanceRate = Math.round(data.totalAttendanceRate / data.events);
  });

  insights.averageAttendanceRate = insights.totalEvents > 0 ?
    Math.round(totalAttendanceRate / insights.totalEvents) :
    0;

  // Identifier les meilleurs et pires types
  const sortedTypes = Object.entries(typePerformance)
    .map(([type, data]: [string, any]) => ({type, ...data}))
    .sort((a, b) => b.avgAttendanceRate - a.avgAttendanceRate);

  insights.bestPerformingTypes = sortedTypes.slice(0, 3);
  insights.underperformingTypes = sortedTypes.slice(-3).reverse();

  return insights;
}

async function findOptimalEventSettings(): Promise<any> {
  // Analyser les paramètres optimaux pour les événements
  const last6Months = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("endDateTime", ">=", last6Months)
    .where("status", "==", "completed");

  const eventsSnapshot = await eventsQuery.get();

  const settings = {
    optimalDuration: {},
    optimalCapacity: {},
    bestTimeSlots: {},
    effectiveReminderSettings: {},
  };

  type DurationKey = "≤1h" | "1-2h" | "2-4h" | ">4h";
  type DurationAnalysisEntry = { events: number; totalScore: number; avgScore: number };
  const durationAnalysis: Record<DurationKey, DurationAnalysisEntry> = {
    "≤1h": { events: 0, totalScore: 0, avgScore: 0 },
    "1-2h": { events: 0, totalScore: 0, avgScore: 0 },
    "2-4h": { events: 0, totalScore: 0, avgScore: 0 },
    ">4h": { events: 0, totalScore: 0, avgScore: 0 },
  };
  const capacityAnalysis: Record<string, { events: number; totalScore: number; avgScore: number }> = {};
  const timeSlotAnalysis: Record<number, { events: number; totalScore: number; avgScore: number }> = {};

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    // Calculer la durée en heures
    const duration = Math.round(
      (event.endDateTime.toDate().getTime() - event.startDateTime.toDate().getTime()) / (1000 * 60 * 60)
    );

    const maxParticipants = event.maxParticipants || 50;
    const hour = event.startDateTime.toDate().getHours();
    const timeSlot = Math.floor(hour / 2) * 2; // Créneaux de 2h

    // Calculer les métriques de succès
    const attendanceQuery = collections.attendances
      .where("eventId", "==", eventDoc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    let presentCount = 0;
    let avgRating = 0;
    let ratingsCount = 0;

    attendanceSnapshot.docs.forEach((doc) => {
      const attendance = doc.data();

      if (["present", "late"].includes(attendance.status)) {
        presentCount++;
      }

      if (attendance.feedback?.rating) {
        avgRating += attendance.feedback.rating;
        ratingsCount++;
      }
    });

    const participantCount = event.participants?.length || 0;
    const attendanceRate = participantCount > 0 ? (presentCount / participantCount) * 100 : 0;
    const satisfaction = ratingsCount > 0 ? avgRating / ratingsCount : 0;
    const successScore = (attendanceRate * 0.7) + (satisfaction * 20 * 0.3); // Score pondéré

    // Analyser par durée
    const durationKey = duration <= 1 ? "≤1h" : duration <= 2 ? "1-2h" : duration <= 4 ? "2-4h" : ">4h";
    if (!durationAnalysis[durationKey]) {
      durationAnalysis[durationKey] = {events: 0, totalScore: 0, avgScore: 0};
    }
    durationAnalysis[durationKey].events++;
    durationAnalysis[durationKey].totalScore += successScore;

    // Analyser par capacité
    const capacityKey = maxParticipants <= 10 ? "≤10" : maxParticipants <= 25 ? "11-25" : maxParticipants <= 50 ? "26-50" : ">50";
    if (!capacityAnalysis[capacityKey]) {
      capacityAnalysis[capacityKey] = {events: 0, totalScore: 0, avgScore: 0};
    }
    capacityAnalysis[capacityKey].events++;
    capacityAnalysis[capacityKey].totalScore += successScore;

    // Analyser par créneau horaire
    if (!timeSlotAnalysis[timeSlot]) {
      timeSlotAnalysis[timeSlot] = {events: 0, totalScore: 0, avgScore: 0};
    }
    timeSlotAnalysis[timeSlot].events++;
    timeSlotAnalysis[timeSlot].totalScore += successScore;
  }

  // Calculer les moyennes et identifier les optimums
  Object.keys(durationAnalysis).forEach((duration) => {
    const data = durationAnalysis[duration as DurationKey];
    data.avgScore = Math.round(data.totalScore / data.events);
  });

  Object.keys(capacityAnalysis).forEach((capacity) => {
    const data = capacityAnalysis[capacity];
    data.avgScore = Math.round(data.totalScore / data.events);
  });

  Object.keys(timeSlotAnalysis).forEach((timeSlot) => {
    const data = timeSlotAnalysis[Number(timeSlot)];
    data.avgScore = Math.round(data.totalScore / data.events);
  });

  // Trouver les optimums
  settings.optimalDuration = Object.entries(durationAnalysis)
    .sort(([, a], [, b]) => (b as any).avgScore - (a as any).avgScore)[0];

  settings.optimalCapacity = Object.entries(capacityAnalysis)
    .sort(([, a], [, b]) => (b as any).avgScore - (a as any).avgScore)[0];

  settings.bestTimeSlots = Object.entries(timeSlotAnalysis)
    .sort(([, a], [, b]) => (b as any).avgScore - (a as any).avgScore)
    .slice(0, 3);

  return settings;
}

async function analyzeEventLifecycle(): Promise<any> {
  // Analyser le cycle de vie des événements
  const last3Months = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("createdAt", ">=", last3Months);

  const eventsSnapshot = await eventsQuery.get();

  const lifecycle = {
    averageTimeToPublish: 0,
    averageTimeToFill: 0,
    conversionRates: {
      draftToPublished: 0,
      publishedToCompleted: 0,
    },
    commonDropoffPoints: [],
  };

  let totalTimeToPublish = 0;
  let totalTimeToFill = 0;
  let publishedEvents = 0;
  let filledEvents = 0;
  let completedEvents = 0;
  let draftCount = 0;

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    // Compter les statuts
    if (event.status === "draft") {draftCount++;}
    if (event.status === "published") {publishedEvents++;}
    if (event.status === "completed") {completedEvents++;}

    // Calculer le temps jusqu'à publication
    if (event.status !== "draft" && event.publishedAt) {
      const timeToPublish = event.publishedAt.toDate().getTime() - event.createdAt.toDate().getTime();
      totalTimeToPublish += timeToPublish;
    }

    // Calculer le temps jusqu'au remplissage
    if (event.maxParticipants && event.participants?.length >= event.maxParticipants) {
      // Trouver quand l'événement s'est rempli (approximation)
      const timeToFill = event.startDateTime.toDate().getTime() - event.createdAt.toDate().getTime();
      totalTimeToFill += timeToFill;
      filledEvents++;
    }
  }

  // Calculer les moyennes
  lifecycle.averageTimeToPublish = publishedEvents > 0 ?
    Math.round(totalTimeToPublish / publishedEvents / (24 * 60 * 60 * 1000)) : // en jours
    0;

  lifecycle.averageTimeToFill = filledEvents > 0 ?
    Math.round(totalTimeToFill / filledEvents / (24 * 60 * 60 * 1000)) : // en jours
    0;

  // Calculer les taux de conversion
  const totalEvents = eventsSnapshot.size;
  lifecycle.conversionRates.draftToPublished = totalEvents > 0 ?
    Math.round(((totalEvents - draftCount) / totalEvents) * 100) :
    0;

  lifecycle.conversionRates.publishedToCompleted = publishedEvents > 0 ?
    Math.round((completedEvents / (publishedEvents + completedEvents)) * 100) :
    0;

  return lifecycle;
}

async function identifyEventSuccessFactors(): Promise<any> {
  // Identifier les facteurs de succès des événements
  const last6Months = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("endDateTime", ">=", last6Months)
    .where("status", "==", "completed");

  const eventsSnapshot = await eventsQuery.get();

  const successFactors = {
    highPerformingEvents: [] as any[],
    commonSuccessTraits: {
      optimalAdvanceNotice: 0,
      effectiveDescriptionLength: 0,
      successfulReminderFrequency: 0,
      optimalParticipantCount: 0,
    },
    correlations: {},
  };

  const eventAnalysis = [];

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    // Calculer les métriques de succès
    const attendanceQuery = collections.attendances
      .where("eventId", "==", eventDoc.id);

    const attendanceSnapshot = await attendanceQuery.get();

    let presentCount = 0;
    let totalRating = 0;
    let ratingsCount = 0;

    attendanceSnapshot.docs.forEach((doc) => {
      const attendance = doc.data();

      if (["present", "late"].includes(attendance.status)) {
        presentCount++;
      }

      if (attendance.feedback?.rating) {
        totalRating += attendance.feedback.rating;
        ratingsCount++;
      }
    });

    const participantCount = event.participants?.length || 0;
    const attendanceRate = participantCount > 0 ? (presentCount / participantCount) * 100 : 0;
    const avgRating = ratingsCount > 0 ? totalRating / ratingsCount : 0;
    const successScore = (attendanceRate * 0.6) + (avgRating * 20 * 0.4);

    // Calculer les facteurs potentiels
    const advanceNotice = Math.floor(
      (event.startDateTime.toDate().getTime() - event.createdAt.toDate().getTime()) / (24 * 60 * 60 * 1000)
    );

    const descriptionLength = event.description?.length || 0;
    const reminderCount = event.remindersSent || 0;

    eventAnalysis.push({
      eventId: eventDoc.id,
      title: event.title,
      type: event.type,
      successScore,
      attendanceRate,
      avgRating,
      advanceNotice,
      descriptionLength,
      reminderCount,
      participantCount,
    });
  }

  // Identifier les événements les plus performants (top 20%)
  eventAnalysis.sort((a, b) => b.successScore - a.successScore);
  const top20Percent = Math.ceil(eventAnalysis.length * 0.2);
  successFactors.highPerformingEvents = eventAnalysis.slice(0, top20Percent);

  // Analyser les traits communs des événements performants
  if (successFactors.highPerformingEvents.length > 0) {
    const topEvents = successFactors.highPerformingEvents;

    successFactors.commonSuccessTraits.optimalAdvanceNotice = Math.round(
      topEvents.reduce((sum, event) => sum + event.advanceNotice, 0) / topEvents.length
    );

    successFactors.commonSuccessTraits.effectiveDescriptionLength = Math.round(
      topEvents.reduce((sum, event) => sum + event.descriptionLength, 0) / topEvents.length
    );

    successFactors.commonSuccessTraits.successfulReminderFrequency = Math.round(
      topEvents.reduce((sum, event) => sum + event.reminderCount, 0) / topEvents.length
    );

    successFactors.commonSuccessTraits.optimalParticipantCount = Math.round(
      topEvents.reduce((sum, event) => sum + event.participantCount, 0) / topEvents.length
    );
  }

  return successFactors;
}

async function generateOrganizationInsights(): Promise<void> {
  // Générer des insights au niveau organisationnel
  const insights = {
    organizationHealth: await assessOrganizationHealth(),
    growthMetrics: await calculateGrowthMetrics(),
    operationalEfficiency: await analyzeOperationalEfficiency(),
    strategicRecommendations: await generateStrategicRecommendations(),
  };

  await collections.analytics.doc("organization_insights").set({
    type: "organization_insights",
    data: insights,
    generatedAt: new Date(),
  });
}

async function assessOrganizationHealth(): Promise<any> {
  const health = {
    overallScore: 0,
    metrics: {
      userGrowth: 0,
      eventActivity: 0,
      userEngagement: 0,
      systemPerformance: 0,
      financialHealth: 0,
    },
    status: "unknown",
    alerts: [] as string[],
  };

  // Calculer la croissance utilisateur (30 derniers jours vs 30 précédents)
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last60Days = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const recentUsersQuery = collections.users
    .where("createdAt", ">=", last30Days);
  const recentUsersSnapshot = await recentUsersQuery.get();

  const previousUsersQuery = collections.users
    .where("createdAt", ">=", last60Days)
    .where("createdAt", "<", last30Days);
  const previousUsersSnapshot = await previousUsersQuery.get();

  const userGrowthRate = previousUsersSnapshot.size > 0 ?
    ((recentUsersSnapshot.size - previousUsersSnapshot.size) / previousUsersSnapshot.size) * 100 :
    0;

  health.metrics.userGrowth = Math.max(0, Math.min(100, 50 + userGrowthRate)); // Normalisé sur 100

  // Calculer l'activité événementielle
  const recentEventsQuery = collections.events
    .where("createdAt", ">=", last30Days);
  const recentEventsSnapshot = await recentEventsQuery.get();

  const previousEventsQuery = collections.events
    .where("createdAt", ">=", last60Days)
    .where("createdAt", "<", last30Days);
  const previousEventsSnapshot = await previousEventsQuery.get();

  const eventGrowthRate = previousEventsSnapshot.size > 0 ?
    ((recentEventsSnapshot.size - previousEventsSnapshot.size) / previousEventsSnapshot.size) * 100 :
    0;

  health.metrics.eventActivity = Math.max(0, Math.min(100, 50 + eventGrowthRate));

  // Récupérer les métriques d'engagement depuis l'analytics existant
  const engagementDoc = await collections.analytics.doc("user_engagement_trends").get();
  if (engagementDoc.exists) {
    const engagement = engagementDoc.data()?.data?.summary;
    // Utiliser le nombre d'utilisateurs actifs quotidiens comme métrique
    health.metrics.userEngagement = Math.min(100, (engagement?.avgDailyUsers || 0) * 2);
  }

  // Performance système (basée sur les métriques de santé)
  const healthDoc = await collections.dashboard.doc("system_health").get();
  if (healthDoc.exists) {
    const systemHealth = healthDoc.data();
    health.metrics.systemPerformance = systemHealth?.database?.status === "healthy" ? 90 : 50;
  } else {
    health.metrics.systemPerformance = 80; // Valeur par défaut
  }

  // Santé financière (basée sur les coûts de notification)
  const notificationDoc = await collections.analytics.doc("notification_effectiveness_30d").get();
  if (notificationDoc.exists) {
    const notificationData = notificationDoc.data()?.data;
    const deliveryRate = notificationData?.overall?.deliveryRate || 0;
    health.metrics.financialHealth = deliveryRate; // Bonne livraison = coûts maîtrisés
  } else {
    health.metrics.financialHealth = 75;
  }

  // Calculer le score global
  const scores = Object.values(health.metrics);
  health.overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  // Déterminer le statut
  if (health.overallScore >= 80) {
    health.status = "excellent";
  } else if (health.overallScore >= 60) {
    health.status = "good";
  } else if (health.overallScore >= 40) {
    health.status = "warning";
  } else {
    health.status = "critical";
  }

  // Générer des alertes
  if (health.metrics.userGrowth < 40) {
    health.alerts.push("Croissance utilisateur en déclin");
  }
  if (health.metrics.eventActivity < 40) {
    health.alerts.push("Activité événementielle en baisse");
  }
  if (health.metrics.userEngagement < 30) {
    health.alerts.push("Engagement utilisateur faible");
  }

  return health;
}

async function calculateGrowthMetrics(): Promise<any> {
  const growth = {
    userGrowth: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    },
    eventGrowth: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    },
    engagementGrowth: {
      monthly: 0,
      quarterly: 0,
    },
    projections: {
      usersNext3Months: 0,
      eventsNext3Months: 0,
    },
  };

  const now = new Date();
  const periods = {
    month: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    quarter: new Date(now.getFullYear(), now.getMonth() - 3, 1),
    year: new Date(now.getFullYear() - 1, now.getMonth(), 1),
  };

  // Calculer la croissance des utilisateurs
  for (const [period, startDate] of Object.entries(periods)) {
    const usersQuery = collections.users
      .where("createdAt", ">=", startDate);
    const usersSnapshot = await usersQuery.get();

    const eventsQuery = collections.events
      .where("createdAt", ">=", startDate);
    const eventsSnapshot = await eventsQuery.get();

    // Comparer avec la période précédente
    const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

    const prevUsersQuery = collections.users
      .where("createdAt", ">=", previousStart)
      .where("createdAt", "<", startDate);
    const prevUsersSnapshot = await prevUsersQuery.get();

    const prevEventsQuery = collections.events
      .where("createdAt", ">=", previousStart)
      .where("createdAt", "<", startDate);
    const prevEventsSnapshot = await prevEventsQuery.get();

    const userGrowthRate = prevUsersSnapshot.size > 0 ?
      ((usersSnapshot.size - prevUsersSnapshot.size) / prevUsersSnapshot.size) * 100 :
      0;

    const eventGrowthRate = prevEventsSnapshot.size > 0 ?
      ((eventsSnapshot.size - prevEventsSnapshot.size) / prevEventsSnapshot.size) * 100 :
      0;

    if (period === "month") {
      growth.userGrowth.monthly = Math.round(userGrowthRate);
      growth.eventGrowth.monthly = Math.round(eventGrowthRate);
    } else if (period === "quarter") {
      growth.userGrowth.quarterly = Math.round(userGrowthRate);
      growth.eventGrowth.quarterly = Math.round(eventGrowthRate);
    } else if (period === "year") {
      growth.userGrowth.yearly = Math.round(userGrowthRate);
      growth.eventGrowth.yearly = Math.round(eventGrowthRate);
    }
  }

  // Projections simples basées sur la croissance mensuelle
  const totalUsers = await collections.users.get();
  const totalEvents = await collections.events.get();

  growth.projections.usersNext3Months = Math.round(
    totalUsers.size * Math.pow(1 + growth.userGrowth.monthly / 100, 3)
  );

  growth.projections.eventsNext3Months = Math.round(
    totalEvents.size * Math.pow(1 + growth.eventGrowth.monthly / 100, 3)
  );

  return growth;
}

async function analyzeOperationalEfficiency(): Promise<any> {
  const efficiency = {
    eventCreationEfficiency: 0,
    notificationEfficiency: 0,
    userActivationEfficiency: 0,
    resourceUtilization: 0,
    automationRate: 0,
    recommendations: [] as string[],
  };

  // Analyser l'efficacité de création d'événements
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const eventsQuery = collections.events
    .where("createdAt", ">=", last30Days);
  const eventsSnapshot = await eventsQuery.get();

  let completedEvents = 0;

  eventsSnapshot.docs.forEach((doc) => {
    const event = doc.data();
    if (event.status === "completed") {
      completedEvents++;
    }
  });

  efficiency.eventCreationEfficiency = eventsSnapshot.size > 0 ?
    Math.round((completedEvents / eventsSnapshot.size) * 100) :
    0;

  // Analyser l'efficacité des notifications
  const notificationDoc = await collections.analytics.doc("notification_effectiveness_30d").get();
  if (notificationDoc.exists) {
    const notificationData = notificationDoc.data()?.data;
    efficiency.notificationEfficiency = notificationData?.overall?.deliveryRate || 0;
  }

  // Analyser l'efficacité d'activation des utilisateurs
  const userLifecycleDoc = await collections.analytics.doc("user_insights").get();
  if (userLifecycleDoc.exists) {
    const lifecycle = userLifecycleDoc.data()?.data?.userLifecycle;
    efficiency.userActivationEfficiency = lifecycle?.activationRate || 0;
  }

  // Utilisation des ressources (approximation)
  efficiency.resourceUtilization = Math.min(100,
    (efficiency.eventCreationEfficiency + efficiency.notificationEfficiency) / 2
  );

  // Taux d'automatisation (basé sur les rappels automatiques vs manuels)
  efficiency.automationRate = 85; // Valeur estimée basée sur les cron jobs

  // Générer des recommandations
  if (efficiency.eventCreationEfficiency < 70) {
    efficiency.recommendations.push("Améliorer le processus de création d'événements");
  }
  if (efficiency.notificationEfficiency < 80) {
    efficiency.recommendations.push("Optimiser le système de notifications");
  }
  if (efficiency.userActivationEfficiency < 60) {
    efficiency.recommendations.push("Améliorer l'onboarding des nouveaux utilisateurs");
  }

  return efficiency;
}

async function generateStrategicRecommendations(): Promise<any> {
  // Générer des recommandations stratégiques basées sur toutes les analyses
  const recommendations = {
    shortTerm: [] as string[],
    mediumTerm: [] as string[],
    longTerm: [] as string[],
    priority: "medium",
    impactEstimate: "medium",
  };

  // Récupérer les insights existants
  const healthDoc = await collections.analytics.doc("organization_insights").get();
  // @ts-ignore
  const userInsightsDoc = await collections.analytics.doc("user_insights").get();
  // @ts-ignore
  const eventInsightsDoc = await collections.analytics.doc("event_insights").get();
  // @ts-ignore
  const predictiveDoc = await collections.analytics.doc("predictive_insights").get();

  // Analyser les données pour générer des recommandations

  // Recommandations à court terme (1-3 mois)
  recommendations.shortTerm = [
    "Optimiser les heures d'envoi des notifications selon les patterns d'engagement",
    "Mettre en place des rappels personnalisés pour les utilisateurs à risque",
    "Améliorer les templates d'événements les plus performants",
    "Lancer une campagne de réactivation pour les utilisateurs inactifs",
  ];

  // Recommandations à moyen terme (3-6 mois)
  recommendations.mediumTerm = [
    "Développer un système de recommandations d'événements personnalisées",
    "Implémenter un scoring prédictif pour optimiser la planification",
    "Créer des parcours utilisateur adaptés selon les segments",
    "Automatiser davantage les processus de suivi post-événement",
  ];

  // Recommandations à long terme (6+ mois)
  recommendations.longTerm = [
    "Intégrer l'intelligence artificielle pour la prédiction de succès d'événements",
    "Développer des analyses prédictives avancées pour la détection de churn",
    "Créer un tableau de bord exécutif avec métriques en temps réel",
    "Implémenter un système de feedback continu pour l'amélioration produit",
  ];

  // Déterminer la priorité basée sur la santé organisationnelle
  if (healthDoc.exists) {
    const health = healthDoc.data()?.data?.organizationHealth;
    if (health?.overallScore < 60) {
      recommendations.priority = "high";
      recommendations.impactEstimate = "high";
    } else if (health?.overallScore > 80) {
      recommendations.priority = "low";
      recommendations.impactEstimate = "medium";
    }
  }

  return recommendations;
}

async function generateActionableRecommendations(): Promise<void> {
  // Générer des recommandations actionables basées sur tous les insights
  const actionableRecommendations: {
    immediate: { action: string; priority: string; estimatedTime: string; responsibleTeam: string }[];
    weekly: { action: string; priority: string; estimatedTime: string; responsibleTeam: string }[];
    monthly: { action: string; priority: string; estimatedTime: string; responsibleTeam: string }[];
    quarterly: { action: string; priority: string; estimatedTime: string; responsibleTeam: string }[];
  } = {
    immediate: [],
    weekly: [],
    monthly: [],
    quarterly: [],
  };

  // Récupérer les analyses récentes
  const churnRiskDoc = await collections.analytics.doc("predictive_insights").get();
  const attendancePatternsDoc = await collections.analytics.doc("attendance_patterns_90d").get();
  const notificationDoc = await collections.analytics.doc("notification_effectiveness_30d").get();
  const anomaliesDoc = await collections.analytics.doc("anomalies").get();

  // Actions immédiates (à faire aujourd'hui)
  if (anomaliesDoc.exists) {
    const anomalies = anomaliesDoc.data()?.anomalies || [];
    anomalies.forEach((anomaly: any) => {
      if (anomaly.severity === "high") {
        actionableRecommendations.immediate.push({
          action: `Investiguer ${anomaly.description}`,
          priority: "critical",
          estimatedTime: "2 heures",
          responsibleTeam: "technique",
        });
      }
    });
  }

  // Actions hebdomadaires
  if (churnRiskDoc.exists) {
    const churnData = churnRiskDoc.data()?.data?.churnRiskUsers;
    if (churnData?.highRisk?.length > 0) {
      actionableRecommendations.weekly.push({
        action: `Contacter ${churnData.highRisk.length} utilisateurs à haut risque`,
        priority: "high",
        estimatedTime: "4 heures",
        responsibleTeam: "support",
      });
    }
  }

  // Actions mensuelles
  if (attendancePatternsDoc.exists) {
    const patterns = attendancePatternsDoc.data()?.data;
    const bestDay = patterns?.insights?.bestDayForAttendance;
    const bestTime = patterns?.insights?.bestTimeForAttendance;

    if (bestDay && bestTime) {
      actionableRecommendations.monthly.push({
        action: `Planifier plus d'événements le ${bestDay} à ${bestTime}h`,
        priority: "medium",
        estimatedTime: "1 heure",
        responsibleTeam: "planning",
      });
    }
  }

  // Actions trimestrielles
  if (notificationDoc.exists) {
    const effectiveness = notificationDoc.data()?.data;
    const bestHour = effectiveness?.optimalTiming?.bestHour;

    if (bestHour) {
      actionableRecommendations.quarterly.push({
        action: `Réviser la stratégie de notifications pour optimiser l'envoi à ${bestHour}h`,
        priority: "medium",
        estimatedTime: "8 heures",
        responsibleTeam: "marketing",
      });
    }
  }

  // Sauvegarder les recommandations
  await collections.analytics.doc("actionable_recommendations").set({
    type: "actionable_recommendations",
    recommendations: actionableRecommendations,
    generatedAt: new Date(),
    totalActions: {
      immediate: actionableRecommendations.immediate.length,
      weekly: actionableRecommendations.weekly.length,
      monthly: actionableRecommendations.monthly.length,
      quarterly: actionableRecommendations.quarterly.length,
    },
  });

  logger.info("✅ Actionable recommendations generated", {
    totalRecommendations: Object.values(actionableRecommendations).reduce((sum, arr) => sum + arr.length, 0),
  });
}

async function generateUserInsights(): Promise<void> {
  // Générer des insights sur les utilisateurs
  const insights = {
    userSegmentation: await segmentUsers(),
    engagementPatterns: await analyzeEngagementPatterns(),
    retentionMetrics: await calculateRetentionMetrics(),
    userLifecycle: await analyzeUserLifecycle(),
  };

  await collections.analytics.doc("user_insights").set({
    type: "user_insights",
    data: insights,
    generatedAt: new Date(),
  });
}

async function segmentUsers(): Promise<any> {
  const usersQuery = collections.users.where("status", "==", "active");
  const usersSnapshot = await usersQuery.get();

  type UserSegment = {
    userId: string;
    displayName: any;
    email: any;
    eventsInvited: number;
    eventsAttended: number;
    attendanceRate: number;
    daysSinceLastLogin: number;
  };

  const segments: {
    highlyEngaged: UserSegment[];
    moderatelyEngaged: UserSegment[];
    lowEngaged: UserSegment[];
    atRisk: UserSegment[];
  } = {
    highlyEngaged: [],
    moderatelyEngaged: [],
    lowEngaged: [],
    atRisk: [],
  };

  for (const userDoc of usersSnapshot.docs) {
    const user = userDoc.data();
    const userId = userDoc.id;

    // Analyser l'activité des 90 derniers jours
    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const eventsQuery = collections.events
      .where("participants", "array-contains", userId)
      .where("startDateTime", ">=", last90Days);

    const eventsSnapshot = await eventsQuery.get();

    const attendanceQuery = collections.attendances
      .where("userId", "==", userId)
      .where("createdAt", ">=", last90Days);

    const attendanceSnapshot = await attendanceQuery.get();

    const eventsInvited = eventsSnapshot.size;
    const eventsAttended = attendanceSnapshot.docs.filter((doc) =>
      ["present", "late"].includes(doc.data().status)
    ).length;

    const attendanceRate = eventsInvited > 0 ? (eventsAttended / eventsInvited) * 100 : 0;
    const daysSinceLastLogin = user.lastLoginAt ?
      Math.floor((Date.now() - user.lastLoginAt.toDate().getTime()) / (24 * 60 * 60 * 1000)) :
      999;

    const userSegment = {
      userId,
      displayName: user.displayName,
      email: user.email,
      eventsInvited,
      eventsAttended,
      attendanceRate: Math.round(attendanceRate),
      daysSinceLastLogin,
    };

    // Segmentation basée sur l'engagement
    if (attendanceRate >= 80 && daysSinceLastLogin <= 7) {
      segments.highlyEngaged.push(userSegment);
    } else if (attendanceRate >= 50 && daysSinceLastLogin <= 30) {
      segments.moderatelyEngaged.push(userSegment);
    } else if (attendanceRate >= 20 && daysSinceLastLogin <= 60) {
      segments.lowEngaged.push(userSegment);
    } else {
      segments.atRisk.push(userSegment);
    }
  }

  return {
    highlyEngaged: {count: segments.highlyEngaged.length, users: segments.highlyEngaged.slice(0, 10)},
    moderatelyEngaged: {count: segments.moderatelyEngaged.length, users: segments.moderatelyEngaged.slice(0, 10)},
    lowEngaged: {count: segments.lowEngaged.length, users: segments.lowEngaged.slice(0, 10)},
    atRisk: {count: segments.atRisk.length, users: segments.atRisk.slice(0, 10)},
  };
}

async function analyzeEngagementPatterns(): Promise<any> {
  // Analyser les patterns d'engagement
  const patterns = {
    peakEngagementHours: {} as { [hour: number]: number },
    engagementByDayOfWeek: {} as { [day: string]: number },
    seasonalPatterns: {},
    cohortAnalysis: {},
  };

  // Récupérer les sessions des 30 derniers jours
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sessionsQuery = collections.user_sessions
    .where("createdAt", ">=", last30Days);

  const sessionsSnapshot = await sessionsQuery.get();

  // Analyser par heure
  for (let hour = 0; hour < 24; hour++) {
    patterns.peakEngagementHours[hour] = 0;
  }

  // Analyser par jour de la semaine
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  daysOfWeek.forEach((day) => {
    patterns.engagementByDayOfWeek[day] = 0;
  });

  sessionsSnapshot.docs.forEach((doc) => {
    const session = doc.data();
    const sessionDate = session.createdAt.toDate();

    const hour = sessionDate.getHours();
    const dayOfWeek = daysOfWeek[sessionDate.getDay()];

    patterns.peakEngagementHours[hour]++;
    patterns.engagementByDayOfWeek[dayOfWeek]++;
  });

  return patterns;
}

async function calculateRetentionMetrics(): Promise<any> {
  // Calculer les métriques de rétention
  const cohorts: { [key: string]: any } = {};
  const today = new Date();

  // Analyser les cohortes des 6 derniers mois
  for (let i = 0; i < 6; i++) {
    const cohortMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

    // Utilisateurs créés ce mois-là
    const newUsersQuery = collections.users
      .where("createdAt", ">=", cohortMonth)
      .where("createdAt", "<", nextMonth);

    const newUsersSnapshot = await newUsersQuery.get();
    const cohortSize = newUsersSnapshot.size;

    if (cohortSize > 0) {
      const cohortKey = `${cohortMonth.getFullYear()}-${String(cohortMonth.getMonth() + 1).padStart(2, "0")}`;

      // Calculer la rétention pour chaque mois suivant
      const retention = [];

      for (let j = 1; j <= 6 && cohortMonth.getTime() + j * 30 * 24 * 60 * 60 * 1000 < today.getTime(); j++) {
        const checkMonth = new Date(cohortMonth.getTime() + j * 30 * 24 * 60 * 60 * 1000);

        let activeUsers = 0;
        for (const userDoc of newUsersSnapshot.docs) {
          const userId = userDoc.id;

          // Vérifier si l'utilisateur était actif ce mois-là
          const sessionsQuery = collections.user_sessions
            .where("userId", "==", userId)
            .where("createdAt", ">=", checkMonth)
            .where("createdAt", "<", new Date(checkMonth.getTime() + 30 * 24 * 60 * 60 * 1000))
            .limit(1);

          const sessionsSnapshot = await sessionsQuery.get();
          if (!sessionsSnapshot.empty) {
            activeUsers++;
          }
        }

        retention.push({
          month: j,
          retentionRate: Math.round((activeUsers / cohortSize) * 100),
        });
      }

      cohorts[cohortKey] = {
        cohortSize,
        retention,
      };
    }
  }

  return cohorts;
}

