// backend/functions/src/services/session-tracking.service.ts - Service de suivi des sessions

import { getFirestore } from "firebase-admin/firestore";
import { ERROR_CODES } from "@attendance-x/shared";
import { EventModel } from "../models/event.model";

export interface EventSession {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isRequired: boolean;
  sessionType: 'presentation' | 'workshop' | 'break' | 'networking' | 'meal' | 'other';
  location?: string;
  capacity?: number;
  presenter?: string;
  materials?: string[];
  order: number;
}

export interface SessionAttendance {
  id: string;
  sessionId: string;
  userId: string;
  eventId: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late' | 'left_early' | 'partial';
  duration: number; // en minutes
  method: 'qr_code' | 'manual' | 'automatic' | 'biometric' | 'nfc';
  notes?: string;
}

export interface PartialAttendanceRecord {
  userId: string;
  eventId: string;
  totalSessions: number;
  attendedSessions: number;
  requiredSessions: number;
  attendedRequiredSessions: number;
  attendancePercentage: number;
  requiredAttendancePercentage: number;
  totalDuration: number; // en minutes
  effectiveDuration: number; // temps réellement présent
  sessions: SessionAttendance[];
  isEligibleForCertificate: boolean;
  certificateEligibilityReason?: string;
}

export class SessionTrackingService {
  private readonly db = getFirestore();

  /**
   * Créer une session pour un événement
   */
  async createSession(session: Omit<EventSession, 'id'>): Promise<EventSession> {
    try {
      const sessionId = this.db.collection('event_sessions').doc().id;
      const eventSession: EventSession = {
        ...session,
        id: sessionId
      };

      await this.db.collection('event_sessions').doc(sessionId).set(eventSession);
      
      return eventSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Enregistrer la présence à une session
   */
  async recordSessionAttendance(
    sessionId: string,
    userId: string,
    method: SessionAttendance['method'],
    checkInTime?: Date
  ): Promise<SessionAttendance> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Vérifier si l'utilisateur a déjà une présence pour cette session
      const existingAttendance = await this.getSessionAttendance(sessionId, userId);
      if (existingAttendance && existingAttendance.checkInTime) {
        throw new Error('User already checked in to this session');
      }

      const now = checkInTime || new Date();
      const status = this.determineSessionStatus(now, session);

      const attendance: SessionAttendance = {
        id: existingAttendance?.id || this.db.collection('session_attendances').doc().id,
        sessionId,
        userId,
        eventId: session.eventId,
        checkInTime: now,
        status,
        duration: 0, // Sera calculé au check-out
        method,
        ...(status === 'late' && { notes: `Arrivé ${this.getMinutesLate(now, session.startTime)} minutes en retard` })
      };

      await this.db.collection('session_attendances').doc(attendance.id).set(attendance);

      // Mettre à jour le record de présence partielle
      await this.updatePartialAttendanceRecord(userId, session.eventId);

      return attendance;
    } catch (error) {
      console.error('Error recording session attendance:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Enregistrer la sortie d'une session
   */
  async recordSessionCheckOut(
    sessionId: string,
    userId: string,
    checkOutTime?: Date
  ): Promise<SessionAttendance> {
    try {
      const attendance = await this.getSessionAttendance(sessionId, userId);
      if (!attendance) {
        throw new Error('No check-in record found for this session');
      }

      if (attendance.checkOutTime) {
        throw new Error('User already checked out of this session');
      }

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const now = checkOutTime || new Date();
      const duration = attendance.checkInTime 
        ? Math.round((now.getTime() - attendance.checkInTime.getTime()) / (1000 * 60))
        : 0;

      // Déterminer le nouveau statut basé sur la durée
      const newStatus = this.determineCheckOutStatus(attendance, session, now, duration);

      const updatedAttendance: SessionAttendance = {
        ...attendance,
        checkOutTime: now,
        duration,
        status: newStatus
      };

      await this.db.collection('session_attendances').doc(attendance.id).update({
        checkOutTime: now,
        duration,
        status: newStatus
      });

      // Mettre à jour le record de présence partielle
      await this.updatePartialAttendanceRecord(userId, session.eventId);

      return updatedAttendance;
    } catch (error) {
      console.error('Error recording session check-out:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Calculer la présence partielle d'un utilisateur pour un événement
   */
  async calculatePartialAttendance(userId: string, eventId: string): Promise<PartialAttendanceRecord> {
    try {
      // Récupérer toutes les sessions de l'événement
      const sessions = await this.getEventSessions(eventId);
      
      // Récupérer les présences de l'utilisateur
      const attendances = await this.getUserSessionAttendances(userId, eventId);
      
      const totalSessions = sessions.length;
      const requiredSessions = sessions.filter(s => s.isRequired).length;
      
      const attendedSessions = attendances.filter(a => 
        ['present', 'late', 'partial'].includes(a.status)
      ).length;
      
      const attendedRequiredSessions = attendances.filter(a => {
        const session = sessions.find(s => s.id === a.sessionId);
        return session?.isRequired && ['present', 'late', 'partial'].includes(a.status);
      }).length;

      const attendancePercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
      const requiredAttendancePercentage = requiredSessions > 0 ? (attendedRequiredSessions / requiredSessions) * 100 : 100;

      // Calculer les durées
      const totalDuration = sessions.reduce((sum, session) => {
        return sum + Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
      }, 0);

      const effectiveDuration = attendances.reduce((sum, attendance) => {
        return sum + (attendance.duration || 0);
      }, 0);

      // Déterminer l'éligibilité au certificat
      const { isEligible, reason } = this.checkCertificateEligibility(
        attendancePercentage,
        requiredAttendancePercentage,
        effectiveDuration,
        totalDuration
      );

      const partialRecord: PartialAttendanceRecord = {
        userId,
        eventId,
        totalSessions,
        attendedSessions,
        requiredSessions,
        attendedRequiredSessions,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        requiredAttendancePercentage: Math.round(requiredAttendancePercentage * 100) / 100,
        totalDuration,
        effectiveDuration,
        sessions: attendances,
        isEligibleForCertificate: isEligible,
        certificateEligibilityReason: reason
      };

      // Sauvegarder le record
      await this.savePartialAttendanceRecord(partialRecord);

      return partialRecord;
    } catch (error) {
      console.error('Error calculating partial attendance:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les sessions d'un événement
   */
  async getEventSessions(eventId: string): Promise<EventSession[]> {
    try {
      const sessionsQuery = await this.db
        .collection('event_sessions')
        .where('eventId', '==', eventId)
        .orderBy('order', 'asc')
        .get();

      return sessionsQuery.docs.map(doc => doc.data() as EventSession);
    } catch (error) {
      console.error('Error getting event sessions:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir le résumé de présence pour toutes les sessions d'un événement
   */
  async getEventSessionsSummary(eventId: string): Promise<{
    sessions: Array<{
      session: EventSession;
      totalParticipants: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      attendanceRate: number;
    }>;
    overallStats: {
      totalSessions: number;
      averageAttendanceRate: number;
      mostAttendedSession: string;
      leastAttendedSession: string;
    };
  }> {
    try {
      const sessions = await this.getEventSessions(eventId);
      const event = await this.getEventById(eventId);
      const totalParticipants = event.getData().participants?.length || 0;

      const sessionSummaries = await Promise.all(
        sessions.map(async (session) => {
          const attendances = await this.getSessionAttendances(session.id);
          
          const presentCount = attendances.filter(a => 
            ['present', 'late', 'partial'].includes(a.status)
          ).length;
          
          const absentCount = totalParticipants - attendances.length;
          const lateCount = attendances.filter(a => a.status === 'late').length;
          const attendanceRate = totalParticipants > 0 ? (presentCount / totalParticipants) * 100 : 0;

          return {
            session,
            totalParticipants,
            presentCount,
            absentCount,
            lateCount,
            attendanceRate: Math.round(attendanceRate * 100) / 100
          };
        })
      );

      // Calculer les statistiques globales
      const averageAttendanceRate = sessionSummaries.length > 0 
        ? sessionSummaries.reduce((sum, s) => sum + s.attendanceRate, 0) / sessionSummaries.length
        : 0;

      const sortedByAttendance = [...sessionSummaries].sort((a, b) => b.attendanceRate - a.attendanceRate);
      const mostAttendedSession = sortedByAttendance[0]?.session.title || 'N/A';
      const leastAttendedSession = sortedByAttendance[sortedByAttendance.length - 1]?.session.title || 'N/A';

      return {
        sessions: sessionSummaries,
        overallStats: {
          totalSessions: sessions.length,
          averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
          mostAttendedSession,
          leastAttendedSession
        }
      };
    } catch (error) {
      console.error('Error getting event sessions summary:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private async getSession(sessionId: string): Promise<EventSession | null> {
    try {
      const sessionDoc = await this.db.collection('event_sessions').doc(sessionId).get();
      return sessionDoc.exists ? sessionDoc.data() as EventSession : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  private async getSessionAttendance(sessionId: string, userId: string): Promise<SessionAttendance | null> {
    try {
      const attendanceQuery = await this.db
        .collection('session_attendances')
        .where('sessionId', '==', sessionId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      return attendanceQuery.empty ? null : attendanceQuery.docs[0].data() as SessionAttendance;
    } catch (error) {
      console.error('Error getting session attendance:', error);
      return null;
    }
  }

  private async getSessionAttendances(sessionId: string): Promise<SessionAttendance[]> {
    try {
      const attendancesQuery = await this.db
        .collection('session_attendances')
        .where('sessionId', '==', sessionId)
        .get();

      return attendancesQuery.docs.map(doc => doc.data() as SessionAttendance);
    } catch (error) {
      console.error('Error getting session attendances:', error);
      return [];
    }
  }

  private async getUserSessionAttendances(userId: string, eventId: string): Promise<SessionAttendance[]> {
    try {
      const attendancesQuery = await this.db
        .collection('session_attendances')
        .where('userId', '==', userId)
        .where('eventId', '==', eventId)
        .get();

      return attendancesQuery.docs.map(doc => doc.data() as SessionAttendance);
    } catch (error) {
      console.error('Error getting user session attendances:', error);
      return [];
    }
  }

  private determineSessionStatus(checkInTime: Date, session: EventSession): SessionAttendance['status'] {
    const sessionStart = session.startTime;
    const gracePeriod = 10 * 60 * 1000; // 10 minutes en millisecondes

    if (checkInTime <= sessionStart) {
      return 'present';
    } else if (checkInTime <= new Date(sessionStart.getTime() + gracePeriod)) {
      return 'late';
    } else {
      return 'late'; // Très en retard mais présent
    }
  }

  private determineCheckOutStatus(
    attendance: SessionAttendance,
    session: EventSession,
    checkOutTime: Date,
    duration: number
  ): SessionAttendance['status'] {
    const sessionDuration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
    const minimumDuration = sessionDuration * 0.75; // 75% de la durée de la session

    if (duration < minimumDuration) {
      return 'partial';
    }

    if (checkOutTime < session.endTime) {
      const minutesEarly = Math.round((session.endTime.getTime() - checkOutTime.getTime()) / (1000 * 60));
      if (minutesEarly > 15) {
        return 'left_early';
      }
    }

    return attendance.status; // Garder le statut d'arrivée si pas de problème de départ
  }

  private getMinutesLate(checkInTime: Date, sessionStart: Date): number {
    return Math.round((checkInTime.getTime() - sessionStart.getTime()) / (1000 * 60));
  }

  private checkCertificateEligibility(
    attendancePercentage: number,
    requiredAttendancePercentage: number,
    effectiveDuration: number,
    totalDuration: number
  ): { isEligible: boolean; reason?: string } {
    // Critères d'éligibilité
    const minAttendanceRate = 75; // 75% des sessions
    const minRequiredAttendanceRate = 100; // 100% des sessions obligatoires
    const minDurationRate = 70; // 70% du temps total

    if (requiredAttendancePercentage < minRequiredAttendanceRate) {
      return {
        isEligible: false,
        reason: `Présence insuffisante aux sessions obligatoires (${requiredAttendancePercentage.toFixed(1)}% < ${minRequiredAttendanceRate}%)`
      };
    }

    if (attendancePercentage < minAttendanceRate) {
      return {
        isEligible: false,
        reason: `Taux de présence global insuffisant (${attendancePercentage.toFixed(1)}% < ${minAttendanceRate}%)`
      };
    }

    const durationPercentage = totalDuration > 0 ? (effectiveDuration / totalDuration) * 100 : 0;
    if (durationPercentage < minDurationRate) {
      return {
        isEligible: false,
        reason: `Durée de présence insuffisante (${durationPercentage.toFixed(1)}% < ${minDurationRate}%)`
      };
    }

    return { isEligible: true };
  }

  private async updatePartialAttendanceRecord(userId: string, eventId: string): Promise<void> {
    // Recalculer et sauvegarder le record de présence partielle
    await this.calculatePartialAttendance(userId, eventId);
  }

  private async savePartialAttendanceRecord(record: PartialAttendanceRecord): Promise<void> {
    const recordId = `${record.eventId}_${record.userId}`;
    await this.db.collection('partial_attendance_records').doc(recordId).set(record);
  }

  private async getEventById(eventId: string): Promise<EventModel> {
    const eventDoc = await this.db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    return EventModel.fromFirestore(eventDoc);
  }
}

export const sessionTrackingService = new SessionTrackingService();