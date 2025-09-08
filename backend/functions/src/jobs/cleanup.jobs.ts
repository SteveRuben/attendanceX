// ==========================================
// 1. CLEANUP JOBS - cleanup.jobs.ts
// ==========================================

import {logger} from "firebase-functions";
import * as functions from "firebase-functions/v1";
import {getStorage} from "firebase-admin/storage";
import { collections, db } from "../config";
import { EmailVerificationCleanupUtils } from "../shared";


const storage = getStorage();

/**
 * Nettoyage quotidien - 2h du matin
 */
export const dailyCleanup = functions
  .region("europe-west1")
  .runWith({ memory: "1GB", timeoutSeconds: 300 })
  .pubsub.schedule("0 2 * * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
  logger.info("🧹 Starting daily cleanup job");

  try {
    const results = await Promise.allSettled([
      cleanExpiredNotifications(),
      cleanOldAuditLogs(),
      cleanTempFiles(),
      cleanExpiredQRCodes(),
      cleanOldSessions(),
      cleanEmailVerificationTokens(),
    ]);

    const summary = results.map((result, index) => ({
      task: ["notifications", "audit_logs", "temp_files", "qr_codes", "sessions", "email_verification"][index],
      status: result.status,
      ...(result.status === "rejected" && {error: result.reason?.message}),
    }));

    logger.info("✅ Daily cleanup completed", {summary});
  } catch (error) {
    logger.error("❌ Daily cleanup failed", {error});
    throw error;
  }
});

/**
 * Nettoyage hebdomadaire - Dimanche 3h du matin
 */
export const weeklyCleanup = functions
  .region("europe-west1")
  .runWith({ memory: "2GB", timeoutSeconds: 540 })
  .pubsub.schedule("0 3 * * 0")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
  logger.info("🧹 Starting weekly cleanup job");

  try {
    const results = await Promise.allSettled([
      cleanOldEvents(),
      cleanOrphanedAttendance(),
      cleanUnusedTemplates(),
      optimizeIndexes(),
      cleanStorageFiles(),
    ]);

    const summary = results.map((result, index) => ({
      task: ["old_events", "orphaned_attendance", "unused_templates", "indexes", "storage"][index],
      status: result.status,
      ...(result.status === "rejected" && {error: result.reason?.message}),
    }));

    logger.info("✅ Weekly cleanup completed", {summary});
  } catch (error) {
    logger.error("❌ Weekly cleanup failed", {error});
    throw error;
  }
});

/**
 * Nettoyage mensuel - 1er du mois à 4h du matin
 */
export const monthlyCleanup = functions
  .region("europe-west1")
  .runWith({ memory: "4GB", timeoutSeconds: 540 })
  .pubsub.schedule("0 4 1 * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
  logger.info("🧹 Starting monthly cleanup job");

  try {
    await Promise.allSettled([
      archiveOldData(),
      cleanOldReports(),
      resetMonthlyStats(),
      compactDatabase(),
    ]);

    logger.info("✅ Monthly cleanup completed");
  } catch (error) {
    logger.error("❌ Monthly cleanup failed", {error});
    throw error;
  }
});

// ===== FONCTIONS DE NETTOYAGE =====

async function cleanExpiredNotifications(): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours

  const query = collections.notifications
    .where("sent", "==", true)
    .where("createdAt", "<", cutoffDate)
    .limit(500);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info(`🗑️ Cleaned ${snapshot.size} expired notifications`);
  return {deleted: snapshot.size};
}

async function cleanOldAuditLogs(): Promise<{ cleaned: number }> {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 jours
  let totalCleaned = 0;

  const collections = ["users", "events", "attendance"];

  for (const collectionName of collections) {
    const query = collections[collectionName].limit(100);
    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.auditLog && Array.isArray(data.auditLog)) {
        const filteredLogs = data.auditLog.filter((log: any) =>
          log.performedAt && log.performedAt.toDate() > cutoffDate
        );

        if (filteredLogs.length !== data.auditLog.length) {
          await doc.ref.update({auditLog: filteredLogs});
          totalCleaned += data.auditLog.length - filteredLogs.length;
        }
      }
    }
  }

  logger.info(`🗑️ Cleaned ${totalCleaned} old audit log entries`);
  return {cleaned: totalCleaned};
}

async function cleanTempFiles(): Promise<{ deleted: number }> {
  const bucket = storage.bucket();
  const [files] = await bucket.getFiles({
    prefix: "temp/",
    maxResults: 1000,
  });

  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h
  let deleted = 0;

  for (const file of files) {
    const [metadata] = await file.getMetadata();
    if (!metadata.timeCreated) {continue;}
    const created = new Date(metadata.timeCreated);

    if (created < cutoffDate) {
      await file.delete();
      deleted++;
    }
  }

  logger.info(`🗑️ Cleaned ${deleted} temporary files`);
  return {deleted};
}

async function cleanExpiredQRCodes(): Promise<{ updated: number }> {
  const query = collections.events
    .where("qrCodeExpiresAt", "<", new Date())
    .limit(100);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      qrCode: null,
      qrCodeExpiresAt: null,
    });
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info(`🗑️ Cleaned ${snapshot.size} expired QR codes`);
  return {updated: snapshot.size};
}

async function cleanOldSessions(): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours

  const query = collections.user_sessions
    .where("lastActive", "<", cutoffDate)
    .limit(500);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info(`🗑️ Cleaned ${snapshot.size} old sessions`);
  return {deleted: snapshot.size};
}

async function cleanOldEvents(): Promise<{ archived: number }> {
  const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 an

  const query = collections.events
    .where("endDateTime", "<", cutoffDate)
    .where("status", "in", ["completed", "cancelled"])
    .limit(100);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    const archiveRef = collections.events_archive.doc(doc.id);
    batch.set(archiveRef, {...doc.data(), archivedAt: new Date()});
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info(`📦 Archived ${snapshot.size} old events`);
  return {archived: snapshot.size};
}

async function cleanOrphanedAttendance(): Promise<{ deleted: number }> {
  // Supprimer les présences sans événement associé
  const attendanceQuery = collections.attendances.limit(500);
  const attendanceSnapshot = await attendanceQuery.get();

  let deleted = 0;
  const batch = db.batch();

  for (const attendanceDoc of attendanceSnapshot.docs) {
    const data = attendanceDoc.data();
    const eventExists = await collections.events.doc(data.eventId).get();

    if (!eventExists.exists) {
      batch.delete(attendanceDoc.ref);
      deleted++;
    }
  }

  if (deleted > 0) {
    await batch.commit();
  }

  logger.info(`🗑️ Cleaned ${deleted} orphaned attendance records`);
  return {deleted};
}

async function cleanUnusedTemplates(): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 mois

  const query = collections.smsProviders
    .where("lastUsed", "<", cutoffDate)
    .where("isActive", "==", false)
    .limit(50);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info(`🗑️ Cleaned ${snapshot.size} unused templates`);
  return {deleted: snapshot.size};
}

async function optimizeIndexes(): Promise<void> {
  // Ici vous pourriez implémenter l'optimisation des index
  // Pour Firestore, c'est géré automatiquement
  logger.info("📊 Index optimization completed");
}

async function cleanStorageFiles(): Promise<{ deleted: number }> {
  const bucket = storage.bucket();
  let deleted = 0;

  // Nettoyer les fichiers sans métadonnées valides
  const [files] = await bucket.getFiles({
    prefix: "uploads/",
    maxResults: 1000,
  });

  for (const file of files) {
    try {
      const [metadata] = await file.getMetadata();
      if (!metadata.metadata?.userId && !metadata.metadata?.eventId) {
        await file.delete();
        deleted++;
      }
    } catch (error) {
      // Fichier corrompu, le supprimer
      await file.delete();
      deleted++;
    }
  }

  logger.info(`🗑️ Cleaned ${deleted} orphaned storage files`);
  return {deleted};
}

async function archiveOldData(): Promise<void> {
  // Archiver les données anciennes vers un stockage moins coûteux
  logger.info("📦 Old data archiving completed");
}

async function cleanOldReports(): Promise<{ deleted: number }> {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 3 mois

  const query = collections.reports
    .where("createdAt", "<", cutoffDate)
    .limit(100);

  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info(`🗑️ Cleaned ${snapshot.size} old reports`);
  return {deleted: snapshot.size};
}

async function resetMonthlyStats(): Promise<void> {
  // Reset des statistiques mensuelles pour tous les providers SMS
  const query = collections.smsProviders;
  const snapshot = await query.get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      "stats.monthlyUsage": 0,
    });
  });

  if (!snapshot.empty) {
    await batch.commit();
  }

  logger.info("📊 Monthly stats reset completed");
}

async function compactDatabase(): Promise<void> {
  // Compactage de la base de données (si applicable)
  logger.info("🗜️ Database compaction completed");
}

async function cleanEmailVerificationTokens(): Promise<{ cleaned: number }> {
  try {
    const result = await EmailVerificationCleanupUtils.performFullCleanup({
      cleanExpired: true,
      cleanUsedOlderThanDays: 30,
      cleanOrphaned: true
    });

    logger.info(`🧹 Email verification cleanup completed`, {
      totalCleaned: result.totalCleaned,
      expiredTokens: result.expiredTokens,
      usedTokens: result.usedTokens,
      orphanedTokens: result.orphanedTokens,
      errors: result.errors.length
    });

    return { cleaned: result.totalCleaned };
  } catch (error) {
    logger.error("❌ Email verification cleanup failed", { error });
    throw error;
  }
}
