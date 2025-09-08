// backend/functions/src/services/time-tracking.service.ts - Service d'intégration du suivi du temps

import { getFirestore } from "firebase-admin/firestore";
import { ERROR_CODES } from "../shared";

export interface TimeEntry {
  id: string;
  userId: string;
  eventId: string;
  attendanceId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // en minutes
  category: 'work_time' | 'training_time' | 'overtime' | 'compensatory_time';
  isCompensated: boolean;
  compensationRate: number; // multiplicateur (1.0 = normal, 1.5 = overtime, etc.)
  description?: string;
  projectCode?: string;
  costCenter?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  payrollProcessed: boolean;
  payrollBatchId?: string;
  notes?: string;
}

export interface PayrollIntegration {
  id: string;
  organizationId: string;
  systemType: 'sage' | 'adp' | 'workday' | 'bamboohr' | 'custom';
  apiEndpoint?: string;
  apiKey?: string;
  mappingConfig: {
    employeeIdField: string;
    timeEntryFields: Record<string, string>;
    categoryMapping: Record<string, string>;
  };
  isActive: boolean;
  lastSyncAt?: Date;
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
}

export interface CompensationRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  conditions: {
    eventTypes?: string[];
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[]; // 0-6, 0 = dimanche
    isWeekend?: boolean;
    isHoliday?: boolean;
    minimumDuration?: number; // en minutes
  };
  compensation: {
    type: 'time_off' | 'overtime_pay' | 'bonus' | 'none';
    rate: number; // multiplicateur ou montant fixe
    maxHoursPerMonth?: number;
    carryOverAllowed?: boolean;
  };
  isActive: boolean;
  priority: number; // pour résoudre les conflits entre règles
}

export class TimeTrackingService {
  private readonly db = getFirestore();

  /**
   * Créer une entrée de temps basée sur la présence
   */
  async createTimeEntryFromAttendance(
    attendanceId: string,
    category: TimeEntry['category'] = 'training_time'
  ): Promise<TimeEntry> {
    try {
      // Récupérer les données de présence
      const attendanceDoc = await this.db.collection('attendance_records').doc(attendanceId).get();
      if (!attendanceDoc.exists) {
        throw new Error('Attendance record not found');
      }

      const attendance = attendanceDoc.data();
      if (!attendance) {
        throw new Error('Invalid attendance data');
      }

      // Calculer la durée
      const startTime = attendance.checkInTime?.toDate() || new Date();
      const endTime = attendance.checkOutTime?.toDate();
      const duration = endTime 
        ? Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
        : 0;

      // Déterminer les règles de compensation applicables
      const compensationRule = await this.findApplicableCompensationRule(
        attendance.organizationId,
        attendance.eventId,
        startTime,
        duration
      );

      const timeEntryId = this.db.collection('time_entries').doc().id;
      const timeEntry: TimeEntry = {
        id: timeEntryId,
        userId: attendance.userId,
        eventId: attendance.eventId,
        attendanceId,
        startTime,
        endTime,
        duration,
        category,
        isCompensated: compensationRule !== null,
        compensationRate: compensationRule?.compensation.rate || 1.0,
        description: `Participation à l'événement: ${attendance.eventTitle || 'N/A'}`,
        approvalStatus: 'pending',
        payrollProcessed: false
      };

      // Ajouter les informations de projet/centre de coût si disponibles
      if (attendance.projectCode) {
        timeEntry.projectCode = attendance.projectCode;
      }
      if (attendance.costCenter) {
        timeEntry.costCenter = attendance.costCenter;
      }

      await this.db.collection('time_entries').doc(timeEntryId).set(timeEntry);

      // Déclencher l'approbation automatique si configurée
      if (compensationRule?.compensation.type !== 'none') {
        await this.processAutoApproval(timeEntry);
      }

      return timeEntry;
    } catch (error) {
      console.error('Error creating time entry from attendance:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Traiter les entrées de temps en lot pour un événement
   */
  async processBulkTimeEntries(eventId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      // Récupérer toutes les présences de l'événement
      const attendancesQuery = await this.db
        .collection('attendance_records')
        .where('eventId', '==', eventId)
        .where('status', '==', 'present')
        .get();

      let processedCount = 0;
      const errors: string[] = [];

      for (const attendanceDoc of attendancesQuery.docs) {
        try {
          // Vérifier si une entrée de temps existe déjà
          const existingTimeEntry = await this.db
            .collection('time_entries')
            .where('attendanceId', '==', attendanceDoc.id)
            .limit(1)
            .get();

          if (existingTimeEntry.empty) {
            await this.createTimeEntryFromAttendance(attendanceDoc.id);
            processedCount++;
          }
        } catch (error: any) {
          errors.push(`${attendanceDoc.id}: ${error.message}`);
        }
      }

      return { processed: processedCount, errors };
    } catch (error) {
      console.error('Error processing bulk time entries:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Approuver des entrées de temps
   */
  async approveTimeEntries(
    timeEntryIds: string[],
    approverId: string,
    notes?: string
  ): Promise<{ approved: number; errors: string[] }> {
    try {
      let approvedCount = 0;
      const errors: string[] = [];

      for (const timeEntryId of timeEntryIds) {
        try {
          const timeEntryRef = this.db.collection('time_entries').doc(timeEntryId);
          const timeEntryDoc = await timeEntryRef.get();

          if (!timeEntryDoc.exists) {
            errors.push(`Time entry ${timeEntryId} not found`);
            continue;
          }

          await timeEntryRef.update({
            approvalStatus: 'approved',
            approvedBy: approverId,
            approvedAt: new Date(),
            notes: notes || timeEntryDoc.data()?.notes
          });

          approvedCount++;
        } catch (error: any) {
          errors.push(`${timeEntryId}: ${error.message}`);
        }
      }

      return { approved: approvedCount, errors };
    } catch (error) {
      console.error('Error approving time entries:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Synchroniser avec le système de paie
   */
  async syncWithPayrollSystem(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    synced: number;
    failed: number;
    batchId: string;
    errors: string[];
  }> {
    try {
      // Récupérer la configuration d'intégration
      const integrationDoc = await this.db
        .collection('payroll_integrations')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (integrationDoc.empty) {
        throw new Error('No active payroll integration found');
      }

      const integration = integrationDoc.docs[0].data() as PayrollIntegration;

      // Récupérer les entrées de temps approuvées non traitées
      const timeEntriesQuery = await this.db
        .collection('time_entries')
        .where('approvalStatus', '==', 'approved')
        .where('payrollProcessed', '==', false)
        .where('startTime', '>=', startDate)
        .where('startTime', '<=', endDate)
        .get();

      const batchId = `batch_${Date.now()}`;
      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Grouper par utilisateur
      const entriesByUser = new Map<string, TimeEntry[]>();
      timeEntriesQuery.docs.forEach(doc => {
        const entry = doc.data() as TimeEntry;
        if (!entriesByUser.has(entry.userId)) {
          entriesByUser.set(entry.userId, []);
        }
        entriesByUser.get(entry.userId)!.push(entry);
      });

      // Synchroniser pour chaque utilisateur
      for (const [userId, entries] of entriesByUser) {
        try {
          const payrollData = await this.formatForPayrollSystem(entries, integration);
          
          // Envoyer au système de paie (simulation)
          const success = await this.sendToPayrollSystem(payrollData, integration);
          
          if (success) {
            // Marquer les entrées comme traitées
            for (const entry of entries) {
              await this.db.collection('time_entries').doc(entry.id).update({
                payrollProcessed: true,
                payrollBatchId: batchId
              });
            }
            syncedCount += entries.length;
          } else {
            failedCount += entries.length;
            errors.push(`Failed to sync entries for user ${userId}`);
          }
        } catch (error: any) {
          failedCount += entries.length;
          errors.push(`User ${userId}: ${error.message}`);
        }
      }

      // Mettre à jour la date de dernière synchronisation
      await integrationDoc.docs[0].ref.update({
        lastSyncAt: new Date()
      });

      return {
        synced: syncedCount,
        failed: failedCount,
        batchId,
        errors
      };
    } catch (error) {
      console.error('Error syncing with payroll system:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir le rapport de temps pour une période
   */
  async getTimeReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<{
    summary: {
      totalHours: number;
      workHours: number;
      trainingHours: number;
      overtimeHours: number;
      compensatoryHours: number;
    };
    entries: TimeEntry[];
    byCategory: Record<string, number>;
    byUser: Record<string, number>;
  }> {
    try {
      let query = this.db
        .collection('time_entries')
        .where('startTime', '>=', startDate)
        .where('startTime', '<=', endDate);

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      const timeEntriesQuery = await query.get();
      const entries = timeEntriesQuery.docs.map(doc => doc.data() as TimeEntry);

      // Calculer les statistiques
      const summary = {
        totalHours: 0,
        workHours: 0,
        trainingHours: 0,
        overtimeHours: 0,
        compensatoryHours: 0
      };

      const byCategory: Record<string, number> = {};
      const byUser: Record<string, number> = {};

      entries.forEach(entry => {
        const hours = entry.duration / 60;
        summary.totalHours += hours;

        switch (entry.category) {
          case 'work_time':
            summary.workHours += hours;
            break;
          case 'training_time':
            summary.trainingHours += hours;
            break;
          case 'overtime':
            summary.overtimeHours += hours;
            break;
          case 'compensatory_time':
            summary.compensatoryHours += hours;
            break;
        }

        // Par catégorie
        byCategory[entry.category] = (byCategory[entry.category] || 0) + hours;

        // Par utilisateur
        byUser[entry.userId] = (byUser[entry.userId] || 0) + hours;
      });

      return {
        summary,
        entries,
        byCategory,
        byUser
      };
    } catch (error) {
      console.error('Error generating time report:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private async findApplicableCompensationRule(
    organizationId: string,
    eventId: string,
    startTime: Date,
    duration: number
  ): Promise<CompensationRule | null> {
    try {
      const rulesQuery = await this.db
        .collection('compensation_rules')
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true)
        .orderBy('priority', 'desc')
        .get();

      for (const ruleDoc of rulesQuery.docs) {
        const rule = ruleDoc.data() as CompensationRule;
        
        if (this.matchesCompensationRule(rule, eventId, startTime, duration)) {
          return rule;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding compensation rule:', error);
      return null;
    }
  }

  private matchesCompensationRule(
    rule: CompensationRule,
    eventId: string,
    startTime: Date,
    duration: number
  ): boolean {
    const conditions = rule.conditions;

    // Vérifier la durée minimale
    if (conditions.minimumDuration && duration < conditions.minimumDuration) {
      return false;
    }

    // Vérifier l'heure de la journée
    if (conditions.timeOfDay) {
      const timeStr = startTime.toTimeString().substring(0, 5);
      if (timeStr < conditions.timeOfDay.start || timeStr > conditions.timeOfDay.end) {
        return false;
      }
    }

    // Vérifier le jour de la semaine
    if (conditions.daysOfWeek && !conditions.daysOfWeek.includes(startTime.getDay())) {
      return false;
    }

    // Vérifier si c'est un weekend
    if (conditions.isWeekend !== undefined) {
      const isWeekend = startTime.getDay() === 0 || startTime.getDay() === 6;
      if (conditions.isWeekend !== isWeekend) {
        return false;
      }
    }

    return true;
  }

  private async processAutoApproval(timeEntry: TimeEntry): Promise<void> {
    // Logique d'approbation automatique basée sur les règles organisationnelles
    // Pour l'instant, approuver automatiquement les entrées de formation
    if (timeEntry.category === 'training_time' && timeEntry.duration <= 480) { // 8 heures max
      await this.db.collection('time_entries').doc(timeEntry.id).update({
        approvalStatus: 'approved',
        approvedBy: 'system',
        approvedAt: new Date(),
        notes: 'Auto-approved: Training time under 8 hours'
      });
    }
  }

  private async formatForPayrollSystem(
    entries: TimeEntry[],
    integration: PayrollIntegration
  ): Promise<any> {
    // Formater les données selon la configuration du système de paie
    const mapping = integration.mappingConfig;
    
    return entries.map(entry => {
      const payrollEntry: any = {};
      
      // Mapper les champs selon la configuration
      Object.entries(mapping.timeEntryFields).forEach(([localField, payrollField]) => {
        if (entry[localField as keyof TimeEntry] !== undefined) {
          payrollEntry[payrollField] = entry[localField as keyof TimeEntry];
        }
      });

      // Mapper la catégorie
      if (mapping.categoryMapping[entry.category]) {
        payrollEntry.category = mapping.categoryMapping[entry.category];
      }

      return payrollEntry;
    });
  }

  private async sendToPayrollSystem(
    payrollData: any,
    integration: PayrollIntegration
  ): Promise<boolean> {
    // Simulation d'envoi au système de paie
    // Dans un vrai système, ceci ferait un appel API au système de paie
    try {
      if (integration.apiEndpoint && integration.apiKey) {
        // Simulation d'appel API
        console.log('Sending to payroll system:', {
          endpoint: integration.apiEndpoint,
          dataCount: payrollData.length
        });
        
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simuler un succès (90% de chance)
        return Math.random() > 0.1;
      }
      
      return true;
    } catch (error) {
      console.error('Error sending to payroll system:', error);
      return false;
    }
  }
}

export const timeTrackingService = new TimeTrackingService();