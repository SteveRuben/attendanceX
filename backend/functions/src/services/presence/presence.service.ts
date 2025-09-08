/**
 * Service de gestion de présence
 */


import { PresenceEntryModel } from '../../models/presence-entry.model';
import { EmployeeModel } from '../../models/employee.model';
import { 
  ClockInRequest, 
  ClockOutRequest,
  Employee,
  GeoLocation,
  PaginatedResponse,
  PartialGeoLocation,
  PresenceAlert,
  PresenceEntry,
  PresenceQueryParams,
  PresenceStatus,
  PresenceStatusResponse
} from '../../shared';
import { logger } from 'firebase-functions';
import { Query } from 'firebase-admin/firestore';
import { collections, db } from '../../config';

export interface PresenceServiceOptions {
  validateLocation?: boolean;
  allowedLocationRadius?: number;
  requireGeolocation?: boolean;
}

class PresenceService {
  private readonly collectionName = 'presence_entries';
  private readonly employeesCollection = 'employees';

  /**
   * Convertit une PartialGeoLocation en GeoLocation si toutes les propriétés requises sont présentes
   */
  private convertToGeoLocation(partialLocation?: PartialGeoLocation): GeoLocation | undefined {
    if (!partialLocation || partialLocation.latitude === undefined || partialLocation.longitude === undefined) {
      return undefined;
    }

    return {
      latitude: partialLocation.latitude,
      longitude: partialLocation.longitude,
      accuracy: partialLocation.accuracy,
      timestamp: partialLocation.timestamp || new Date()
    };
  }

  /**
   * Pointer l'arrivée d'un employé
   */
  async clockIn(
    employeeId: string, 
    request: ClockInRequest, 
    options?: PresenceServiceOptions
  ): Promise<PresenceEntry> {
    try {
      logger.info('Clock in request', { employeeId, hasLocation: !!request.location });

      // Récupérer l'employé
      const employee = await this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (!employee.isActive) {
        throw new Error('Employee is not active');
      }

      // Vérifier qu'il n'est pas déjà pointé aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const existingEntry = await this.getTodayEntry(employeeId, today);

      if (existingEntry && existingEntry.clockInTime) {
        throw new Error('Employee is already clocked in today');
      }

      // Validation de la géolocalisation si requise
      if (employee.requiresGeolocation || options?.requireGeolocation) {
        if (!request.location) {
          throw new Error('Location is required for this employee');
        }

        if (options?.validateLocation !== false) {
          const geoLocation = this.convertToGeoLocation(request.location);
          if (!geoLocation) {
            throw new Error('Valid coordinates (latitude and longitude) are required');
          }
          
          const isValidLocation = this.validateEmployeeLocation(
            geoLocation,
            employee.allowedLocations || [],
            employee.locationRadius || options?.allowedLocationRadius || 100
          );

          if (!isValidLocation) {
            throw new Error('Location is outside allowed area');
          }
        }
      }

      // Créer ou mettre à jour l'entrée de présence
      let presenceEntry: PresenceEntryModel;

      if (existingEntry) {
        // Mettre à jour l'entrée existante
        presenceEntry = new PresenceEntryModel(existingEntry);
      } else {
        // Créer une nouvelle entrée
        presenceEntry = new PresenceEntryModel({
          employeeId: employee.id!,
          organizationId: employee.organizationId,
          date: today
        });
      }

      // Effectuer le pointage
      const geoLocation = this.convertToGeoLocation(request.location);
      presenceEntry.clockIn(geoLocation, request.notes);

      // Sauvegarder
      if (existingEntry) {
        await collections[this.collectionName].doc(existingEntry.id!).update(presenceEntry.toFirestore());
      } else {
        const docRef = collections[this.collectionName].doc();
        await docRef.set({
          ...presenceEntry.toFirestore(),
          id: docRef.id
        });
        presenceEntry.update({ id: docRef.id });
      }

      logger.info('Clock in successful', { employeeId, date: today });
      return presenceEntry.getData();

    } catch (error) {
      logger.error('Clock in failed', { error, employeeId });
      throw error;
    }
  }

  /**
   * Pointer la sortie d'un employé
   */
  async clockOut(
    employeeId: string, 
    request: ClockOutRequest, 
    options?: PresenceServiceOptions
  ): Promise<PresenceEntry> {
    try {
      logger.info('Clock out request', { employeeId, hasLocation: !!request.location });

      // Récupérer l'employé
      const employee = await this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Récupérer l'entrée d'aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const existingEntry = await this.getTodayEntry(employeeId, today);

      if (!existingEntry || !existingEntry.clockInTime) {
        throw new Error('Employee must clock in first');
      }

      if (existingEntry.clockOutTime) {
        throw new Error('Employee is already clocked out');
      }

      // Validation de la géolocalisation si requise
      if (employee.requiresGeolocation || options?.requireGeolocation) {
        if (!request.location) {
          throw new Error('Location is required for this employee');
        }

        if (options?.validateLocation !== false) {
          const geoLocation = this.convertToGeoLocation(request.location);
          if (!geoLocation) {
            throw new Error('Valid coordinates (latitude and longitude) are required');
          }
          
          const isValidLocation = this.validateEmployeeLocation(
            geoLocation,
            employee.allowedLocations || [],
            employee.locationRadius || options?.allowedLocationRadius || 100
          );

          if (!isValidLocation) {
            throw new Error('Location is outside allowed area');
          }
        }
      }

      // Effectuer le pointage de sortie
      const presenceEntry = new PresenceEntryModel(existingEntry);
      const geoLocation = this.convertToGeoLocation(request.location);
      presenceEntry.clockOut(geoLocation, request.notes);

      // Sauvegarder
      await collections[this.collectionName].doc(existingEntry.id!).update(presenceEntry.toFirestore());

      logger.info('Clock out successful', { employeeId, date: today });
      return presenceEntry.getData();

    } catch (error) {
      logger.error('Clock out failed', { error, employeeId });
      throw error;
    }
  }

  /**
   * Commencer une pause
   */
  async startBreak(
    employeeId: string,
    type: 'lunch' | 'coffee' | 'personal' | 'other',
    location?: GeoLocation
  ): Promise<{ presenceEntry: PresenceEntry; breakId: string }> {
    try {
      logger.info('Start break request', { employeeId, type });

      const today = new Date().toISOString().split('T')[0];
      const existingEntry = await this.getTodayEntry(employeeId, today);

      if (!existingEntry || !existingEntry.clockInTime || existingEntry.clockOutTime) {
        throw new Error('Employee must be clocked in to start a break');
      }

      const presenceEntry = new PresenceEntryModel(existingEntry);
      const breakId = presenceEntry.startBreak(type, location);

      // Sauvegarder
      await collections[this.collectionName].doc(existingEntry.id!).update(presenceEntry.toFirestore());

      logger.info('Break started successfully', { employeeId, breakId, type });
      return {
        presenceEntry: presenceEntry.getData(),
        breakId
      };

    } catch (error) {
      logger.error('Start break failed', { error, employeeId, type });
      throw error;
    }
  }

  /**
   * Terminer une pause
   */
  async endBreak(
    employeeId: string,
    breakId: string,
    location?: GeoLocation
  ): Promise<PresenceEntry> {
    try {
      logger.info('End break request', { employeeId, breakId });

      const today = new Date().toISOString().split('T')[0];
      const existingEntry = await this.getTodayEntry(employeeId, today);

      if (!existingEntry) {
        throw new Error('No presence entry found for today');
      }

      const presenceEntry = new PresenceEntryModel(existingEntry);
      presenceEntry.endBreak(breakId, location);

      // Sauvegarder
      await collections[this.collectionName].doc(existingEntry.id!).update(presenceEntry.toFirestore());

      logger.info('Break ended successfully', { employeeId, breakId });
      return presenceEntry.getData();

    } catch (error) {
      logger.error('End break failed', { error, employeeId, breakId });
      throw error;
    }
  }

  /**
   * Obtenir le statut de présence actuel d'un employé
   */
  async getPresenceStatus(employeeId: string): Promise<PresenceStatusResponse> {
    try {
      const employee = await this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const todayEntry = await this.getTodayEntry(employeeId, today);

      const response: PresenceStatusResponse = {
        employee,
        currentStatus: todayEntry?.status || PresenceStatus.ABSENT,
        todayEntry: todayEntry || undefined,
        isClocked: !!(todayEntry?.clockInTime && !todayEntry?.clockOutTime),
        workSchedule: undefined, // TODO: Récupérer depuis le service des horaires
        nextScheduledDay: undefined // TODO: Calculer le prochain jour de travail
      };

      return response;

    } catch (error) {
      logger.error('Get presence status failed', { error, employeeId });
      throw error;
    }
  }

  /**
   * Lister les entrées de présence avec filtres et pagination
   */
  async listPresenceEntries(params: PresenceQueryParams): Promise<PaginatedResponse<PresenceEntry>> {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        page = 1,
        limit = 20
      } = params;

      let query: Query = collections[this.collectionName];

      // Filtres
      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }

      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      // Tri par date décroissante
      query = query.orderBy('date', 'desc');

      // Pagination
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();
      const entries: PresenceEntry[] = [];

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          entries.push(entry.getData());
        }
      });

      // Compter le total
      let countQuery: Query = collections[this.collectionName];
      if (employeeId) {
        countQuery = countQuery.where('employeeId', '==', employeeId);
      }
      if (startDate) {
        countQuery = countQuery.where('date', '>=', startDate);
      }
      if (endDate) {
        countQuery = countQuery.where('date', '<=', endDate);
      }
      if (status) {
        countQuery = countQuery.where('status', '==', status);
      }

      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;
      const totalPages = Math.ceil(total / limit);

      return {
        data: entries,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('List presence entries failed', { error, params });
      throw error;
    }
  }

  /**
   * Mettre à jour une entrée de présence
   */
  async updatePresenceEntry(
    entryId: string,
    updates: Partial<PresenceEntry>,
    updatedBy: string
  ): Promise<PresenceEntry> {
    try {
      logger.info('Updating presence entry', { entryId, updates });

      const doc = await collections[this.collectionName].doc(entryId).get();
      const entry = PresenceEntryModel.fromFirestore(doc);

      if (!entry) {
        throw new Error('Presence entry not found');
      }

      // Appliquer les mises à jour
      entry.update(updates);
      await entry.validate();

      // Sauvegarder
      await collections[this.collectionName].doc(entryId).update(entry.toFirestore());

      logger.info('Presence entry updated successfully', { entryId });
      return entry.getData();

    } catch (error) {
      logger.error('Update presence entry failed', { error, entryId, updates });
      throw error;
    }
  }

  /**
   * Valider une entrée de présence
   */
  async validatePresenceEntry(
    entryId: string,
    managerNotes: string,
    validatedBy: string
  ): Promise<PresenceEntry> {
    try {
      const doc = await collections[this.collectionName].doc(entryId).get();
      const entry = PresenceEntryModel.fromFirestore(doc);

      if (!entry) {
        throw new Error('Presence entry not found');
      }

      entry.addManagerNotes(managerNotes, validatedBy);

      // Sauvegarder
      await collections[this.collectionName].doc(entryId).update(entry.toFirestore());

      return entry.getData();

    } catch (error) {
      logger.error('Validate presence entry failed', { error, entryId });
      throw error;
    }
  }

  /**
   * Détecter les anomalies de présence
   */
  async detectAnomalies(organizationIdOrEntries: string | PresenceEntry[], date?: string): Promise<PresenceAlert[]> {
    // Surcharge pour accepter soit un organizationId, soit un tableau d'entrées
    if (Array.isArray(organizationIdOrEntries)) {
      return this.detectAnomaliesFromEntries(organizationIdOrEntries);
    }
    
    const organizationId = organizationIdOrEntries;
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const alerts: PresenceAlert[] = [];

      // Récupérer toutes les entrées de présence pour la date
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('date', '==', targetDate);

      const snapshot = await query.get();
      const entries: PresenceEntry[] = [];

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          entries.push(entry.getData());
        }
      });

      // Détecter les anomalies
      for (const entry of entries) {
        // Employé qui n'a pas pointé
        if (!entry.clockInTime) {
          alerts.push({
            id: `missed_clock_in_${entry.employeeId}_${targetDate}`,
            type: 'missed_clock_in',
            employeeId: entry.employeeId,
            employeeName: 'Unknown', // TODO: Récupérer le nom depuis l'employé
            message: 'Employee did not clock in today',
            severity: 'medium',
            createdAt: new Date(),
            acknowledged: false
          });
        }

        // Employé qui n'a pas pointé sa sortie
        if (entry.clockInTime && !entry.clockOutTime) {
          const now = new Date();
          const clockInTime = new Date(entry.clockInTime);
          const hoursSinceClockIn = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

          if (hoursSinceClockIn > 12) { // Plus de 12h sans pointer la sortie
            alerts.push({
              id: `missed_clock_out_${entry.employeeId}_${targetDate}`,
              type: 'missed_clock_out',
              employeeId: entry.employeeId,
              employeeName: 'Unknown',
              message: 'Employee did not clock out after 12 hours',
              severity: 'high',
              createdAt: new Date(),
              acknowledged: false
            });
          }
        }

        // Heures supplémentaires excessives
        if (entry.overtimeHours && entry.overtimeHours > 4) {
          alerts.push({
            id: `overtime_${entry.employeeId}_${targetDate}`,
            type: 'overtime',
            employeeId: entry.employeeId,
            employeeName: 'Unknown',
            message: `Excessive overtime: ${entry.overtimeHours.toFixed(1)} hours`,
            severity: 'medium',
            createdAt: new Date(),
            acknowledged: false
          });
        }

        // Pauses trop longues
        if (entry.totalBreakTime && entry.totalBreakTime > 120) { // Plus de 2h de pause
          alerts.push({
            id: `long_break_${entry.employeeId}_${targetDate}`,
            type: 'anomaly',
            employeeId: entry.employeeId,
            employeeName: 'Unknown',
            message: `Long break time: ${entry.totalBreakTime} minutes`,
            severity: 'low',
            createdAt: new Date(),
            acknowledged: false
          });
        }
      }

      return alerts;

    } catch (error) {
      logger.error('Detect anomalies failed', { error, organizationId, date });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de présence
   */
  async getPresenceStats(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalEntries: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    earlyLeaveDays: number;
    overtimeDays: number;
    averageWorkHours: number;
    totalOvertimeHours: number;
  }> {
    try {
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate);

      const snapshot = await query.get();
      
      let totalEntries = 0;
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let earlyLeaveDays = 0;
      let overtimeDays = 0;
      let totalWorkHours = 0;
      let totalOvertimeHours = 0;

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          const data = entry.getData();
          totalEntries++;

          switch (data.status) {
            case PresenceStatus.PRESENT:
              presentDays++;
              break;
            case PresenceStatus.ABSENT:
              absentDays++;
              break;
            case PresenceStatus.LATE:
              lateDays++;
              presentDays++; // Aussi compté comme présent
              break;
            case PresenceStatus.EARLY_LEAVE:
              earlyLeaveDays++;
              presentDays++; // Aussi compté comme présent
              break;
            case PresenceStatus.OVERTIME:
              overtimeDays++;
              presentDays++; // Aussi compté comme présent
              break;
          }

          if (data.actualWorkHours) {
            totalWorkHours += data.actualWorkHours;
          }

          if (data.overtimeHours) {
            totalOvertimeHours += data.overtimeHours;
          }
        }
      });

      return {
        totalEntries,
        presentDays,
        absentDays,
        lateDays,
        earlyLeaveDays,
        overtimeDays,
        averageWorkHours: totalEntries > 0 ? totalWorkHours / totalEntries : 0,
        totalOvertimeHours
      };

    } catch (error) {
      logger.error('Get presence stats failed', { error, organizationId, startDate, endDate });
      throw error;
    }
  }

  // Méthodes utilitaires privées
  private async getEmployeeById(employeeId: string): Promise<Employee | null> {
    try {
      const doc = await collections[this.employeesCollection].doc(employeeId).get();
      const employee = EmployeeModel.fromFirestore(doc);
      return employee ? employee.getData() : null;
    } catch (error) {
      logger.error('Get employee failed', { error, employeeId });
      return null;
    }
  }

  private async getTodayEntry(employeeId: string, date: string): Promise<PresenceEntry | null> {
    try {
      const query = collections[this.collectionName]
        .where('employeeId', '==', employeeId)
        .where('date', '==', date)
        .limit(1);

      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }

      const entry = PresenceEntryModel.fromFirestore(snapshot.docs[0]);
      return entry ? entry.getData() : null;
    } catch (error) {
      logger.error('Get today entry failed', { error, employeeId, date });
      return null;
    }
  }

  private validateEmployeeLocation(
    location: GeoLocation,
    allowedLocations: GeoLocation[],
    radius: number
  ): boolean {
    if (!allowedLocations || allowedLocations.length === 0) {
      return true; // Pas de restriction
    }

    return allowedLocations.some(allowedLocation => {
      const distance = this.calculateDistance(location, allowedLocation);
      return distance <= radius;
    });
  }

  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  /**
   * Traitement automatique des entrées de présence en fin de journée
   */
  async processEndOfDayEntries(organizationId: string, date?: string): Promise<{
    processed: number;
    autoClockOuts: number;
    anomalies: number;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      logger.info('Processing end of day entries', { organizationId, targetDate });

      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('date', '==', targetDate);

      const snapshot = await query.get();
      let processed = 0;
      let autoClockOuts = 0;
      let anomalies = 0;

      const batch = db.batch();

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          const data = entry.getData();
          processed++;

          // Auto clock-out pour les employés qui ont oublié
          if (data.clockInTime && !data.clockOutTime) {
            const clockInTime = new Date(data.clockInTime);
            const now = new Date();
            const hoursSinceClockIn = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

            // Si plus de 10 heures, faire un clock-out automatique
            if (hoursSinceClockIn > 10) {
              const autoClockOutTime = new Date(clockInTime);
              autoClockOutTime.setHours(clockInTime.getHours() + 8); // Ajouter 8h de travail standard

              entry.clockOut(undefined, 'Auto clock-out - End of day processing');
              entry.update({ clockOutTime: autoClockOutTime });

              batch.update(doc.ref, entry.toFirestore());
              autoClockOuts++;
            }
          }

          // Détecter les anomalies
          const entryAnomalies = entry.detectAnomalies();
          if (entryAnomalies.length > 0) {
            anomalies++;
          }
        }
      });

      await batch.commit();

      logger.info('End of day processing completed', { 
        organizationId, 
        targetDate, 
        processed, 
        autoClockOuts, 
        anomalies 
      });

      return { processed, autoClockOuts, anomalies };

    } catch (error) {
      logger.error('Process end of day entries failed', { error, organizationId, date });
      throw error;
    }
  }

  /**
   * Obtenir le résumé de présence pour une équipe
   */
  async getTeamPresenceSummary(
    organizationId: string,
    departmentId?: string,
    date?: string
  ): Promise<{
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    onBreak: number;
    overtime: number;
    entries: PresenceEntry[];
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      const query: Query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('date', '==', targetDate);

      const snapshot = await query.get();
      const entries: PresenceEntry[] = [];
      
      let present = 0;
      let absent = 0;
      let late = 0;
      let onBreak = 0;
      let overtime = 0;

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          const data = entry.getData();
          entries.push(data);

          switch (data.status) {
            case PresenceStatus.PRESENT:
              present++;
              break;
            case PresenceStatus.ABSENT:
              absent++;
              break;
            case PresenceStatus.LATE:
              late++;
              break;
            case PresenceStatus.ON_BREAK:
              onBreak++;
              break;
            case PresenceStatus.OVERTIME:
              overtime++;
              break;
          }
        }
      });

      // TODO: Récupérer le nombre total d'employés actifs pour calculer les absents
      const totalEmployees = entries.length;

      return {
        totalEmployees,
        present,
        absent,
        late,
        onBreak,
        overtime,
        entries
      };

    } catch (error) {
      logger.error('Get team presence summary failed', { error, organizationId, departmentId, date });
      throw error;
    }
  }

  /**
   * Corriger une entrée de présence avec validation manager
   */
  async correctPresenceEntry(
    entryId: string,
    corrections: {
      clockInTime?: Date;
      clockOutTime?: Date;
      breakEntries?: any[];
      notes?: string;
    },
    correctedBy: string,
    reason: string
  ): Promise<PresenceEntry> {
    try {
      logger.info('Correcting presence entry', { entryId, corrections, correctedBy, reason });

      const doc = await collections[this.collectionName].doc(entryId).get();
      const entry = PresenceEntryModel.fromFirestore(doc);

      if (!entry) {
        throw new Error('Presence entry not found');
      }

      // Appliquer les corrections
      if (corrections.clockInTime) {
        entry.update({ clockInTime: corrections.clockInTime });
      }

      if (corrections.clockOutTime) {
        entry.update({ clockOutTime: corrections.clockOutTime });
      }

      if (corrections.breakEntries) {
        entry.update({ breakEntries: corrections.breakEntries });
      }

      // Ajouter une note de correction
      const correctionNote = `Corrected by ${correctedBy}: ${reason}`;
      const existingNotes = entry.getData().managerNotes || '';
      entry.addManagerNotes(
        existingNotes ? `${existingNotes} | ${correctionNote}` : correctionNote,
        correctedBy
      );

      // Recalculer les heures et statuts
      entry['calculateWorkHours']();
      entry['calculateStatus']();

      await entry.validate();

      // Sauvegarder
      await collections[this.collectionName].doc(entryId).update(entry.toFirestore());

      logger.info('Presence entry corrected successfully', { entryId });
      return entry.getData();

    } catch (error) {
      logger.error('Correct presence entry failed', { error, entryId, corrections });
      throw error;
    }
  }

  /**
   * Obtenir les employés actuellement présents
   */
  async getCurrentlyPresentEmployees(organizationId: string): Promise<{
    employeeId: string;
    clockInTime: Date;
    status: PresenceStatus;
    workingHours: number;
  }[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('date', '==', today)
        .where('clockInTime', '!=', null);

      const snapshot = await query.get();
      const presentEmployees: {
        employeeId: string;
        clockInTime: Date;
        status: PresenceStatus;
        workingHours: number;
      }[] = [];

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          const data = entry.getData();
          
          // Seulement les employés qui sont encore présents (pas encore sortis)
          if (data.clockInTime && !data.clockOutTime) {
            const now = new Date();
            const workingHours = (now.getTime() - data.clockInTime.getTime()) / (1000 * 60 * 60);

            presentEmployees.push({
              employeeId: data.employeeId,
              clockInTime: data.clockInTime,
              status: data.status,
              workingHours
            });
          }
        }
      });

      return presentEmployees;

    } catch (error) {
      logger.error('Get currently present employees failed', { error, organizationId });
      throw error;
    }
  }

  /**
   * Générer un rapport de présence détaillé
   */
  async generatePresenceReport(
    organizationId: string,
    startDate: string,
    endDate: string,
    employeeIds?: string[]
  ): Promise<{
    summary: any;
    details: PresenceEntry[];
    anomalies: any[];
  }> {
    try {
      logger.info('Generating presence report', { organizationId, startDate, endDate, employeeIds });

      let query: Query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate);

      if (employeeIds && employeeIds.length > 0) {
        query = query.where('employeeId', 'in', employeeIds);
      }

      const snapshot = await query.get();
      const details: PresenceEntry[] = [];
      const anomalies: any[] = [];

      snapshot.forEach(doc => {
        const entry = PresenceEntryModel.fromFirestore(doc);
        if (entry) {
          const data = entry.getData();
          details.push(data);

          // Détecter les anomalies
          const entryAnomalies = entry.detectAnomalies();
          if (entryAnomalies.length > 0) {
            anomalies.push({
              employeeId: data.employeeId,
              date: data.date,
              anomalies: entryAnomalies
            });
          }
        }
      });

      // Calculer le résumé
      const summary = await this.getPresenceStats(organizationId, startDate, endDate);

      return {
        summary,
        details,
        anomalies
      };

    } catch (error) {
      logger.error('Generate presence report failed', { error, organizationId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Détecter les anomalies à partir d'un tableau d'entrées
   */
  public async detectAnomaliesFromEntries(entries: PresenceEntry[]): Promise<PresenceAlert[]> {
    const alerts: PresenceAlert[] = [];

    for (const entry of entries) {
      const entryAlerts: PresenceAlert[] = [];

      // Vérifier les anomalies de temps
      if (entry.clockInTime && entry.clockOutTime) {
        const workHours = (entry.clockOutTime.getTime() - entry.clockInTime.getTime()) / (1000 * 60 * 60);
        
        // Journée de travail trop longue (plus de 12 heures)
        if (workHours > 12) {
          entryAlerts.push({
            id: `${entry.id}_long_day`,
            type: 'anomaly',
            employeeId: entry.employeeId,
            employeeName: entry.employeeId, // TODO: Récupérer le nom réel
            message: `Journée de travail exceptionnellement longue: ${workHours.toFixed(1)} heures`,
            severity: 'high',
            createdAt: new Date(),
            acknowledged: false,
            entryId: entry.id,
            types: ['long_work_day'],
            details: { workHours }
          });
        }

        // Journée de travail trop courte (moins de 2 heures)
        if (workHours < 2) {
          entryAlerts.push({
            id: `${entry.id}_short_day`,
            type: 'anomaly',
            employeeId: entry.employeeId,
            employeeName: entry.employeeId, // TODO: Récupérer le nom réel
            message: `Journée de travail très courte: ${workHours.toFixed(1)} heures`,
            severity: 'medium',
            createdAt: new Date(),
            acknowledged: false,
            entryId: entry.id,
            types: ['short_work_day'],
            details: { workHours }
          });
        }
      }

      // Vérifier les pointages manqués
      if (entry.clockInTime && !entry.clockOutTime) {
        const now = new Date();
        const clockInDate = new Date(entry.clockInTime);
        const hoursSinceClockIn = (now.getTime() - clockInDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceClockIn > 24) {
          entryAlerts.push({
            id: `${entry.id}_missed_clock_out`,
            type: 'missed_clock_out',
            employeeId: entry.employeeId,
            employeeName: entry.employeeId, // TODO: Récupérer le nom réel
            message: `Pointage de sortie manqué depuis ${hoursSinceClockIn.toFixed(0)} heures`,
            severity: 'high',
            createdAt: new Date(),
            acknowledged: false,
            entryId: entry.id,
            types: ['missed_clock_out'],
            details: { hoursSinceClockIn }
          });
        }
      }

      alerts.push(...entryAlerts);
    }

    return alerts;
  }
}

export { PresenceService };
export const presenceService = new PresenceService();  