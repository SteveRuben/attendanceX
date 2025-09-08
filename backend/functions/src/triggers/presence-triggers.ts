/**
 * Triggers Firestore pour la gestion de présence
 */

import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { Employee, LeaveRequest, PresenceEntry, PresenceStatus } from '../shared';
import { presenceNotificationService } from '../services/presence/presence-notification.service';
import { presenceAuditService } from '../services/presence/presence-audit.service';
import { presenceService } from '../services/presence/presence.service';
import { collections, db } from '../config';

/**
 * Trigger déclenché lors de la création d'une nouvelle entrée de présence
 */
export const onPresenceEntryCreated = onDocumentCreated(
  'presence_entries/{entryId}',
  async (event) => {
    try {
      const entryId = event.params.entryId;
      const entry = event.data?.data() as PresenceEntry;

      if (!entry) {
        logger.warn('No data in presence entry creation event', { entryId });
        return;
      }

      logger.info('Processing new presence entry', { entryId, employeeId: entry.employeeId });

      // 1. Calculer automatiquement les métriques de base
      await calculatePresenceMetrics(entryId, entry);

      // 2. Détecter les anomalies
      await detectAndFlagAnomalies(entryId, entry);

      // 3. Envoyer des notifications si nécessaire
      await sendPresenceNotifications(entry, 'created');

      // 4. Mettre à jour les statistiques de l'employé
      await updateEmployeeStats(entry.employeeId, entry);

      // 5. Logger l'événement pour audit
      await presenceAuditService.logAction({
        userId: entry.validatedBy || 'system',
        employeeId: entry.employeeId,
        organizationId: entry.organizationId,
        action: 'presence_entry_created',
        resource: 'presence_entry',
        resourceId: entryId,
        details: {
          date: entry.date,
          clockInTime: entry.clockInTime,
          triggerSource: 'firestore_trigger'
        },
        metadata: {
          ip: 'system',
          userAgent: 'firestore-trigger'
        },
        success: true
      });

      logger.info('Presence entry creation processed successfully', { entryId });

    } catch (error) {
      logger.error('Error processing presence entry creation', { 
        error, 
        entryId: event.params.entryId 
      });
    }
  }
);

/**
 * Trigger déclenché lors de la mise à jour d'une entrée de présence
 */
export const onPresenceEntryUpdated = onDocumentUpdated(
  'presence_entries/{entryId}',
  async (event) => {
    try {
      const entryId = event.params.entryId;
      const beforeData = event.data?.before.data() as PresenceEntry;
      const afterData = event.data?.after.data() as PresenceEntry;

      if (!beforeData || !afterData) {
        logger.warn('Missing data in presence entry update event', { entryId });
        return;
      }

      logger.info('Processing presence entry update', { entryId, employeeId: afterData.employeeId });

      // 1. Recalculer les métriques si nécessaire
      const needsRecalculation = hasSignificantChanges(beforeData, afterData);
      if (needsRecalculation) {
        await calculatePresenceMetrics(entryId, afterData);
        await detectAndFlagAnomalies(entryId, afterData);
      }

      // 2. Envoyer des notifications pour les changements importants
      await handlePresenceUpdateNotifications(beforeData, afterData);

      // 3. Mettre à jour les statistiques de l'employé
      await updateEmployeeStats(afterData.employeeId, afterData, beforeData);

      // 4. Logger les changements pour audit
      await logPresenceChanges(entryId, beforeData, afterData);

      logger.info('Presence entry update processed successfully', { entryId });

    } catch (error) {
      logger.error('Error processing presence entry update', { 
        error, 
        entryId: event.params.entryId 
      });
    }
  }
);

/**
 * Trigger déclenché lors de la suppression d'une entrée de présence
 */
export const onPresenceEntryDeleted = onDocumentDeleted(
  'presence_entries/{entryId}',
  async (event) => {
    try {
      const entryId = event.params.entryId;
      const deletedEntry = event.data?.data() as PresenceEntry;

      if (!deletedEntry) {
        logger.warn('No data in presence entry deletion event', { entryId });
        return;
      }

      logger.info('Processing presence entry deletion', { entryId, employeeId: deletedEntry.employeeId });

      // 1. Mettre à jour les statistiques de l'employé (retirer l'entrée supprimée)
      await updateEmployeeStatsOnDeletion(deletedEntry.employeeId, deletedEntry);

      // 2. Nettoyer les données associées
      await cleanupAssociatedData(entryId, deletedEntry);

      // 3. Logger la suppression pour audit
      await presenceAuditService.logAction({
        userId: 'system', // La suppression peut venir de différentes sources
        employeeId: deletedEntry.employeeId,
        organizationId: deletedEntry.organizationId,
        action: 'presence_entry_deleted',
        resource: 'presence_entry',
        resourceId: entryId,
        details: {
          deletedEntry: {
            date: deletedEntry.date,
            clockInTime: deletedEntry.clockInTime,
            clockOutTime: deletedEntry.clockOutTime,
            totalHours: deletedEntry.totalHours
          },
          triggerSource: 'firestore_trigger'
        },
        metadata: {
          ip: 'system',
          userAgent: 'firestore-trigger'
        },
        success: true
      });

      logger.info('Presence entry deletion processed successfully', { entryId });

    } catch (error) {
      logger.error('Error processing presence entry deletion', { 
        error, 
        entryId: event.params.entryId 
      });
    }
  }
);

/**
 * Trigger déclenché lors de la création d'un nouvel employé
 */
export const onEmployeeCreated = onDocumentCreated(
  'employees/{employeeId}',
  async (event) => {
    try {
      const employeeId = event.params.employeeId;
      const employee = event.data?.data() as Employee;

      if (!employee) {
        logger.warn('No data in employee creation event', { employeeId });
        return;
      }

      logger.info('Processing new employee creation', { employeeId, organizationId: employee.organizationId });

      // 1. Initialiser les statistiques de présence de l'employé
      await initializeEmployeePresenceStats(employeeId, employee);

      // 2. Envoyer une notification de bienvenue avec les informations de présence
      await sendWelcomePresenceNotification(employee);

      // 3. Logger la création pour audit
      await presenceAuditService.logAction({
        userId: employee.createdBy || 'system',
        employeeId: employeeId,
        organizationId: employee.organizationId,
        action: 'employee_created',
        resource: 'employee',
        resourceId: employeeId,
        details: {
          position: employee.position,
          hireDate: employee.hireDate,
          triggerSource: 'firestore_trigger'
        },
        metadata: {
          ip: 'system',
          userAgent: 'firestore-trigger'
        },
        success: true
      });

      logger.info('Employee creation processed successfully', { employeeId });

    } catch (error) {
      logger.error('Error processing employee creation', { 
        error, 
        employeeId: event.params.employeeId 
      });
    }
  }
);

/**
 * Trigger déclenché lors de la mise à jour d'une demande de congé
 */
export const onLeaveRequestUpdated = onDocumentUpdated(
  'leave_requests/{requestId}',
  async (event) => {
    try {
      const requestId = event.params.requestId;
      const beforeData = event.data?.before.data() as LeaveRequest;
      const afterData = event.data?.after.data() as LeaveRequest;

      if (!beforeData || !afterData) {
        logger.warn('Missing data in leave request update event', { requestId });
        return;
      }

      // Vérifier si le statut a changé vers approuvé
      if (beforeData.status !== 'approved' && afterData.status === 'approved') {
        logger.info('Processing approved leave request', { requestId, employeeId: afterData.employeeId });

        // 1. Marquer les jours de congé dans le système de présence
        await markLeaveDaysInPresenceSystem(afterData);

        // 2. Envoyer une notification d'approbation
        await presenceNotificationService.sendLeaveApprovalNotification(afterData);

        // 3. Mettre à jour les soldes de congés
        await updateLeaveBalances(afterData);
      }

      // Vérifier si le statut a changé vers rejeté
      if (beforeData.status !== 'rejected' && afterData.status === 'rejected') {
        logger.info('Processing rejected leave request', { requestId, employeeId: afterData.employeeId });

        // Envoyer une notification de rejet
        await presenceNotificationService.sendLeaveRejectionNotification(afterData);
      }

    } catch (error) {
      logger.error('Error processing leave request update', { 
        error, 
        requestId: event.params.requestId 
      });
    }
  }
);

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Calculer les métriques de présence pour une entrée
 */
async function calculatePresenceMetrics(entryId: string, entry: PresenceEntry): Promise<void> {
  try {
    const updates: Partial<PresenceEntry> = {};

    // Calculer les heures totales si clock-out est présent
    if (entry.clockInTime && entry.clockOutTime) {
      const totalMs = entry.clockOutTime.getTime() - entry.clockInTime.getTime();
      updates.totalHours = totalMs / (1000 * 60 * 60);

      // Calculer les heures de pause
      if (entry.breakEntries && entry.breakEntries.length > 0) {
        const totalBreakMs = entry.breakEntries.reduce((total, breakEntry) => {
          if (breakEntry.startTime && breakEntry.endTime) {
            return total + (breakEntry.endTime.getTime() - breakEntry.startTime.getTime());
          }
          return total;
        }, 0);
        
        updates.totalBreakHours = totalBreakMs / (1000 * 60 * 60);
        updates.effectiveHours = updates.totalHours - updates.totalBreakHours;
      } else {
        updates.effectiveHours = updates.totalHours;
      }
    }

    // Calculer le statut de présence
    if (entry.clockInTime) {
      // Comparer avec l'horaire de travail pour déterminer si en retard
      const status = await calculatePresenceStatus(entry);
      updates.status = status;
    }

    // Mettre à jour l'entrée si des changements sont nécessaires
    if (Object.keys(updates).length > 0) {
      await collections.presence_entries
        .doc(entryId)
        .update({
          ...updates,
          updatedAt: new Date()
        });
    }

  } catch (error) {
    logger.error('Error calculating presence metrics', { error, entryId });
  }
}

/**
 * Détecter et marquer les anomalies dans une entrée de présence
 */
async function detectAndFlagAnomalies(entryId: string, entry: PresenceEntry): Promise<void> {
  try {
    const anomalies = await presenceService.detectAnomalies([entry]);
    
    if (anomalies.length > 0) {
      const entryAnomalies = anomalies.find(a => a.entryId === entryId);
      
      if (entryAnomalies) {
        await collections.presence_entries
          .doc(entryId)
          .update({
            hasAnomalies: true,
            anomalyTypes: entryAnomalies.types,
            anomalyDetails: entryAnomalies.details,
            updatedAt: new Date()
          });

        // Envoyer une notification d'anomalie si critique
        if (entryAnomalies.severity === 'high') {
          await presenceNotificationService.sendAnomalyAlert(entry, entryAnomalies);
        }
      }
    }

  } catch (error) {
    logger.error('Error detecting anomalies', { error, entryId });
  }
}

/**
 * Envoyer des notifications liées à la présence
 */
async function sendPresenceNotifications(entry: PresenceEntry, action: 'created' | 'updated'): Promise<void> {
  try {
    // Notifications pour clock-in tardif
    if (entry.clockInTime && action === 'created') {
      // TODO: Vérifier si l'employé est en retard et envoyer une notification
    }

    // Notifications pour oubli de clock-out
    if (!entry.clockOutTime && action === 'updated') {
      const now = new Date();
      const entryDate = new Date(entry.date);
      
      // Si c'est le lendemain et pas de clock-out, envoyer un rappel
      if (now.getDate() > entryDate.getDate() && now.getMonth() === entryDate.getMonth()) {
        await presenceNotificationService.sendMissedClockOutReminder(entry);
      }
    }

  } catch (error) {
    logger.error('Error sending presence notifications', { error, entryId: entry.id });
  }
}

/**
 * Mettre à jour les statistiques de l'employé
 */
async function updateEmployeeStats(employeeId: string, entry: PresenceEntry, previousEntry?: PresenceEntry): Promise<void> {
  try {
    // Implémenter la mise à jour des statistiques de l'employé
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const statsDocId = `${employeeId}_${currentMonth}`;
    
    const statsRef = collections.employee_presence_stats.doc(statsDocId);
    const statsDoc = await statsRef.get();
    
    let stats = {
      employeeId,
      month: currentMonth,
      totalWorkDays: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalEarlyLeave: 0,
      totalOvertimeHours: 0,
      totalWorkHours: 0,
      averageWorkHours: 0,
      attendanceRate: 0,
      lastUpdated: new Date()
    };

    if (statsDoc.exists) {
      stats = { ...stats, ...statsDoc.data() };
    }

    // Mettre à jour les statistiques selon le statut
    if (!previousEntry) {
      // Nouvelle entrée
      stats.totalWorkDays++;
      
      switch (entry.status) {
        case 'present':
          stats.totalPresent++;
          break;
        case 'late':
          stats.totalLate++;
          stats.totalPresent++;
          break;
        case 'early_leave':
          stats.totalEarlyLeave++;
          stats.totalPresent++;
          break;
        case 'overtime':
          stats.totalPresent++;
          break;
        case 'absent':
          stats.totalAbsent++;
          break;
      }
    }

    // Mettre à jour les heures
    if (entry.actualWorkHours) {
      if (previousEntry?.actualWorkHours) {
        stats.totalWorkHours = stats.totalWorkHours - previousEntry.actualWorkHours + entry.actualWorkHours;
      } else {
        stats.totalWorkHours += entry.actualWorkHours;
      }
    }

    if (entry.overtimeHours) {
      if (previousEntry?.overtimeHours) {
        stats.totalOvertimeHours = stats.totalOvertimeHours - previousEntry.overtimeHours + entry.overtimeHours;
      } else {
        stats.totalOvertimeHours += entry.overtimeHours;
      }
    }

    // Calculer les moyennes
    stats.averageWorkHours = stats.totalWorkDays > 0 ? stats.totalWorkHours / stats.totalWorkDays : 0;
    stats.attendanceRate = stats.totalWorkDays > 0 ? (stats.totalPresent / stats.totalWorkDays) * 100 : 0;
    stats.lastUpdated = new Date();

    // Sauvegarder les statistiques
    await statsRef.set(stats, { merge: true });

    logger.debug('Employee stats updated successfully', { 
      employeeId, 
      entryId: entry.id,
      attendanceRate: stats.attendanceRate
    });

  } catch (error) {
    logger.error('Error updating employee stats', { error, employeeId });
  }
}

/**
 * Vérifier si une mise à jour nécessite un recalcul des métriques
 */
function hasSignificantChanges(before: PresenceEntry, after: PresenceEntry): boolean {
  return (
    before.clockInTime?.getTime() !== after.clockInTime?.getTime() ||
    before.clockOutTime?.getTime() !== after.clockOutTime?.getTime() ||
    JSON.stringify(before.breakEntries) !== JSON.stringify(after.breakEntries)
  );
}

/**
 * Gérer les notifications pour les mises à jour de présence
 */
async function handlePresenceUpdateNotifications(before: PresenceEntry, after: PresenceEntry): Promise<void> {
  try {
    // Notification si clock-out ajouté
    if (!before.clockOutTime && after.clockOutTime) {
      await presenceNotificationService.sendClockOutConfirmation(after);
    }

    // Notification si validation changée
    if (before.isValidated !== after.isValidated && after.isValidated) {
      await presenceNotificationService.sendValidationNotification(after);
    }

  } catch (error) {
    logger.error('Error handling presence update notifications', { error });
  }
}

/**
 * Logger les changements pour audit
 */
async function logPresenceChanges(entryId: string, before: PresenceEntry, after: PresenceEntry): Promise<void> {
  try {
    const changes: Record<string, { before: any; after: any }> = {};

    // Détecter les changements significatifs
    if (before.clockInTime?.getTime() !== after.clockInTime?.getTime()) {
      changes.clockInTime = { before: before.clockInTime, after: after.clockInTime };
    }

    if (before.clockOutTime?.getTime() !== after.clockOutTime?.getTime()) {
      changes.clockOutTime = { before: before.clockOutTime, after: after.clockOutTime };
    }

    if (before.isValidated !== after.isValidated) {
      changes.isValidated = { before: before.isValidated, after: after.isValidated };
    }

    if (Object.keys(changes).length > 0) {
      await presenceAuditService.logAction({
        userId: after.validatedBy || 'system',
        employeeId: after.employeeId,
        organizationId: after.organizationId,
        action: 'presence_entry_updated',
        resource: 'presence_entry',
        resourceId: entryId,
        details: {
          changes,
          triggerSource: 'firestore_trigger'
        },
        metadata: {
          ip: 'system',
          userAgent: 'firestore-trigger'
        },
        success: true
      });
    }

  } catch (error) {
    logger.error('Error logging presence changes', { error, entryId });
  }
}

/**
 * Mettre à jour les statistiques lors de la suppression
 */
async function updateEmployeeStatsOnDeletion(employeeId: string, deletedEntry: PresenceEntry): Promise<void> {
  try {
    // TODO: Implémenter la mise à jour des statistiques lors de la suppression
    logger.debug('Employee stats update on deletion triggered', { employeeId, entryId: deletedEntry.id });

  } catch (error) {
    logger.error('Error updating employee stats on deletion', { error, employeeId });
  }
}

/**
 * Nettoyer les données associées lors de la suppression
 */
async function cleanupAssociatedData(entryId: string, deletedEntry: PresenceEntry): Promise<void> {
  try {
    // Nettoyer les notifications liées à cette entrée
    const notificationsQuery = collections.presence_notifications
      .where('relatedEntryId', '==', entryId);

    const notificationsSnapshot = await notificationsQuery.get();
    
    if (!notificationsSnapshot.empty) {
      const batch = db.batch();
      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

  } catch (error) {
    logger.error('Error cleaning up associated data', { error, entryId });
  }
}

/**
 * Initialiser les statistiques de présence pour un nouvel employé
 */
async function initializeEmployeePresenceStats(employeeId: string, employee: Employee): Promise<void> {
  try {
    // TODO: Créer un document de statistiques initial pour l'employé
    logger.debug('Employee presence stats initialization triggered', { employeeId });

  } catch (error) {
    logger.error('Error initializing employee presence stats', { error, employeeId });
  }
}

/**
 * Envoyer une notification de bienvenue avec les informations de présence
 */
async function sendWelcomePresenceNotification(employee: Employee): Promise<void> {
  try {
    await presenceNotificationService.sendWelcomeNotification(employee);

  } catch (error) {
    logger.error('Error sending welcome presence notification', { error, employeeId: employee.id });
  }
}

/**
 * Marquer les jours de congé dans le système de présence
 */
async function markLeaveDaysInPresenceSystem(leaveRequest: LeaveRequest): Promise<void> {
  try {
    // TODO: Créer des entrées de présence spéciales pour les jours de congé
    logger.debug('Marking leave days in presence system', { 
      requestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId 
    });

  } catch (error) {
    logger.error('Error marking leave days', { error, requestId: leaveRequest.id });
  }
}

/**
 * Mettre à jour les soldes de congés
 */
async function updateLeaveBalances(leaveRequest: LeaveRequest): Promise<void> {
  try {
    // TODO: Décrémenter le solde de congés de l'employé
    logger.debug('Updating leave balances', { 
      requestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId 
    });

  } catch (error) {
    logger.error('Error updating leave balances', { error, requestId: leaveRequest.id });
  }
}

/**
 * Calculer le statut de présence en comparant avec l'horaire de travail
 */
async function calculatePresenceStatus(entry: PresenceEntry): Promise<PresenceStatus> {
  try {
    // Récupérer l'horaire de travail de l'employé
    const workScheduleDoc = await collections.work_schedules
      .where('employeeId', '==', entry.employeeId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (workScheduleDoc.empty) {
      // Pas d'horaire défini, considérer comme présent si clock-in existe
      return entry.clockOutTime ? PresenceStatus.PRESENT : PresenceStatus.PRESENT;
    }

    const workSchedule = workScheduleDoc.docs[0].data();
    const entryDate = new Date(entry.date);
    const dayOfWeek = entryDate.getDay();

    // Récupérer l'horaire pour ce jour de la semaine
    const daySchedule = workSchedule.weeklyPattern?.[dayOfWeek];
    
    if (!daySchedule || !daySchedule.isWorkDay) {
      // Pas un jour de travail, mais présence enregistrée = overtime
      return PresenceStatus.OVERTIME;
    }

    const scheduledStartTime = daySchedule.startTime;
    const scheduledEndTime = daySchedule.endTime;
    
    // Convertir les heures en minutes pour faciliter la comparaison
    const clockInMinutes = entry.clockInTime ? 
      entry.clockInTime.getHours() * 60 + entry.clockInTime.getMinutes() : 0;
    const scheduledStartMinutes = timeToMinutes(scheduledStartTime);
    const scheduledEndMinutes = timeToMinutes(scheduledEndTime);

    // Déterminer le statut selon l'heure d'arrivée
    let status = PresenceStatus.PRESENT;

    // Vérifier si en retard (tolérance de 15 minutes)
    const lateThreshold = 15;
    if (clockInMinutes > scheduledStartMinutes + lateThreshold) {
      status = PresenceStatus.LATE;
    }

    // Vérifier si départ anticipé
    if (entry.clockOutTime) {
      const clockOutMinutes = entry.clockOutTime.getHours() * 60 + entry.clockOutTime.getMinutes();
      const earlyLeaveThreshold = 15;
      
      if (clockOutMinutes < scheduledEndMinutes - earlyLeaveThreshold) {
        status = PresenceStatus.EARLY_LEAVE;
      }
      
      // Vérifier les heures supplémentaires
      const overtimeThreshold = 30;
      if (clockOutMinutes > scheduledEndMinutes + overtimeThreshold) {
        status = PresenceStatus.OVERTIME;
      }
    }

    return status;

  } catch (error) {
    logger.error('Error calculating presence status', { error, entryId: entry.id });
    // En cas d'erreur, retourner un statut par défaut
    return entry.clockOutTime ? PresenceStatus.PRESENT : PresenceStatus.PRESENT;
  }
}

/**
 * Convertir une heure au format "HH:MM" en minutes
 */
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}