// backend/functions/src/services/realtime-attendance.service.ts - Service de statistiques temps réel

import { getFirestore } from "firebase-admin/firestore";
import { AttendanceRecord, AttendanceStatus, ERROR_CODES } from "../../shared";
import { EventModel } from "../../models/event.model";


export interface RealTimeAttendanceStats {
  eventId: string;
  totalInvited: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
  attendanceRate: number;
  punctualityRate: number;
  lastUpdated: Date;
  timeline: AttendanceTimelineEntry[];
  alerts: AttendanceAlert[];
}

export interface AttendanceTimelineEntry {
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'check_in' | 'check_out' | 'status_change';
  status: AttendanceStatus;
  method: string;
}

export interface AttendanceAlert {
  id: string;
  type: 'low_attendance' | 'capacity_reached' | 'late_start' | 'high_absence';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class RealTimeAttendanceService {
  private readonly db = getFirestore();
  private eventListeners: Map<string, () => void> = new Map();

  /**
   * Obtenir les statistiques temps réel d'un événement
   */
  async getRealTimeStats(eventId: string): Promise<RealTimeAttendanceStats> {
    try {
      // Récupérer l'événement
      const event = await this.getEventById(eventId);
      const eventData = event.getData();

      // Récupérer toutes les présences
      const attendancesQuery = await this.db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .orderBy('checkInTime', 'desc')
        .get();

      const attendances = attendancesQuery.docs.map(doc => doc.data() as AttendanceRecord);

      // Calculer les statistiques
      const stats = this.calculateStats(eventData, attendances);

      // Générer la timeline
      const timeline = this.generateTimeline(attendances);

      // Générer les alertes
      const alerts = this.generateAlerts(eventData, stats);

      return {
        eventId,
        ...stats,
        timeline: timeline.slice(0, 20), // Dernières 20 entrées
        alerts,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting real-time stats:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Écouter les changements en temps réel
   */
  subscribeToAttendanceUpdates(
    eventId: string, 
    callback: (stats: RealTimeAttendanceStats) => void
  ): () => void {
    const unsubscribe = this.db
      .collection('attendances')
      .where('eventId', '==', eventId)
      .onSnapshot(async () => {
        try {
          const stats = await this.getRealTimeStats(eventId);
          callback(stats);
        } catch (error) {
          console.error('Error in attendance subscription:', error);
        }
      });

    this.eventListeners.set(eventId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Arrêter l'écoute des changements
   */
  unsubscribeFromAttendanceUpdates(eventId: string): void {
    const unsubscribe = this.eventListeners.get(eventId);
    if (unsubscribe) {
      unsubscribe();
      this.eventListeners.delete(eventId);
    }
  }

  /**
   * Calculer les métriques en temps réel
   */
  async calculateRealtimeMetrics(eventId: string): Promise<{
    checkInsPerMinute: number;
    averageCheckInTime: number;
    peakCheckInTime: string;
    currentTrend: 'increasing' | 'decreasing' | 'stable';
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentAttendances = await this.db
        .collection('attendances')
        .where('eventId', '==', eventId)
        .where('checkInTime', '>=', oneHourAgo)
        .orderBy('checkInTime', 'asc')
        .get();

      const attendances = recentAttendances.docs.map(doc => doc.data() as AttendanceRecord);

      if (attendances.length === 0) {
        return {
          checkInsPerMinute: 0,
          averageCheckInTime: 0,
          peakCheckInTime: 'N/A',
          currentTrend: 'stable'
        };
      }

      // Check-ins par minute
      const checkInsPerMinute = attendances.length / 60;

      // Temps moyen de check-in (en secondes depuis le début de l'événement)
      const event = await this.getEventById(eventId);
      const eventStart = event.getData().startDateTime;
      
      const checkInTimes = attendances
        .filter(a => a.checkInTime)
        .map(a => (a.checkInTime!.getTime() - eventStart.getTime()) / 1000);
      
      const averageCheckInTime = checkInTimes.length > 0 
        ? checkInTimes.reduce((sum, time) => sum + time, 0) / checkInTimes.length
        : 0;

      // Heure de pic
      const checkInsByMinute = this.groupByMinute(attendances);
      const peakMinute = Object.entries(checkInsByMinute)
        .reduce((max, [minute, count]) => count > max.count ? { minute, count } : max, 
                { minute: '', count: 0 });

      // Tendance actuelle (basée sur les 10 dernières minutes)
      const currentTrend = this.calculateTrend(attendances);

      return {
        checkInsPerMinute: Math.round(checkInsPerMinute * 100) / 100,
        averageCheckInTime: Math.round(averageCheckInTime),
        peakCheckInTime: peakMinute.minute || 'N/A',
        currentTrend
      };
    } catch (error) {
      console.error('Error calculating realtime metrics:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }  
// Méthodes privées

  private calculateStats(eventData: any, attendances: AttendanceRecord[]) {
    const totalInvited = eventData.participants?.length || 0;
    const totalPresent = attendances.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const totalLate = attendances.filter(a => a.status === AttendanceStatus.LATE).length;
    const totalAbsent = attendances.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const totalExcused = attendances.filter(a => a.status === AttendanceStatus.EXCUSED).length;

    const attendanceRate = totalInvited > 0 ? ((totalPresent + totalLate) / totalInvited) * 100 : 0;
    const punctualityRate = (totalPresent + totalLate) > 0 ? (totalPresent / (totalPresent + totalLate)) * 100 : 0;

    return {
      totalInvited,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      punctualityRate: Math.round(punctualityRate * 100) / 100
    };
  }

  private generateTimeline(attendances: AttendanceRecord[]): AttendanceTimelineEntry[] {
    return attendances
      .filter(a => a.checkInTime)
      .sort((a, b) => b.checkInTime!.getTime() - a.checkInTime!.getTime())
      .map(attendance => ({
        timestamp: attendance.checkInTime!,
        userId: attendance.userId,
        userName: attendance.userId, // À remplacer par le vrai nom
        action: 'check_in' as const,
        status: attendance.status,
        method: attendance.method
      }));
  }

  private generateAlerts(eventData: any, stats: any): AttendanceAlert[] {
    const alerts: AttendanceAlert[] = [];
    const now = new Date();

    // Alerte de faible participation
    if (stats.attendanceRate < 50 && now > eventData.startDateTime) {
      alerts.push({
        id: `low_attendance_${Date.now()}`,
        type: 'low_attendance',
        severity: 'warning',
        message: `Taux de présence faible: ${stats.attendanceRate}%`,
        timestamp: now,
        acknowledged: false
      });
    }

    // Alerte de retard important
    if (stats.punctualityRate < 70 && stats.totalPresent + stats.totalLate > 0) {
      alerts.push({
        id: `punctuality_${Date.now()}`,
        type: 'late_start',
        severity: 'info',
        message: `Beaucoup de retards: ${100 - stats.punctualityRate}% des présents sont en retard`,
        timestamp: now,
        acknowledged: false
      });
    }

    return alerts;
  }

  private groupByMinute(attendances: AttendanceRecord[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    attendances.forEach(attendance => {
      if (attendance.checkInTime) {
        const minute = attendance.checkInTime.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
        groups[minute] = (groups[minute] || 0) + 1;
      }
    });

    return groups;
  }

  private calculateTrend(attendances: AttendanceRecord[]): 'increasing' | 'decreasing' | 'stable' {
    if (attendances.length < 2) {return 'stable';}

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000);

    const recentCount = attendances.filter(a => 
      a.checkInTime && a.checkInTime >= tenMinutesAgo
    ).length;

    const previousCount = attendances.filter(a => 
      a.checkInTime && a.checkInTime >= twentyMinutesAgo && a.checkInTime < tenMinutesAgo
    ).length;

    if (recentCount > previousCount * 1.2) {return 'increasing';}
    if (recentCount < previousCount * 0.8) {return 'decreasing';}
    return 'stable';
  }

  private async getEventById(eventId: string): Promise<EventModel> {
    const eventDoc = await this.db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error(ERROR_CODES.EVENT_NOT_FOUND);
    }
    return EventModel.fromFirestore(eventDoc);
  }

  /**
   * Nettoyer les listeners lors de l'arrêt du service
   */
  cleanup(): void {
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners.clear();
  }
}

export const realTimeAttendanceService = new RealTimeAttendanceService();