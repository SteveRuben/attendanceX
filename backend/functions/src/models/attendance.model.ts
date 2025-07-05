import {DocumentSnapshot} from "firebase-admin/firestore";
import {
  BaseModel,
} from "./base.model";
import {
  AttendanceMethod,
  AttendanceRecord, AttendanceStatus, MarkAttendanceRequest,
} from "@attendance-x/shared";


export class AttendanceModel extends BaseModel<AttendanceRecord> {
  constructor(data: Partial<AttendanceRecord>) {
    super(data);
  }

  async validate(): Promise<boolean> {
    const attendance = this.data;

    // Validation des champs requis
    BaseModel.validateRequired(attendance, [
      "eventId", "userId", "status", "method", "markedBy",
    ]);

    // Validation des enums
    BaseModel.validateEnum(attendance.status, AttendanceStatus, "status");
    BaseModel.validateEnum(attendance.method, AttendanceMethod, "method");

    // Validation des dates
    if (attendance.checkInTime &&
        !BaseModel.validateDate(attendance.checkInTime)) {
      throw new Error("Invalid check-in time");
    }
    if (attendance.checkOutTime &&
        !BaseModel.validateDate(attendance.checkOutTime)) {
      throw new Error("Invalid check-out time");
    }

    // Validation de la logique des dates
    if (attendance.checkInTime && attendance.checkOutTime &&
        attendance.checkOutTime <= attendance.checkInTime) {
      throw new Error("Check-out time must be after check-in time");
    }

    // Validation des métriques
    if (attendance.metrics?.duration && attendance.metrics.duration < 0) {
      throw new Error("Duration cannot be negative");
    }

    return true;
  }

  // eslint-disable-next-line require-jsdoc
  toFirestore() {
    const {id, ...data} = this.data;
    return this.convertDatesToFirestore(data);
  }

  // eslint-disable-next-line require-jsdoc
  static fromFirestore(doc: DocumentSnapshot): AttendanceModel | null {
    if (!doc.exists) return null;

    const data = doc.data()!;
    const convertedData =
        AttendanceModel.prototype.convertDatesFromFirestore(data);

    return new AttendanceModel({
      id: doc.id,
      ...convertedData,
    });
  }

  static fromMarkRequest(
    request: MarkAttendanceRequest,
    markedBy: string): AttendanceModel {
    const now = new Date();

    const defaultValidation = {
      isValidated: request.method === AttendanceMethod.MANUAL,
      validatedBy: request.method === AttendanceMethod.MANUAL ?
        markedBy : undefined,
      validatedAt: request.method === AttendanceMethod.MANUAL ? now : undefined,
    };

    const defaultMetrics = {
      duration: undefined,
      lateMinutes: undefined,
      earlyLeaveMinutes: undefined,
    };

    const auditLog = [{
      action: "created",
      performedBy: markedBy,
      performedAt: now,
      newValue: {
        status: request.status,
        method: request.method,
      },
    }];

    return new AttendanceModel({
      eventId: request.eventId,
      userId: request.userId || markedBy,
      status: request.status,
      method: request.method,
      markedBy,
      checkInTime: request.status === AttendanceStatus.PRESENT ?
        now : undefined,
      checkInLocation: request.location,
      notes: request.notes,
      validation: defaultValidation,
      metrics: defaultMetrics,
      auditLog,
    });
  }

  // Méthodes d'instance
  isPresent(): boolean {
    return this.data.status === AttendanceStatus.PRESENT ||
           this.data.status === AttendanceStatus.LATE ||
           this.data.status === AttendanceStatus.LEFT_EARLY ||
           this.data.status === AttendanceStatus.PARTIAL;
  }

  isValidated(): boolean {
    return this.data.validation.isValidated;
  }

  calculateDuration(): number | undefined {
    if (!this.data.checkInTime || !this.data.checkOutTime) {
      return undefined;
    }

    const durationMs =
        this.data.checkOutTime.getTime() - this.data.checkInTime.getTime();
    return Math.round(durationMs / (1000 * 60)); // en minutes
  }

  checkOut(checkOutTime?: Date, location?: any): void {
    if (!this.isPresent()) {
      throw new Error("Cannot check out when not present");
    }

    if (this.data.checkOutTime) {
      throw new Error("Already checked out");
    }

    const now = checkOutTime || new Date();

    this.update({
      checkOutTime: now,
      checkOutLocation: location,
    });

    // Calculer la durée
    const duration = this.calculateDuration();
    if (duration !== undefined) {
      this.data.metrics = {
        ...this.data.metrics,
        duration,
      };
    }
  }

  validateAttendance(
    validatedBy: string,
    isValid: boolean,
    notes?: string,
    score?: number): void {
    this.update({
      validation: {
        isValidated: true,
        validatedBy,
        validatedAt: new Date(),
        validationNotes: notes,
        validationScore: score,
      },
    }, {
      action: "validated",
      performedBy: validatedBy,
      oldValue: {validation: this.data.validation},
      newValue: {isValid, notes, score},
    });
  }

  markAsLate(lateMinutes: number): void {
    this.update({
      status: AttendanceStatus.LATE,
      metrics: {
        ...this.data.metrics,
        lateMinutes,
      },
    });
  }

  markAsLeftEarly(earlyMinutes: number): void {
    this.update({
      status: AttendanceStatus.LEFT_EARLY,
      metrics: {
        ...this.data.metrics,
        earlyLeaveMinutes: earlyMinutes,
      },
    });
  }

  addFeedback(
    rating: number,
    comment?: string,
    wouldRecommend?: boolean): void {
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    this.update({
      feedback: {
        rating,
        comment: comment?.trim(),
        wouldRecommend,
      },
    });
  }

  static validateLocation(
    userLocation: { latitude: number; longitude: number; accuracy?: number },
    eventLocation: { latitude: number; longitude: number },
    maxRadius: number
  ): { isValid: boolean; distance: number; accuracy: number } {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      eventLocation.latitude,
      eventLocation.longitude
    );

    const accuracy = userLocation.accuracy || 0;

    return {
      isValid: distance <= maxRadius && accuracy <= 100,
      // 100m de précision max
      distance: Math.round(distance),
      accuracy,
    };
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number): number {
    const R = 6371e3; // Rayon terrestre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // 🆕 Calcul automatique des métriques
  calculateMetrics(
    eventStartTime: Date,
    eventEndTime: Date): void {
    const metrics = {...this.data.metrics};

    if (
      this.data.checkInTime &&
        this.data.status === AttendanceStatus.PRESENT) {
      // Calcul retard
      if (this.data.checkInTime > eventStartTime) {
        metrics.lateMinutes = Math.round(
          (this.data.checkInTime.getTime() - eventStartTime.getTime()) /
            (1000 * 60)
        );

        if (metrics.lateMinutes > 15) { // Seuil de retard
          this.data.status = AttendanceStatus.LATE;
        }
      }

      // Calcul durée si checkout
      if (this.data.checkOutTime) {
        metrics.duration = Math.round(
          (this.data.checkOutTime.getTime() - this.data.checkInTime.getTime()) /
            (1000 * 60)
        );

        // Départ anticipé
        if (this.data.checkOutTime < eventEndTime) {
          metrics.earlyLeaveMinutes = Math.round(
            (eventEndTime.getTime() - this.data.checkOutTime.getTime()) /
              (1000 * 60)
          );

          if (metrics.earlyLeaveMinutes > 15) { // Seuil départ anticipé
            this.data.status = AttendanceStatus.LEFT_EARLY;
          }
        }
      }
    }

    this.update({metrics});
  }
}
