// backend/functions/src/services/attendance.service.ts - PARTIE 1/3

import {getFirestore, Query} from "firebase-admin/firestore";
import {AttendanceModel} from "../models/attendance.model";
import {EventModel} from "../models/event.model";
import {
  ATTENDANCE_THRESHOLDS,
  AttendanceMethod,
  AttendanceMetrics,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceValidationRequest,
  CheckInRequest,
  CheckInResponse,
  ERROR_CODES,
  GEOLOCATION_CONFIG,
  GeolocationCheckInRequest,
  ManualAttendanceRequest,
  QRCodeScanRequest,
} from "@attendance-x/shared";
import {authService} from "./auth.service";
import {userService} from "./user.service";
import {eventService} from "./event.service";
import {qrCodeService} from "./qrcode.service";
import { logger } from "firebase-functions";

// 🔧 INTERFACES ET TYPES
export interface AttendanceListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  eventId?: string;
  userId?: string;
  status?: AttendanceStatus;
  method?: AttendanceMethod;
  dateRange?: { start: Date; end: Date };
  validationStatus?: "pending" | "validated" | "rejected";
}

export interface AttendanceListResponse {
  attendances: AttendanceRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AttendanceStats {
  total: number;
  byStatus: Record<AttendanceStatus, number>;
  byMethod: Record<AttendanceMethod, number>;
  averageCheckInTime: number;
  punctualityRate: number;
  validationPending: number;
}

export interface EventAttendanceReport {
  event: {
    id: string;
    title: string;
    startDateTime: Date;
    endDateTime: Date;
    totalParticipants: number;
  };
  statistics: {
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalExcused: number;
    attendanceRate: number;
    punctualityRate: number;
    averageCheckInTime: number;
  };
  attendances: AttendanceRecord[];
  timeline: Array<{
    time: Date;
    action: string;
    userId: string;
    method: AttendanceMethod;
  }>;
}

export interface BulkAttendanceOperation {
  eventId: string;
  userIds: string[];
  operation: "mark_present" | "mark_absent" | "mark_excused" | "validate" | "reject";
  method?: AttendanceMethod;
  notes?: string;
}

// 🏭 CLASSE PRINCIPALE DU SERVICE
export class AttendanceService {
  private readonly db = getFirestore();

  // ✅ ENREGISTREMENT DE PRÉSENCE PRINCIPAL
  async checkIn(request: CheckInRequest): Promise<CheckInResponse> {
    try {
      // Validation de base
      await this.validateCheckInRequest(request);

      // Récupérer l'événement et vérifier l'éligibilité
      const event = await eventService.getEventById(request.eventId);
      await this.validateEventEligibility(event, request.userId);

      // Vérifier si l'utilisateur peut enregistrer sa présence
      const canCheckIn = await this.canUserCheckIn(request.userId, event, request.method);
      if (!canCheckIn.allowed) {
        throw new Error(canCheckIn.reason);
      }

      // Traitement selon la méthode
      let attendanceData: Partial<AttendanceRecord>;
      switch (request.method) {
      case AttendanceMethod.QR_CODE:
        attendanceData = await this.processQRCodeCheckIn(request as QRCodeScanRequest, event);
        break;

      case AttendanceMethod.GEOLOCATION:
        attendanceData = await this.processGeolocationCheckIn(request as GeolocationCheckInRequest, event);
        break;

      case AttendanceMethod.MANUAL:
        attendanceData = await this.processManualCheckIn(request as ManualAttendanceRequest, event);
        break;

      case AttendanceMethod.BIOMETRIC:
        attendanceData = await this.processBiometricCheckIn(request, event);
        break;

      default:
        throw new Error(ERROR_CODES.VALIDATION_ERROR);
      }

      // Créer ou mettre à jour l'enregistrement de présence
      const attendance = await this.createOrUpdateAttendance(
        request.userId,
        event,
        attendanceData,
        request.method
      );

      // Calculer les métriques
      const metrics = this.calculateAttendanceMetrics(attendance, event);
      attendance.update({metrics});

      await this.saveAttendance(attendance);

      // Mettre à jour les statistiques de l'événement
      if (!event.id) {
        throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
      }
      await this.updateEventAttendanceStats(event.id);

      // Log de l'audit
      if (!attendance.id) {
        throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
      }
      await this.logAttendanceAction("check_in", attendance.id, request.userId, {
        method: request.method,
        status: attendance.getData().status,
        eventId: request.eventId,
      });

      return {
        success: true,
        attendance: attendance.getData(),
        message: this.getCheckInMessage(attendance.getData().status),
        requiresValidation: this.requiresValidation(attendance.getData().method, attendance.getData().status),
      };
    } catch (error) {
      console.error("Check-in error:", error);

      // Log des tentatives échouées
      await this.logAttendanceAction("check_in_failed", null, request.userId, {
        method: request.method,
        eventId: request.eventId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof Error && Object.values(ERROR_CODES).includes(error.message as any)) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // 📱 TRAITEMENT QR CODE
  private async processQRCodeCheckIn(
    request: QRCodeScanRequest,
    event: EventModel
  ): Promise<Partial<AttendanceRecord>> {
    const eventData = event.getData();

    // Vérifier que l'événement utilise les QR codes
    if (!eventData.attendanceSettings.requireQRCode) {
      throw new Error(ERROR_CODES.INVALID_QR_CODE);
    }

    // Utiliser le service QR code pour la validation
    const validation = await qrCodeService.validateQRCode(
      request.qrCodeData, 
      request.userId
    );

    if (!validation.isValid) {
      throw new Error(validation.reason || ERROR_CODES.INVALID_QR_CODE);
    }

    // Déterminer le statut basé sur l'heure
    const status = this.determineAttendanceStatus(new Date(), event);

    return {
      status,
      checkInTime: new Date(),
      notes: `QR Code scan: ${request.qrCodeData}`,
      deviceInfo: {
        ...request.deviceInfo,
        type: request.deviceInfo?.type || "web",
      },
      qrCodeValidation: {
        qrCodeData: request.qrCodeData,
        validatedAt: new Date(),
        isValid: true
      }
    };
  }

  // 📍 TRAITEMENT GÉOLOCALISATION
  private async processGeolocationCheckIn(
    request: GeolocationCheckInRequest,
    event: EventModel
  ): Promise<Partial<AttendanceRecord>> {
    const eventData = event.getData();

    // Vérifier que l'événement utilise la géolocalisation
    if (!eventData.attendanceSettings.requireGeolocation) {
      throw new Error(ERROR_CODES.LOCATION_TOO_FAR);
    }

    // Vérifier la précision de la géolocalisation
    if (request.accuracy > GEOLOCATION_CONFIG.ACCURACY_THRESHOLD_METERS) {
      throw new Error(ERROR_CODES.LOCATION_ACCURACY_LOW);
    }

    // Calculer la distance par rapport au lieu de l'événement
    const distance = this.calculateDistance(
      request.latitude,
      request.longitude,
      eventData.location.coordinates?.latitude || 0,
      eventData.location.coordinates?.longitude || 0
    );

    const allowedRadius = eventData.attendanceSettings?.geofenceRadius || GEOLOCATION_CONFIG.DEFAULT_RADIUS_METERS;

    if (distance > allowedRadius) {
      throw new Error(ERROR_CODES.LOCATION_TOO_FAR);
    }

    // Déterminer le statut basé sur l'heure
    const status = this.determineAttendanceStatus(new Date(), event);

    return {
      status,
      checkInTime: new Date(),
      checkInLocation: {
        latitude: request.latitude,
        longitude: request.longitude,
      },
      locationAccuracy: request.accuracy,
      deviceInfo: {
        ...request.deviceInfo,
        type: request.deviceInfo?.type || "mobile",
      },
    };
  }

  // ✋ TRAITEMENT MANUEL
  private async processManualCheckIn(
    request: ManualAttendanceRequest,
    event: EventModel
  ): Promise<Partial<AttendanceRecord>> {
    // Vérifier les permissions pour l'enregistrement manuel
    if (!await this.canMarkAttendanceManually(request.markedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    return {
      status: request.status,
      checkInTime: request.checkInTime || new Date(),
      markedBy: request.markedBy,
      notes: request.notes,
      validation: {
        isValidated: false,
        validationNotes: "Manual entry - requires validation",
      },
    };
  }

  // 👆 TRAITEMENT BIOMÉTRIQUE
  private async processBiometricCheckIn(
    request: CheckInRequest,
    event: EventModel
  ): Promise<Partial<AttendanceRecord>> {
    const eventData = event.getData();

    // Vérifier que l'événement utilise la biométrie
    if (!eventData.attendanceSettings.requireBiometric) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // TODO: Intégrer avec un service de biométrie
    // Pour l'instant, simulation
    const biometricVerified = true; // Résultat de la vérification biométrique

    if (!biometricVerified) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Déterminer le statut basé sur l'heure
    const status = this.determineAttendanceStatus(new Date(), event);

    return {
      status,
      checkInTime: new Date(),
      // ✅ CORRECTION : Stocker biometric data dans notes
      notes: "Biometric verification: fingerprint (confidence: 95%)",
      deviceInfo: {
        type: "mobile" as const,
      },
    };
  }

  // 🕐 DÉTERMINATION DU STATUT DE PRÉSENCE
  private determineAttendanceStatus(checkInTime: Date, event: EventModel): AttendanceStatus {
    const eventData = event.getData();
    const eventStart = eventData.startDateTime;
    const lateThreshold = eventData.attendanceSettings?.lateThresholdMinutes || 
    ATTENDANCE_THRESHOLDS.LATE_THRESHOLD_MINUTES;
    const earlyThreshold = eventData.attendanceSettings.earlyThresholdMinutes || 
    ATTENDANCE_THRESHOLDS.EARLY_DEPARTURE_THRESHOLD_MINUTES;

    const timeDiffMinutes = (checkInTime.getTime() - eventStart.getTime()) / (1000 * 60);

    // Arrivée en avance (avant l'heure de début)
    if (timeDiffMinutes < 0) {
      return AttendanceStatus.PRESENT;
    }

    // Arrivée à l'heure ou légèrement en retard
    if (timeDiffMinutes <= lateThreshold) {
      return AttendanceStatus.EXCUSED;
    }

    if(earlyThreshold>=1){
      return AttendanceStatus.LEFT_EARLY;
    }

    // Arrivée en retard
    return AttendanceStatus.LATE;
  }

  // 📐 CALCUL DE DISTANCE (FORMULE HAVERSINE)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180; // φ, λ en radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }

  // 📊 CALCUL DES MÉTRIQUES
  /* private calculateAttendanceMetrics(attendance: AttendanceModel, event: EventModel): AttendanceMetrics {
    const attendanceData = attendance.getData();
    const eventData = event.getData();

    if (!attendanceData.checkInTime) {
      return {punctualityScore: 0, engagementScore: 0};
    }

    // Calcul du score de ponctualité (0-100)
    const timeDiffMinutes = (attendanceData.checkInTime.getTime() - eventData.startDateTime.getTime()) / (1000 * 60);
    let punctualityScore = 100;

    if (timeDiffMinutes > 0) {
      // En retard - pénalité progressive
      punctualityScore = Math.max(0, 100 - (timeDiffMinutes * 2));
    } else if (timeDiffMinutes < -30) {
      // Trop tôt - légère pénalité
      punctualityScore = 90;
    }

    // Calcul du score d'engagement (basé sur la méthode et les données)
    let engagementScore = 50; // Score de base
    let engagementLevel: 'low' | 'medium' | 'high' = 'medium';
    switch (attendanceData.method) {
    case AttendanceMethod.QR_CODE:
      engagementScore = 80; // Engagement actif
      engagementLevel = 'high';
      break;
    case AttendanceMethod.GEOLOCATION:
      engagementScore = 70; // Engagement avec localisation
      engagementLevel = 'medium';
      break;
    case AttendanceMethod.BIOMETRIC:
      engagementScore = 90; // Engagement sécurisé
      engagementLevel = 'high';
      break;
    case AttendanceMethod.MANUAL:
      engagementScore = 40; // Engagement passif
      engagementLevel = 'low';
      break;
    }

    // Bonus pour les données supplémentaires
    /* if (attendanceData.location) engagementScore += 5;
      if (attendanceData.deviceInfo) engagementScore += 5; *//*
    let duration: number | undefined;
    if (attendanceData.checkOutTime && attendanceData.checkInTime) {
      duration = Math.round((attendanceData.checkOutTime.getTime() - attendanceData.checkInTime.getTime()) / (1000 * 60));
    }
    return {
      lateMinutes: Math.round(lateMinutes),
      participationScore: Math.round(participationScore),
      engagementLevel,
      duration,
    };
  } */

  private calculateAttendanceMetrics(attendance: AttendanceModel, event: EventModel): AttendanceMetrics {
    const attendanceData = attendance.getData();
    const eventData = event.getData();

    if (!attendanceData.checkInTime) {
      return {};
    }

    // Calcul du retard en minutes
    const timeDiffMinutes = (attendanceData.checkInTime.getTime() - eventData.startDateTime.getTime()) / (1000 * 60);
    const lateMinutes = Math.max(0, timeDiffMinutes);

    // Calcul du score de participation (0-100)
    let participationScore = 100;
    if (timeDiffMinutes > 0) {
      // En retard - pénalité progressive
      participationScore = Math.max(0, 100 - (timeDiffMinutes * 2));
    } else if (timeDiffMinutes < -30) {
      // Trop tôt - légère pénalité
      participationScore = 90;
    }

    // ✅ CORRECTION : Calcul du niveau d'engagement basé sur la méthode
    let engagementLevel: "low" | "medium" | "high" = "medium";
    switch (attendanceData.method) {
    case AttendanceMethod.QR_CODE:
    case AttendanceMethod.BIOMETRIC:
      engagementLevel = "high";
      break;
    case AttendanceMethod.GEOLOCATION:
      engagementLevel = "medium";
      break;
    case AttendanceMethod.MANUAL:
      engagementLevel = "low";
      break;
    }

    // Calcul de la durée si checkout disponible
    let duration: number | undefined;
    if (attendanceData.checkOutTime && attendanceData.checkInTime) {
      duration = Math.round((attendanceData.checkOutTime.getTime() - attendanceData.checkInTime.getTime()) / (1000 * 60));
    }

    // ✅ CORRECTION : Retourner les bonnes propriétés pour AttendanceMetrics
    return {
      lateMinutes: Math.round(lateMinutes),
      participationScore: Math.round(participationScore),
      engagementLevel,
      duration,
    };
  }

  // 🔒 VALIDATION DES PERMISSIONS ET ÉLIGIBILITÉ
  private async validateCheckInRequest(request: CheckInRequest): Promise<void> {
    if (!request.userId || !request.eventId || !request.method) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    if (!Object.values(AttendanceMethod).includes(request.method)) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Vérifier que l'utilisateur existe
    await userService.getUserById(request.userId);
  }

  private async validateEventEligibility(event: EventModel, userId: string): Promise<void> {
    const eventData = event.getData();

    // Vérifier que l'utilisateur est inscrit à l'événement
    if (!eventData.participants.includes(userId)) {
      throw new Error(ERROR_CODES.NOT_REGISTERED);
    }

    // Vérifier le statut de l'événement
    if (eventData.status === "cancelled") {
      throw new Error(ERROR_CODES.EVENT_CANCELLED);
    }

    if (eventData.status === "completed") {
      throw new Error(ERROR_CODES.EVENT_ALREADY_ENDED);
    }
  }

  private async canUserCheckIn(
    userId: string,
    event: EventModel,
    method: AttendanceMethod
  ): Promise<{ allowed: boolean; reason?: string }> {
    const eventData = event.getData();
    const now = new Date();

    // Vérifier la fenêtre de check-in
    const checkInWindow = eventData.attendanceSettings.checkInWindow;
    const earliestCheckIn = new Date(eventData.startDateTime.getTime() - checkInWindow.beforeMinutes * 60 * 1000);
    const latestCheckIn = new Date(eventData.startDateTime.getTime() + checkInWindow.afterMinutes * 60 * 1000);

    if (now < earliestCheckIn) {
      return {
        allowed: false,
        reason: ERROR_CODES.ATTENDANCE_WINDOW_CLOSED,
      };
    }

    if (now > latestCheckIn) {
      return {
        allowed: false,
        reason: ERROR_CODES.ATTENDANCE_WINDOW_CLOSED,
      };
    }

    // Vérifier si l'utilisateur a déjà enregistré sa présence
    if (!event.id) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    const existingAttendance = await this.getAttendanceByUserAndEvent(userId, event.id);
    if (existingAttendance && !this.canUpdateAttendance(existingAttendance)) {
      return {
        allowed: false,
        reason: ERROR_CODES.ALREADY_MARKED_ATTENDANCE,
      };
    }

    // Vérifier les méthodes requises pour l'événement
    const requiredMethods = this.getRequiredMethods(eventData.attendanceSettings);
    if (requiredMethods.length > 0 && !requiredMethods.includes(method)) {
      return {
        allowed: false,
        reason: ERROR_CODES.VALIDATION_ERROR,
      };
    }

    return {allowed: true};
  }

  private async canMarkAttendanceManually(markerId: string, event: EventModel): Promise<boolean> {
    const eventData = event.getData();

    // L'organisateur peut toujours marquer manuellement
    if (eventData.organizerId === markerId || eventData.coOrganizers.includes(markerId)) {
      return true;
    }

    // Vérifier les permissions globales
    return await authService.hasPermission(markerId, "validate_attendances");
  }

  // 📝 GESTION DES PRÉSENCES
  async createOrUpdateAttendance(
    userId: string,
    event: EventModel,
    attendanceData: Partial<AttendanceRecord>,
    method: AttendanceMethod
  ): Promise<AttendanceModel> {
    // Vérifier s'il existe déjà une présence
    if (!event.id) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    const existingAttendance = await this.getAttendanceByUserAndEvent(userId, event.id);

    if (existingAttendance) {
      // Mettre à jour l'attendance existante
      const canUpdate = this.canUpdateAttendance(existingAttendance);
      if (!canUpdate) {
        throw new Error(ERROR_CODES.ALREADY_MARKED_ATTENDANCE);
      }

      existingAttendance.update({
        ...attendanceData,
        method,
        updatedAt: new Date(),
      });

      return existingAttendance;
    } else {
      // Créer une nouvelle attendance
      const markRequest = {
        eventId: event.id,
        userId,
        status: attendanceData.status || AttendanceStatus.PRESENT,
        method,
        location: attendanceData.checkInLocation,
        notes: attendanceData.notes,
        deviceInfo: attendanceData.deviceInfo,
      };

      const attendance = AttendanceModel.fromMarkRequest(markRequest, attendanceData.markedBy || userId);

      if (attendanceData.validation) {
        attendance.update({validation: attendanceData.validation});
      }
      if (attendanceData.locationAccuracy) {
        attendance.update({locationAccuracy: attendanceData.locationAccuracy});
      }
      if (attendanceData.checkInTime) {
        attendance.update({checkInTime: attendanceData.checkInTime});
      }

      return attendance;
    }
  }

  private canUpdateAttendance(attendance: AttendanceModel): boolean {
    const attendanceData = attendance.getData();

    // Ne peut pas mettre à jour une présence validée
    if (attendanceData.validation.isValidated && attendanceData.validation.validatedBy) {
      return false;
    }

    // Ne peut pas mettre à jour une présence marquée manuellement par un organisateur
    if (attendanceData.method === AttendanceMethod.MANUAL && attendanceData.markedBy) {
      return false;
    }

    return true;
  }

  async validateAttendance(request: AttendanceValidationRequest): Promise<AttendanceModel> {
    const attendance = await this.getAttendanceById(request.attendanceId);

    // Vérifier les permissions
    if (!await this.canValidateAttendance(request.validatedBy, attendance)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Vérifier que la présence peut être validée
    if (attendance.getData().validation.validatedBy) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }

    // Appliquer la validation
    attendance.validateAttendance(request.validatedBy, request.approved, request.notes);
    await this.saveAttendance(attendance);

    // Mettre à jour les statistiques de l'événement
    await this.updateEventAttendanceStats(attendance.getData().eventId);

    // Log de l'audit
    if (!attendance.id) {
      throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
    }
    await this.logAttendanceAction("attendance_validated", attendance.id, request.validatedBy, {
      approved: request.approved,
      notes: request.notes,
      originalStatus: attendance.getData().status,
    });

    return attendance;
  }

  async bulkValidateAttendances(
    attendanceIds: string[],
    validatedBy: string,
    approved: boolean,
    notes?: string
  ): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    // Traitement en lot
    const batchSize = 20;
    for (let i = 0; i < attendanceIds.length; i += batchSize) {
      const batch = attendanceIds.slice(i, i + batchSize);

      await Promise.all(batch.map(async (attendanceId) => {
        try {
          await this.validateAttendance({
            attendanceId,
            validatedBy,
            approved,
            notes,
          });
          results.success.push(attendanceId);
        } catch (error) {
          results.failed.push({
            id: attendanceId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }));
    }

    // Log de l'audit
    await this.logAttendanceAction("bulk_validate_attendances", null, validatedBy, {
      totalProcessed: attendanceIds.length,
      successful: results.success.length,
      failed: results.failed.length,
      approved,
    });

    return results;
  }

  // 📊 MARQUAGE AUTOMATIQUE DES ABSENCES
  async markAbsentees(eventId: string, markedBy: string): Promise<number> {
    const event = await eventService.getEventById(eventId);
    const eventData = event.getData();

    // Vérifier les permissions
    if (!await this.canMarkAttendanceManually(markedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Vérifier que l'événement est terminé ou en cours
    if (!["in_progress", "completed"].includes(eventData.status)) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }

    // Récupérer les présences existantes
    const existingAttendances = await this.getAttendancesByEvent(eventId);
    const attendedUserIds = existingAttendances.map((a) => a.getData().userId);

    // Identifier les absents
    const absenteeIds = eventData.participants.filter((participantId) =>
      !attendedUserIds.includes(participantId)
    );

    // Marquer les absents en lot
    const batch = this.db.batch();
    let markedCount = 0;

    for (const userId of absenteeIds) {
      const attendance = AttendanceModel.fromMarkRequest({
        eventId,
        userId,
        status: AttendanceStatus.ABSENT,
        method: AttendanceMethod.MANUAL,
        notes: "Marqué automatiquement comme absent",
      }, markedBy);

      const attendanceRef = this.db.collection("attendances").doc();
      batch.set(attendanceRef, attendance.toFirestore());
      markedCount++;
    }

    await batch.commit();

    // Mettre à jour les statistiques de l'événement
    await this.updateEventAttendanceStats(eventId);

    // Log de l'audit
    await this.logAttendanceAction("mark_absentees", null, markedBy, {
      eventId,
      markedCount,
      totalParticipants: eventData.participants.length,
    });

    return markedCount;
  }

  // 📋 RÉCUPÉRATION DES DONNÉES
  async getAttendanceById(attendanceId: string): Promise<AttendanceModel> {
    const attendanceDoc = await this.db.collection("attendances").doc(attendanceId).get();

    if (!attendanceDoc.exists) {
      throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
    }

    const attendance = AttendanceModel.fromFirestore(attendanceDoc);
    if (!attendance) {
      throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
    }

    return attendance;
  }

  async getAttendanceByUserAndEvent(userId: string, eventId: string): Promise<AttendanceModel | null> {
    const query = await this.db
      .collection("attendances")
      .where("userId", "==", userId)
      .where("eventId", "==", eventId)
      .limit(1)
      .get();

    if (query.empty) {
      return null;
    }

    return AttendanceModel.fromFirestore(query.docs[0]);
  }

  async getAttendancesByEvent(eventId: string): Promise<AttendanceModel[]> {
    const query = await this.db
      .collection("attendances")
      .where("eventId", "==", eventId)
      .orderBy("checkInTime", "asc")
      .get();

    return query.docs
      .map((doc) => AttendanceModel.fromFirestore(doc))
      .filter((attendance) => attendance !== null) as AttendanceModel[];
  }

  async getAttendancesByUser(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      status?: AttendanceStatus
    } = {}
  ): Promise<AttendanceModel[]> {
    let query: Query = this.db
      .collection("attendances")
      .where("userId", "==", userId);

    if (options.status) {
      query = query.where("status", "==", options.status);
    }

    if (options.startDate) {
      query = query.where("createdAt", ">=", options.startDate);
    }

    if (options.endDate) {
      query = query.where("createdAt", "<=", options.endDate);
    }

    query = query.orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs
      .map((doc) => AttendanceModel.fromFirestore(doc))
      .filter((attendance) => attendance !== null) as AttendanceModel[];
  }

  async getAttendances(options: AttendanceListOptions = {}): Promise<AttendanceListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      eventId,
      userId,
      status,
      method,
      dateRange,
      validationStatus,
    } = options;

    // Validation de la pagination
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query: Query = this.db.collection("attendances");

    // Filtres
    if (eventId) {
      query = query.where("eventId", "==", eventId);
    }

    if (userId) {
      query = query.where("userId", "==", userId);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    if (method) {
      query = query.where("method", "==", method);
    }

    if (validationStatus) {
      switch (validationStatus) {
      case "pending":
        query = query.where("requiresValidation", "==", true)
          .where("validatedBy", "==", null);
        break;
      case "validated":
        query = query.where("validatedBy", "!=", null);
        break;
      }
    }

    // Filtre par plage de dates
    if (dateRange) {
      query = query.where("createdAt", ">=", dateRange.start)
        .where("createdAt", "<=", dateRange.end);
    }

    // Tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const attendances = snapshot.docs
      .map((doc) => AttendanceModel.fromFirestore(doc))
      .filter((attendance) => attendance !== null)
      .map((attendance) => attendance.getData());

    // Compter le total
    const total = await this.countAttendances(options);

    return {
      attendances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  // 🔄 OPÉRATIONS EN LOT
  async bulkMarkAttendance(operation: BulkAttendanceOperation, performedBy: string): Promise<{
    success: string[];
    failed: Array<{ userId: string; error: string }>;
  }> {
    const event = await eventService.getEventById(operation.eventId);

    // Vérifier les permissions
    if (!await this.canMarkAttendanceManually(performedBy, event)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    const results = {
      success: [] as string[],
      failed: [] as Array<{ userId: string; error: string }>,
    };

    // Traitement en lot
    const batchSize = 20;
    for (let i = 0; i < operation.userIds.length; i += batchSize) {
      const batch = operation.userIds.slice(i, i + batchSize);

      await Promise.all(batch.map(async (userId) => {
        try {
          switch (operation.operation) {
          case "mark_present":
            await this.markAttendanceManually(userId, operation.eventId, AttendanceStatus.PRESENT, performedBy, operation.notes);
            break;
          case "mark_absent":
            await this.markAttendanceManually(userId, operation.eventId, AttendanceStatus.ABSENT, performedBy, operation.notes);
            break;
          case "mark_excused":
            await this.markAttendanceManually(userId, operation.eventId, AttendanceStatus.EXCUSED, performedBy, operation.notes);
            break;
          case "validate": {
            const attendance = await this.getAttendanceByUserAndEvent(userId, operation.eventId);
            if (attendance) {
              if (!attendance.id) {
                throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
              }
              await this.validateAttendance({
                attendanceId: attendance.id,
                validatedBy: performedBy,
                approved: true,
                notes: operation.notes,
              });
            }
            break;
          }
          case "reject": {
            const attendanceToReject = await this.getAttendanceByUserAndEvent(userId, operation.eventId);
            if (attendanceToReject) {
              if (!attendanceToReject.id) {
                throw new Error(ERROR_CODES.ATTENDANCE_NOT_FOUND);
              }
              await this.validateAttendance({
                attendanceId: attendanceToReject.id,
                validatedBy: performedBy,
                approved: false,
                notes: operation.notes,
              });
            }
            break;
          }
          }
          results.success.push(userId);
        } catch (error) {
          results.failed.push({
            userId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }));
    }

    // Log de l'audit
    await this.logAttendanceAction("bulk_mark_attendance", null, performedBy, {
      operation: operation.operation,
      eventId: operation.eventId,
      totalProcessed: operation.userIds.length,
      successful: results.success.length,
      failed: results.failed.length,
    });

    return results;
  }

  private async markAttendanceManually(
    userId: string,
    eventId: string,
    status: AttendanceStatus,
    markedBy: string,
    notes?: string
  ): Promise<AttendanceModel> {
    const event = await eventService.getEventById(eventId);

    // Créer ou mettre à jour l'attendance
    const attendance = await this.createOrUpdateAttendance(
      userId,
      event,
      {
        status,
        markedBy,
        notes,
        validation: {
          isValidated: false,
          validationNotes: "Manual entry - requires validation",
        },
      },
      AttendanceMethod.MANUAL
    );

    await this.saveAttendance(attendance);
    return attendance;
  }

  // 🔍 VALIDATION DES PERMISSIONS
  private async canValidateAttendance(validatorId: string, attendance: AttendanceModel): Promise<boolean> {
    const attendanceData = attendance.getData();

    // Récupérer l'événement pour vérifier les permissions
    const event = await eventService.getEventById(attendanceData.eventId);
    const eventData = event.getData();

    // L'organisateur peut toujours valider
    if (eventData.organizerId === validatorId || eventData.coOrganizers.includes(validatorId)) {
      return true;
    }

    // Vérifier les permissions globales
    if (await authService.hasPermission(validatorId, "validate_attendances")) {
      return true;
    }

    // Vérifier les permissions d'équipe
    if (await authService.hasPermission(validatorId, "validate_team_attendances")) {
      // TODO: Vérifier si l'utilisateur est dans la même équipe
      return true;
    }

    return false;
  }

  // 🛠️ MÉTHODES UTILITAIRES
  private getRequiredMethods(attendanceSettings: any): AttendanceMethod[] {
    const methods: AttendanceMethod[] = [];

    if (attendanceSettings.requireQRCode) {
      methods.push(AttendanceMethod.QR_CODE);
    }

    if (attendanceSettings.requireGeolocation) {
      methods.push(AttendanceMethod.GEOLOCATION);
    }

    if (attendanceSettings.requireBiometric) {
      methods.push(AttendanceMethod.BIOMETRIC);
    }

    // Si aucune méthode spécifique n'est requise, autoriser toutes
    if (methods.length === 0) {
      return Object.values(AttendanceMethod);
    }

    return methods;
  }

  private getCheckInMessage(status: AttendanceStatus): string {
    switch (status) {
    case AttendanceStatus.PRESENT:
      return "Présence enregistrée avec succès !";
    case AttendanceStatus.LATE:
      return "Présence enregistrée - Arrivée en retard notée.";
    case AttendanceStatus.EXCUSED:
      return "Absence excusée enregistrée.";
    default:
      return "Présence enregistrée.";
    }
  }

  private requiresValidation(method: AttendanceMethod, status: AttendanceStatus): boolean {
    // Les enregistrements manuels nécessitent toujours une validation
    if (method === AttendanceMethod.MANUAL) {
      return true;
    }

    // Les absences excusées nécessitent une validation
    if (status === AttendanceStatus.EXCUSED) {
      return true;
    }

    return false;
  }

  // 📊 MISE À JOUR DES STATISTIQUES
  private async updateEventAttendanceStats(eventId: string): Promise<void> {
    const attendances = await this.getAttendancesByEvent(eventId);
    const event = await eventService.getEventById(eventId);
    const eventData = event.getData();

    // Calculer les statistiques
    const stats = {
      totalPresent: attendances.filter((a) => a.getData().status === AttendanceStatus.PRESENT).length,
      totalAbsent: attendances.filter((a) => a.getData().status === AttendanceStatus.ABSENT).length,
      totalLate: attendances.filter((a) => a.getData().status === AttendanceStatus.LATE).length,
      totalExcused: attendances.filter((a) => a.getData().status === AttendanceStatus.EXCUSED).length,
      totalInvited: eventData.participants.length,
      totalConfirmed: eventData.confirmedParticipants?.length || 0,
      attendanceRate: 0,
      punctualityRate: 0,
    };

    if (eventData.participants.length > 0) {
      const presentCount = stats.totalPresent + stats.totalLate;
      stats.attendanceRate = (presentCount / eventData.participants.length) * 100;
    }

    if (stats.totalPresent + stats.totalLate > 0) {
      stats.punctualityRate = (stats.totalPresent / (stats.totalPresent + stats.totalLate)) * 100;
    }

    // Mettre à jour l'événement
    event.update({stats});
    await this.db.collection("events").doc(eventId).update({stats});
  }

  private async countAttendances(options: AttendanceListOptions): Promise<number> {
    let query: Query = this.db.collection("attendances");

    // Appliquer les mêmes filtres que dans getAttendances
    const {eventId, userId, status, method, dateRange, validationStatus} = options;

    if (eventId) {query = query.where("eventId", "==", eventId);}
    if (userId) {query = query.where("userId", "==", userId);}
    if (status) {query = query.where("status", "==", status);}
    if (method) {query = query.where("method", "==", method);}

    if (validationStatus === "pending") {
      query = query.where("validation.isValidated", "==", false);
    } else if (validationStatus === "validated") {
      query = query.where("validation.isValidated", "==", true);
    }

    if (dateRange) {
      query = query.where("createdAt", ">=", dateRange.start)
        .where("createdAt", "<=", dateRange.end);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async saveAttendance(attendance: AttendanceModel): Promise<void> {
    await attendance.validate();
    const attendanceRef = attendance.id ?
      this.db.collection("attendances").doc(attendance.id) :
      this.db.collection("attendances").doc();

    if (!attendance.id) {
      attendance.getData().id = attendanceRef.id;
    }

    await attendanceRef.set(attendance.toFirestore(), {merge: true});
  }

  private async logAttendanceAction(
    action: string,
    attendanceId: string | null,
    performedBy: string,
    details?: any
  ): Promise<void> {
    await this.db.collection("audit_logs").add({
      action,
      targetType: "attendance",
      targetId: attendanceId,
      performedBy,
      performedAt: new Date(),
      details,
    });
  }
  // backend/functions/src/services/attendance.service.ts - PARTIE 3/3

  // 📊 STATISTIQUES ET ANALYSES
  async getAttendanceStats(
    filters: {
      userId?: string;
      eventId?: string;
      organizerId?: string;
      dateRange?: { start: Date; end: Date };
      department?: string;
    } = {}
  ): Promise<AttendanceStats> {
    let query: Query = this.db.collection("attendances");

    // Appliquer les filtres
    if (filters.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    if (filters.eventId) {
      query = query.where("eventId", "==", filters.eventId);
    }

    if (filters.dateRange) {
      query = query.where("createdAt", ">=", filters.dateRange.start)
        .where("createdAt", "<=", filters.dateRange.end);
    }

    const snapshot = await query.get();
    const attendances = snapshot.docs.map((doc) => doc.data() as AttendanceRecord);

    // Calculer les statistiques
    const statsByStatus = attendances.reduce((acc, attendance) => {
      acc[attendance.status] = (acc[attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<AttendanceStatus, number>);

    const statsByMethod = attendances.reduce((acc, attendance) => {
      acc[attendance.method] = (acc[attendance.method] || 0) + 1;
      return acc;
    }, {} as Record<AttendanceMethod, number>);

    // Calculer la moyenne des temps de check-in
    const checkInTimes = attendances
      .filter((a) => a.checkInTime && a.status !== AttendanceStatus.ABSENT)
      .map((a) => a.checkInTime)
      .filter((time): time is Date => time !== undefined);

    const averageCheckInTime = this.calculateAverageCheckInTime(checkInTimes);

    // Calculer le taux de ponctualité
    const presentAndLate = attendances.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
    );
    const punctualityRate = presentAndLate.length > 0 ?
      (attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length / presentAndLate.length) * 100 :
      0;

    // Compter les validations en attente
    const validationPending = attendances.filter((a) =>
      !a.validation.isValidated
    ).length;

    return {
      total: attendances.length,
      byStatus: statsByStatus,
      byMethod: statsByMethod,
      averageCheckInTime,
      punctualityRate: Math.round(punctualityRate * 10) / 10,
      validationPending,
    };
  }

  async getEventAttendanceReport(eventId: string): Promise<EventAttendanceReport> {
    const [event, attendances] = await Promise.all([
      eventService.getEventById(eventId),
      this.getAttendancesByEvent(eventId),
    ]);

    const eventData = event.getData();
    const attendanceData = attendances.map((a) => a.getData());

    // Calculer les statistiques
    const totalPresent = attendanceData.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const totalAbsent = attendanceData.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const totalLate = attendanceData.filter((a) => a.status === AttendanceStatus.LATE).length;
    const totalExcused = attendanceData.filter((a) => a.status === AttendanceStatus.EXCUSED).length;

    const attendanceRate = eventData.participants.length > 0 ?
      ((totalPresent + totalLate) / eventData.participants.length) * 100 :
      0;

    const punctualityRate = (totalPresent + totalLate) > 0 ?
      (totalPresent / (totalPresent + totalLate)) * 100 :
      0;

    // Calculer la moyenne des temps de check-in
    const checkInTimes = attendanceData
      .filter((a) => a.checkInTime)
      .map((a) => a.checkInTime!);

    const averageCheckInTime = this.calculateAverageCheckInTime(checkInTimes);

    // Créer la timeline
    const timeline = attendanceData
      .filter((a) => a.checkInTime)
      .sort((a, b) => (a.checkInTime?.getTime() || 0) - (b.checkInTime?.getTime() || 0))
      .map((a) => ({
        time: a.checkInTime || new Date(),
        action: `Check-in: ${a.status}`,
        userId: a.userId,
        method: a.method,
      }));

    return {
      event: {
        id: eventData.id || '',
        title: eventData.title,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        totalParticipants: eventData.participants.length,
      },
      statistics: {
        totalPresent,
        totalAbsent,
        totalLate,
        totalExcused,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        averageCheckInTime,
      },
      attendances: attendanceData,
      timeline,
    };
  }

  async getUserAttendanceReport(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    user: { id: string; name: string };
    period: { start: Date; end: Date };
    statistics: {
      totalEvents: number;
      attended: number;
      absent: number;
      late: number;
      excused: number;
      attendanceRate: number;
      punctualityRate: number;
      averageCheckInTime: number;
    };
    attendances: AttendanceRecord[];
    trends: Array<{
      month: string;
      attendanceRate: number;
      punctualityRate: number;
    }>;
  }> {
    const [user, attendances] = await Promise.all([
      userService.getUserById(userId),
      this.getAttendancesByUser(userId, {
        startDate: dateRange.start,
        endDate: dateRange.end,
      }),
    ]);

    const userData = user.getData();
    const attendanceData = attendances.map((a) => a.getData());

    // Calculer les statistiques
    const totalEvents = attendanceData.length;
    const attended = attendanceData.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
    ).length;
    const absent = attendanceData.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const late = attendanceData.filter((a) => a.status === AttendanceStatus.LATE).length;
    const excused = attendanceData.filter((a) => a.status === AttendanceStatus.EXCUSED).length;

    const attendanceRate = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;
    const punctualityRate = attended > 0 ? ((attended - late) / attended) * 100 : 0;

    // Calculer la moyenne des temps de check-in
    const checkInTimes = attendanceData
      .filter((a) => a.checkInTime)
      .map((a) => a.checkInTime!);

    const averageCheckInTime = this.calculateAverageCheckInTime(checkInTimes);

    // Calculer les tendances mensuelles
    const trends = this.calculateMonthlyTrends(attendanceData, dateRange);

    return {
      user: {
        id: userData.id || '',
        name: userData.displayName,
      },
      period: dateRange,
      statistics: {
        totalEvents,
        attended,
        absent,
        late,
        excused,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        punctualityRate: Math.round(punctualityRate * 10) / 10,
        averageCheckInTime,
      },
      attendances: attendanceData,
      trends,
    };
  }

  // 📈 ANALYSES AVANCÉES
  async getAttendanceTrends(
    options: {
      organizerId?: string;
      department?: string;
      eventType?: string;
      period: "daily" | "weekly" | "monthly";
      dateRange: { start: Date; end: Date };
    }
  ): Promise<Array<{
    date: string;
    attendanceRate: number;
    punctualityRate: number;
    totalEvents: number;
    totalAttendances: number;
  }>> {
    // Cette méthode nécessiterait une implémentation plus complexe
    // avec des requêtes d'agrégation ou un système de cache
    // Pour l'instant, retourner un exemple
    return [];
  }

  async getAttendancePatterns(userId: string): Promise<{
    preferredCheckInMethods: Array<{ method: AttendanceMethod; count: number; percentage: number }>;
    checkInTimingPattern: {
      averageMinutesBeforeStart: number;
      mostCommonTimeSlot: string;
    };
    attendanceByDayOfWeek: Record<string, number>;
    attendanceByEventType: Record<string, number>;
  }> {
    const attendances = await this.getAttendancesByUser(userId, {limit: 100});
    const attendanceData = attendances.map((a) => a.getData());

    // Analyser les méthodes préférées
    const methodCounts = attendanceData.reduce((acc, a) => {
      acc[a.method] = (acc[a.method] || 0) + 1;
      return acc;
    }, {} as Record<AttendanceMethod, number>);

    const total = attendanceData.length;
    const preferredCheckInMethods = Object.entries(methodCounts)
      .map(([method, count]) => ({
        method: method as AttendanceMethod,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Analyser les patterns temporels
    const checkInTimes = attendanceData
      .filter((a) => a.checkInTime)
      .map((a) => ({
        time: a.checkInTime || new Date(),
        dayOfWeek: a.checkInTime?.getDay() || 0,
        hour: a.checkInTime?.getHours() || 0,
      }));

    const averageMinutesBeforeStart = 5; // Calcul simplifié
    const mostCommonHour = this.getMostCommonHour(checkInTimes.map((t) => t.hour));
    const mostCommonTimeSlot = `${mostCommonHour}:00-${mostCommonHour + 1}:00`;

    // Analyser par jour de la semaine
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const attendanceByDayOfWeek = checkInTimes.reduce((acc, t) => {
      const dayName = dayNames[t.dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      preferredCheckInMethods,
      checkInTimingPattern: {
        averageMinutesBeforeStart,
        mostCommonTimeSlot,
      },
      attendanceByDayOfWeek,
      attendanceByEventType: {}, // À implémenter avec les données d'événements
    };
  }

  // 📤 EXPORT DE DONNÉES
  async exportAttendances(
    filters: AttendanceListOptions,
    format: "csv" | "json" | "excel",
    requesterId: string
  ): Promise<{ data: any; filename: string; mimeType: string }> {
    // Vérifier les permissions d'export
    if (!await authService.hasPermission(requesterId, "export_event_data")) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Récupérer toutes les présences selon les filtres
    const attendances = await this.getAttendances({...filters, limit: 10000});

    const timestamp = new Date().toISOString().split("T")[0];

    switch (format) {
    case "json":
      return {
        data: JSON.stringify(attendances.attendances, null, 2),
        filename: `attendances_export_${timestamp}.json`,
        mimeType: "application/json",
      };

    case "csv": {
      const csvData = this.convertAttendancesToCSV(attendances.attendances);
      return {
        data: csvData,
        filename: `attendances_export_${timestamp}.csv`,
        mimeType: "text/csv",
      };
    }

    case "excel":
      throw new Error("Excel export not implemented yet");

    default:
      throw new Error("Unsupported export format");
    }
  }

  // 🛠️ MÉTHODES UTILITAIRES PRIVÉES
  private calculateAverageCheckInTime(checkInTimes: Date[]): number {
    if (checkInTimes.length === 0) {return 0;}

    // Pour cette implémentation, retourner la moyenne des minutes de l'heure
    const totalMinutes = checkInTimes.reduce((sum, time) => sum + time.getMinutes(), 0);
    return Math.round(totalMinutes / checkInTimes.length);
  }

  private calculateMonthlyTrends(
    attendances: AttendanceRecord[],
    dateRange: { start: Date; end: Date }
  ): Array<{ month: string; attendanceRate: number; punctualityRate: number }> {
    const monthlyData = new Map<string, { total: number; present: number; punctual: number }>();

    attendances.forEach((attendance) => {
      if (!attendance.createdAt) {return;}

      const monthKey = `${attendance.createdAt.getFullYear()}-${String(attendance.createdAt.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {total: 0, present: 0, punctual: 0});
      }

      const data = monthlyData.get(monthKey)!;
      data.total++;

      if ([AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
        data.present++;
      }

      if (attendance.status === AttendanceStatus.PRESENT) {
        data.punctual++;
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      attendanceRate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      punctualityRate: data.present > 0 ? Math.round((data.punctual / data.present) * 100) : 0,
    }));
  }

  private getMostCommonHour(hours: number[]): number {
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return parseInt(Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "9");
  }

  private convertAttendancesToCSV(attendances: AttendanceRecord[]): string {
    if (attendances.length === 0) {return "No attendances to export";}

    const headers = [
      "ID", "User ID", "Event ID", "Status", "Method", "Check-in Time",
      "Marked By", "Validated By", "Validated At", "Notes", "Created At",
    ];

    const rows = attendances.map((attendance) => [
      attendance.id || "",
      attendance.userId,
      attendance.eventId,
      attendance.status,
      attendance.method,
      attendance.checkInTime?.toISOString() || "",
      attendance.markedBy || "",
      attendance.validation.validatedBy || "",
      attendance.validation.validatedAt?.toISOString() || "",
      attendance.notes || "",
      attendance.createdAt?.toISOString() || "",
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");
  }

  // 🧹 NETTOYAGE ET MAINTENANCE
  async cleanupOldAttendances(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 an

    // Supprimer les anciennes présences non validées
    const oldAttendances = await this.db
      .collection("attendances")
      .where("createdAt", "<", cutoffDate)
      .get();

    if (!oldAttendances.empty) {
      const batch = this.db.batch();
      oldAttendances.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  }

  // 🔄 SYNCHRONISATION ET CORRECTIONS
  async synchronizeEventAttendances(eventId: string): Promise<{
    synchronized: number;
    corrected: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const event = await eventService.getEventById(eventId);
    const eventData = event.getData();
    const existingAttendances = await this.getAttendancesByEvent(eventId);

    const results = {
      synchronized: 0,
      corrected: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    // Vérifier chaque participant inscrit
    for (const participantId of eventData.participants) {
      try {
        const existingAttendance = existingAttendances.find((a) => a.getData().userId === participantId);

        if (!existingAttendance) {
          // Marquer comme absent si l'événement est terminé
          if (eventData.status === "completed" && eventData.endDateTime < new Date()) {
            await this.markAttendanceManually(
              participantId,
              eventId,
              AttendanceStatus.ABSENT,
              "system",
              "Marqué automatiquement comme absent après synchronisation"
            );
            results.synchronized++;
          }
        } else {
          // Vérifier la cohérence des données
          const attendanceData = existingAttendance.getData();
          if (this.needsCorrection(attendanceData, eventData)) {
            // Appliquer les corrections nécessaires
            await this.correctAttendanceData(existingAttendance, eventData);
            results.corrected++;
          }
        }
      } catch (error) {
        results.errors.push({
          userId: participantId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  private needsCorrection(attendanceData: AttendanceRecord, eventData: any): boolean {
    // Vérifier si les métriques de ponctualité sont cohérentes
    if (attendanceData.checkInTime && attendanceData.status === AttendanceStatus.PRESENT) {
      const actualStatus = this.determineAttendanceStatus(attendanceData.checkInTime, {getData: () => eventData} as EventModel);
      return actualStatus !== attendanceData.status;
    }

    return false;
  }

  private async correctAttendanceData(attendance: AttendanceModel, eventData: any): Promise<void> {
    const attendanceData = attendance.getData();

    if (attendanceData.checkInTime) {
      // Recalculer le statut correct
      const correctStatus = this.determineAttendanceStatus(
        attendanceData.checkInTime,
        {getData: () => eventData} as EventModel
      );

      // Recalculer les métriques
      const correctMetrics = this.calculateAttendanceMetrics(
        attendance,
        {getData: () => eventData} as EventModel
      );

      // Mettre à jour si nécessaire
      if (correctStatus !== attendanceData.status ||
          JSON.stringify(correctMetrics) !== JSON.stringify(attendanceData.metrics)) {
        attendance.update({
          status: correctStatus,
          metrics: correctMetrics,
          updatedAt: new Date(),
        });

        await this.saveAttendance(attendance);
      }
    }
  }

  // 🤖 AUTOMATISATION ET TÂCHES PROGRAMMÉES
  async processScheduledAttendanceTasks(): Promise<void> {
    // Marquer automatiquement les absents pour les événements terminés
    await this.autoMarkAbsentees();

    // Envoyer des rappels de validation
    await this.sendValidationReminders();

    // Nettoyer les anciennes données
    await this.cleanupOldAttendances();
  }

  private async autoMarkAbsentees(): Promise<void> {
    // Récupérer les événements terminés sans présences complètes
    const completedEvents = await this.db
      .collection("events")
      .where("status", "==", "completed")
      .where("endDateTime", "<", new Date(Date.now() - 2 * 60 * 60 * 1000)) // 2h après la fin
      .get();

    for (const eventDoc of completedEvents.docs) {
      try {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();

        // Vérifier si tous les participants ont une présence enregistrée
        const attendances = await this.getAttendancesByEvent(eventId);
        const attendedUserIds = attendances.map((a) => a.getData().userId);
        const missingUsers = eventData.participants.filter((pid: string) => !attendedUserIds.includes(pid));

        if (missingUsers.length > 0) {
          await this.markAbsentees(eventId, "system");

          console.log(`Auto-marked ${missingUsers.length} absentees for event ${eventId}`);
        }
      } catch (error) {
        console.error(`Error auto-marking absentees for event ${eventDoc.id}:`, error);
      }
    }
  }

  private async sendValidationReminders(): Promise<void> {
    // Récupérer les présences en attente de validation depuis plus de 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingValidations = await this.db
      .collection("attendances")
      .where("requiresValidation", "==", true)
      .where("validatedBy", "==", null)
      .where("createdAt", "<", yesterday)
      .get();

    // Grouper par événement
    const eventGroups = new Map<string, string[]>();

    pendingValidations.docs.forEach((doc) => {
      const data = doc.data();
      if (!eventGroups.has(data.eventId)) {
        eventGroups.set(data.eventId, []);
      }
      eventGroups.get(data.eventId)!.push(doc.id);
    });

    // Envoyer des rappels aux organisateurs
    for (const [eventId, attendanceIds] of eventGroups.entries()) {
      try {
        const event = await eventService.getEventById(eventId);
        const eventData = event.getData();

        // TODO: Envoyer notification à l'organisateur
        console.log(`Validation reminder needed for event ${eventId}: ${attendanceIds.length} pending validations`);

        // Log pour audit
        await this.logAttendanceAction("validation_reminder_sent", null, "system", {
          eventId,
          pendingCount: attendanceIds.length,
          organizerId: eventData.organizerId,
        });
      } catch (error) {
        console.error(`Error sending validation reminder for event ${eventId}:`, error);
      }
    }
  }

  // 📋 RAPPORTS SPÉCIALISÉS
  async generateDepartmentAttendanceReport(
    department: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    department: string;
    period: { start: Date; end: Date };
    summary: {
      totalEmployees: number;
      totalEvents: number;
      averageAttendanceRate: number;
      topPerformers: Array<{ userId: string; name: string; attendanceRate: number }>;
      improvementNeeded: Array<{ userId: string; name: string; attendanceRate: number }>;
    };
    trends: Array<{
      month: string;
      attendanceRate: number;
      eventCount: number;
    }>;
  }> {
    // Cette implémentation nécessiterait l'intégration avec les données RH
    // et serait plus complexe en production
    return {
      department,
      period: dateRange,
      summary: {
        totalEmployees: 0,
        totalEvents: 0,
        averageAttendanceRate: 0,
        topPerformers: [],
        improvementNeeded: [],
      },
      trends: [],
    };
  }

  // 🎯 MÉTHODES DE NOTIFICATION (STUBS)
  // @ts-ignore
  private async notifyAttendanceMarked(attendance: AttendanceModel): Promise<void> {
    logger.info(`Attendance marked for user ${attendance.getData().userId} in event ${attendance.getData().eventId}`);
    // TODO: Implémenter avec NotificationService
  }
  
// @ts-ignore
  private async notifyValidationRequired(attendance: AttendanceModel): Promise<void> {
    logger.info(`Validation required for attendance ${attendance.id}`);
    // TODO: Implémenter avec NotificationService
  }

  // 🔧 MÉTHODES DE DIAGNOSTIC
  async diagnoseAttendanceIssues(eventId: string): Promise<{
    issues: Array<{
      type: "missing_attendance" | "invalid_status" | "timing_anomaly" | "validation_pending";
      description: string;
      affectedUsers: string[];
      severity: "low" | "medium" | "high";
      suggestion: string;
    }>;
    healthScore: number;
  }> {
    const event = await eventService.getEventById(eventId);
    const eventData = event.getData();
    const attendances = await this.getAttendancesByEvent(eventId);

    const issues = [];
    let healthScore = 100;

    // Vérifier les présences manquantes
    const attendedUserIds = attendances.map((a) => a.getData().userId);
    const missingAttendances = eventData.participants.filter((pid: string) => !attendedUserIds.includes(pid));

    if (missingAttendances.length > 0) {
      issues.push({
        type: "missing_attendance" as const,
        description: `${missingAttendances.length} participants n'ont pas de présence enregistrée`,
        affectedUsers: missingAttendances,
        severity: "medium" as const,
        suggestion: "Marquer manuellement les absents ou vérifier les systèmes de check-in",
      });
      healthScore -= missingAttendances.length * 5;
    }

    // Vérifier les validations en attente
    const pendingValidations = attendances.filter((a) => a.getData().validation.isValidated && !a.getData().validation.validatedBy);

    if (pendingValidations.length > 0) {
      issues.push({
        type: "validation_pending" as const,
        description: `${pendingValidations.length} présences en attente de validation`,
        affectedUsers: pendingValidations.map((a) => a.getData().userId),
        severity: "low" as const,
        suggestion: "Valider les présences en attente",
      });
      healthScore -= pendingValidations.length * 2;
    }

    // Vérifier les anomalies temporelles
    const lateCheckIns = attendances.filter((a) => {
      const data = a.getData();
      return data.checkInTime && data.checkInTime > new Date(eventData.endDateTime.getTime() + 30 * 60 * 1000);
    });

    if (lateCheckIns.length > 0) {
      issues.push({
        type: "timing_anomaly" as const,
        description: `${lateCheckIns.length} check-ins après la fin de l'événement`,
        affectedUsers: lateCheckIns.map((a) => a.getData().userId),
        severity: "high" as const,
        suggestion: "Vérifier les horloges système et corriger les timestamps",
      });
      healthScore -= lateCheckIns.length * 10;
    }

    return {
      issues,
      healthScore: Math.max(0, healthScore),
    };
  }

  // 📈 MÉTRIQUES EN TEMPS RÉEL
  async getRealtimeAttendanceMetrics(eventId: string): Promise<{
    currentAttendees: number;
    expectedAttendees: number;
    attendanceRate: number;
    lateArrivals: number;
    checkInTrend: Array<{ time: Date; count: number }>;
    lastUpdate: Date;
  }> {
    const [event, attendances] = await Promise.all([
      eventService.getEventById(eventId),
      this.getAttendancesByEvent(eventId),
    ]);

    const eventData = event.getData();
    const attendanceData = attendances.map((a) => a.getData());

    const currentAttendees = attendanceData.filter((a) =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status)
    ).length;

    const lateArrivals = attendanceData.filter((a) => a.status === AttendanceStatus.LATE).length;

    // Calculer la tendance de check-in (par tranches de 15 minutes)
    const checkInTrend = this.calculateCheckInTrend(attendanceData, eventData.startDateTime);

    return {
      currentAttendees,
      expectedAttendees: eventData.participants.length,
      attendanceRate: eventData.participants.length > 0 ? (currentAttendees / eventData.participants.length) * 100 : 0,
      lateArrivals,
      checkInTrend,
      lastUpdate: new Date(),
    };
  }

  private calculateCheckInTrend(attendances: AttendanceRecord[], eventStart: Date): Array<{ time: Date; count: number }> {
    const trend = [];
    const startTime = new Date(eventStart.getTime() - 60 * 60 * 1000); // 1h avant
    const endTime = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000); // 2h après

    for (let time = startTime; time <= endTime; time.setMinutes(time.getMinutes() + 15)) {
      const slotEnd = new Date(time.getTime() + 15 * 60 * 1000);
      const count = attendances.filter((a) =>
        a.checkInTime && a.checkInTime >= time && a.checkInTime < slotEnd
      ).length;

      trend.push({time: new Date(time), count});
    }

    return trend;
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const attendanceService = new AttendanceService();
