/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
/*
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated, onSchedule } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';


// Middleware
import { globalErrorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';

// Services
import { notificationService } from './services/notification.service';
import { reportService } from './services/report.service';
import { mlService } from './services/ml.service';

// 🔥 Initialiser Firebase Admin
initializeApp();

// 🚀 Créer l'application Express
const app = express();

// 🛡️ Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 🌐 CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://attendance-x.app', 'https://admin.attendance-x.app']
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 📦 Body parsing & compression
app.use(compression());
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf.length > 10 * 1024 * 1024) {
      throw new Error('Payload too large');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 📝 Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(logger);


// 🚨 Global error handler (must be last)
app.use(globalErrorHandler);

// 🔥 Export Firebase Functions

// 🌐 Main API function
export const api = onRequest({
  timeoutSeconds: 300,
  memory: '2GiB',
  maxInstances: 100,
  cors: true,
  invoker: 'public'
}, app);

// 📅 Scheduled functions
export const dailyCleanup = onSchedule({
  schedule: 'every day 02:00',
  timeZone: 'Europe/Paris'
}, async (event) => {
  console.log('Starting daily cleanup...');

  await reportService.cleanupExpiredReports();
  await notificationService.cleanupOldNotifications();

  console.log('Daily cleanup completed');
});

export const weeklyAnalytics = onSchedule({
  schedule: 'every sunday 03:00',
  timeZone: 'Europe/Paris'
}, async (event) => {
  console.log('Starting weekly analytics generation...');

  await mlService.generateWeeklyInsights();

  console.log('Weekly analytics completed');
});

// 🔔 Firestore triggers
export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const userId = event.params.userId;
  const userData = event.data?.data();

  console.log('New user created:', userId);

  await notificationService.sendWelcomeNotification(userId, userData);
});

export const onEventStatusChanged = onDocumentUpdated('events/{eventId}', async (event) => {
  const eventId = event.params.eventId;
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (beforeData?.status !== afterData?.status) {
    console.log('Event status changed:', beforeData?.status, '->', afterData?.status);

    await notificationService.handleEventStatusChange(eventId, afterData?.status, afterData);
  }
});

export const onAttendanceMarked = onDocumentCreated('attendances/{attendanceId}', async (event) => {
  const attendanceId = event.params.attendanceId;
  const attendanceData = event.data?.data();

  console.log('New attendance marked:', attendanceId);

  await mlService.updateAttendancePatterns(attendanceData);

  if (attendanceData?.requiresValidation) {
    await notificationService.sendValidationRequest(attendanceData);
  }
});

// 🔄 Reminder scheduler
export const sendReminders = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'Europe/Paris'
}, async (event) => {
  console.log('Checking for scheduled reminders...');

  await notificationService.processScheduledReminders();
});

console.log('✅ Attendance-X Functions deployed successfully');
*/
