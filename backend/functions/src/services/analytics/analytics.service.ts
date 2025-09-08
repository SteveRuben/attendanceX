// backend/functions/src/services/analytics.service.ts - Service d'analytiques avancées

import { ERROR_CODES } from "../../shared";
import { collections } from "../../config";

export interface AttendancePattern {
  userId: string;
  userName: string;
  totalEvents: number;
  attendedEvents: number;
  attendanceRate: number;
  averageArrivalDelay: number; // en minutes
  punctualityScore: number; // 0-100
  preferredTimeSlots: string[];
  seasonalTrends: Record<string, number>;
  eventTypePreferences: Record<string, number>;
}

export interface EventAnalytics {
  eventId: string;
  eventTitle: string;
  totalParticipants: number;
  actualAttendees: number;
  attendanceRate: number;
  noShowRate: number;
  averageCheckInTime: Date;
  peakCheckInPeriod: { start: Date; end: Date };
  demographicBreakdown: {
    byDepartment: Record<string, number>;
    byRole: Record<string, number>;
    byLocation: Record<string, number>;
  };
  satisfactionMetrics?: {
    averageRating: number;
    responseRate: number;
    npsScore: number;
  };
}

export interface PredictiveInsights {
  eventId: string;
  predictedAttendance: number;
  confidenceLevel: number;
  factors: Array<{
    factor: string;
    impact: number; // -1 à 1
    description: string;
  }>;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OrganizationMetrics {
  organizationId: string;
  period: { start: Date; end: Date };
  totalEvents: number;
  totalParticipants: number;
  overallAttendanceRate: number;
  engagementTrends: Array<{
    month: string;
    attendanceRate: number;
    eventCount: number;
  }>;
  topPerformers: AttendancePattern[];
  improvementOpportunities: Array<{
    area: string;
    currentValue: number;
    targetValue: number;
    actionItems: string[];
  }>;
}

export class AnalyticsService {


  /**
   * Analyser les patterns de présence d'un utilisateur
   */
  async analyzeUserAttendancePattern(
    userId: string,
    organizationId: string,
    periodMonths: number = 12
  ): Promise<AttendancePattern> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - periodMonths);

      // Récupérer les présences de l'utilisateur
      const attendanceQuery = await 
        collections.attendances
        .where('userId', '==', userId)
        .where('organizationId', '==', organizationId)
        .where('checkInTime', '>=', startDate)
        .get();

      const attendances = attendanceQuery.docs.map(doc => doc.data());

      // Récupérer les événements auxquels l'utilisateur était invité
      const eventsQuery = await 
        collections.events
        .where('organizationId', '==', organizationId)
        .where('participants', 'array-contains', userId)
        .where('startDateTime', '>=', startDate)
        .get();

      const totalEvents = eventsQuery.size;
      const attendedEvents = attendances.filter(a => a.status === 'present').length;
      const attendanceRate = totalEvents > 0 ? (attendedEvents / totalEvents) * 100 : 0;

      // Calculer le retard moyen
      const delays = attendances
        .filter(a => a.status === 'late' && a.checkInTime && a.eventStartTime)
        .map(a => {
          const checkIn = a.checkInTime.toDate();
          const eventStart = a.eventStartTime.toDate();
          return Math.max(0, (checkIn.getTime() - eventStart.getTime()) / (1000 * 60));
        });

      const averageArrivalDelay = delays.length > 0 
        ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length 
        : 0;

      // Calculer le score de ponctualité
      const punctualAttendances = attendances.filter(a => a.status === 'present').length;
      const punctualityScore = attendedEvents > 0 
        ? (punctualAttendances / attendedEvents) * 100 
        : 0;

      // Analyser les créneaux préférés
      const timeSlots = attendances.map(a => {
        if (!a.checkInTime) {return null;}
        const hour = a.checkInTime.toDate().getHours();
        if (hour < 9) {return 'early_morning';}
        if (hour < 12) {return 'morning';}
        if (hour < 14) {return 'lunch';}
        if (hour < 17) {return 'afternoon';}
        return 'evening';
      }).filter(Boolean);

      const timeSlotCounts = timeSlots.reduce((acc: Record<string, number>, slot) => {
        if (slot) {acc[slot] = (acc[slot] || 0) + 1;}
        return acc;
      }, {});

      const preferredTimeSlots = Object.entries(timeSlotCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([slot]) => slot);

      // Analyser les tendances saisonnières
      const seasonalTrends = this.calculateSeasonalTrends(attendances);

      // Analyser les préférences par type d'événement
      const eventTypePreferences = await this.calculateEventTypePreferences(
        userId, 
        organizationId, 
        attendances
      );

      // Récupérer le nom de l'utilisateur
      const userDoc = await collections.users.doc(userId).get();
      const userName = userDoc.exists ? userDoc.data()?.name || 'Unknown' : 'Unknown';

      return {
        userId,
        userName,
        totalEvents,
        attendedEvents,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        averageArrivalDelay: Math.round(averageArrivalDelay * 100) / 100,
        punctualityScore: Math.round(punctualityScore * 100) / 100,
        preferredTimeSlots,
        seasonalTrends,
        eventTypePreferences
      };
    } catch (error) {
      console.error('Error analyzing user attendance pattern:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Analyser les métriques d'un événement
   */
  async analyzeEventMetrics(eventId: string): Promise<EventAnalytics> {
    try {
      // Récupérer l'événement
      const eventDoc = await collections.events.doc(eventId).get();
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const event = eventDoc.data()!;
      const totalParticipants = event.participants?.length || 0;

      // Récupérer les présences
      const attendanceQuery = await collections.attendances
        .where('eventId', '==', eventId)
        .get();

      const attendances = attendanceQuery.docs.map(doc => doc.data());
      const actualAttendees = attendances.filter(a => a.status === 'present').length;
      const attendanceRate = totalParticipants > 0 ? (actualAttendees / totalParticipants) * 100 : 0;
      const noShowRate = 100 - attendanceRate;

      // Calculer l'heure moyenne de check-in
      const checkInTimes = attendances
        .filter(a => a.checkInTime)
        .map(a => a.checkInTime.toDate());

      const averageCheckInTime = checkInTimes.length > 0
        ? new Date(checkInTimes.reduce((sum, time) => sum + time.getTime(), 0) / checkInTimes.length)
        : new Date();

      // Identifier la période de pointe des check-ins
      const peakCheckInPeriod = this.calculatePeakCheckInPeriod(checkInTimes);

      // Analyser la répartition démographique
      const demographicBreakdown = await this.calculateDemographicBreakdown(attendances);

      return {
        eventId,
        eventTitle: event.title,
        totalParticipants,
        actualAttendees,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        noShowRate: Math.round(noShowRate * 100) / 100,
        averageCheckInTime,
        peakCheckInPeriod,
        demographicBreakdown
      };
    } catch (error) {
      console.error('Error analyzing event metrics:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Générer des insights prédictifs pour un événement
   */
  async generatePredictiveInsights(eventId: string): Promise<PredictiveInsights> {
    try {
      const eventDoc = await collections.events.doc(eventId).get();
      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const event = eventDoc.data()!;
      const expectedParticipants = event.participants?.length || 0;

      // Analyser les événements similaires passés
      const historicalEvents = await this.findSimilarEvents(event);
      
      // Calculer la prédiction basée sur l'historique
      const historicalAttendanceRates = historicalEvents.map(e => e.attendanceRate);
      const averageHistoricalRate = historicalAttendanceRates.length > 0
        ? historicalAttendanceRates.reduce((sum, rate) => sum + rate, 0) / historicalAttendanceRates.length
        : 75; // Valeur par défaut

      // Facteurs d'ajustement
      const factors = await this.calculatePredictionFactors(event);
      
      // Appliquer les facteurs
      let adjustedRate = averageHistoricalRate;
      factors.forEach(factor => {
        adjustedRate += factor.impact * 10; // Impact de ±10% par facteur
      });

      // Limiter entre 0 et 100%
      adjustedRate = Math.max(0, Math.min(100, adjustedRate));

      const predictedAttendance = Math.round((adjustedRate / 100) * expectedParticipants);
      
      // Calculer le niveau de confiance
      const confidenceLevel = this.calculateConfidenceLevel(historicalEvents.length, factors);

      // Déterminer le niveau de risque
      const riskLevel = this.calculateRiskLevel(adjustedRate, factors);

      // Générer des recommandations
      const recommendations = this.generateRecommendations(adjustedRate, factors, event);

      return {
        eventId,
        predictedAttendance,
        confidenceLevel,
        factors,
        recommendations,
        riskLevel
      };
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Générer les métriques organisationnelles
   */
  async generateOrganizationMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OrganizationMetrics> {
    try {
      // Récupérer tous les événements de la période
      const eventsQuery = await collections.events
        .where('organizationId', '==', organizationId)
        .where('startDateTime', '>=', startDate)
        .where('startDateTime', '<=', endDate)
        .get();

      const events = eventsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalEvents = events.length;

      // Calculer les participants uniques
      const allParticipants = new Set();
      events.forEach(event => {
        // Vérifier si l'événement a des participants
        if ('participants' in event && Array.isArray(event.participants)) {
          event.participants.forEach((p: string) => allParticipants.add(p));
        }
      });
      const totalParticipants = allParticipants.size;

      // Calculer le taux de présence global
      let totalExpected = 0;
      let totalPresent = 0;

      for (const event of events) {
        const attendanceQuery = await collections.attendances
          .where('eventId', '==', event.id)
          .get();

        const attendances = attendanceQuery.docs.map(doc => doc.data());
        totalExpected += ('participants' in event && Array.isArray(event.participants)) ? event.participants.length : 0;
        totalPresent += attendances.filter(a => a.status === 'present').length;
      }

      const overallAttendanceRate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;

      // Calculer les tendances d'engagement par mois
      const engagementTrends = await this.calculateEngagementTrends(
        organizationId, 
        startDate, 
        endDate
      );

      // Identifier les top performers
      const topPerformers = await this.identifyTopPerformers(organizationId, startDate, endDate);

      // Identifier les opportunités d'amélioration
      const improvementOpportunities = await this.identifyImprovementOpportunities(
        organizationId,
        overallAttendanceRate,
        events
      );

      return {
        organizationId,
        period: { start: startDate, end: endDate },
        totalEvents,
        totalParticipants,
        overallAttendanceRate: Math.round(overallAttendanceRate * 100) / 100,
        engagementTrends,
        topPerformers,
        improvementOpportunities
      };
    } catch (error) {
      console.error('Error generating organization metrics:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées d'aide

  private calculateSeasonalTrends(attendances: any[]): Record<string, number> {
    const seasons = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    
    attendances.forEach(attendance => {
      if (!attendance.checkInTime) {return;}
      
      const month = attendance.checkInTime.toDate().getMonth();
      if (month >= 2 && month <= 4) {seasons.spring++;}
      else if (month >= 5 && month <= 7) {seasons.summer++;}
      else if (month >= 8 && month <= 10) {seasons.autumn++;}
      else {seasons.winter++;}
    });

    const total = Object.values(seasons).reduce((sum, count) => sum + count, 0);
    if (total === 0) {return seasons;}

    return {
      spring: Math.round((seasons.spring / total) * 100),
      summer: Math.round((seasons.summer / total) * 100),
      autumn: Math.round((seasons.autumn / total) * 100),
      winter: Math.round((seasons.winter / total) * 100)
    };
  }

  private async calculateEventTypePreferences(
    userId: string,
    organizationId: string,
    attendances: any[]
  ): Promise<Record<string, number>> {
    const typePreferences: Record<string, number> = {};
    
    for (const attendance of attendances) {
      if (attendance.status !== 'present') {continue;}
      
      try {
        const eventDoc = await collections.events.doc(attendance.eventId).get();
        if (eventDoc.exists) {
          const eventType = eventDoc.data()?.type || 'unknown';
          typePreferences[eventType] = (typePreferences[eventType] || 0) + 1;
        }
      } catch (error) {
        console.error('Error fetching event type:', error);
      }
    }

    return typePreferences;
  }

  private calculatePeakCheckInPeriod(checkInTimes: Date[]): { start: Date; end: Date } {
    if (checkInTimes.length === 0) {
      const now = new Date();
      return { start: now, end: now };
    }

    // Grouper par tranches de 15 minutes
    const timeSlots: Record<string, number> = {};
    
    checkInTimes.forEach(time => {
      const minutes = time.getMinutes();
      const roundedMinutes = Math.floor(minutes / 15) * 15;
      const slotTime = new Date(time);
      slotTime.setMinutes(roundedMinutes, 0, 0);
      
      const slotKey = slotTime.toISOString();
      timeSlots[slotKey] = (timeSlots[slotKey] || 0) + 1;
    });

    // Trouver la tranche avec le plus de check-ins
    const peakSlot = Object.entries(timeSlots)
      .sort(([,a], [,b]) => b - a)[0];

    if (peakSlot) {
      const start = new Date(peakSlot[0]);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 15);
      return { start, end };
    }

    const now = new Date();
    return { start: now, end: now };
  }

  private async calculateDemographicBreakdown(attendances: any[]): Promise<{
    byDepartment: Record<string, number>;
    byRole: Record<string, number>;
    byLocation: Record<string, number>;
  }> {
    const breakdown = {
      byDepartment: {} as Record<string, number>,
      byRole: {} as Record<string, number>,
      byLocation: {} as Record<string, number>
    };

    for (const attendance of attendances) {
      if (attendance.status !== 'present') {continue;}

      try {
        const userDoc = await collections.users.doc(attendance.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          
          const department = userData.department || 'Unknown';
          const role = userData.role || 'Unknown';
          const location = userData.location || 'Unknown';

          breakdown.byDepartment[department] = (breakdown.byDepartment[department] || 0) + 1;
          breakdown.byRole[role] = (breakdown.byRole[role] || 0) + 1;
          breakdown.byLocation[location] = (breakdown.byLocation[location] || 0) + 1;
        }
      } catch (error) {
        console.error('Error fetching user data for demographics:', error);
      }
    }

    return breakdown;
  }

  private async findSimilarEvents(event: any): Promise<Array<{ attendanceRate: number }>> {
    // Logique simplifiée pour trouver des événements similaires
    // Dans un vrai système, ceci utiliserait des algorithmes de ML plus sophistiqués
    
    try {
      const similarEventsQuery = await collections.events
        .where('organizationId', '==', event.organizationId)
        .where('type', '==', event.type)
        .where('startDateTime', '<', event.startDateTime)
        .limit(10)
        .get();

      const similarEvents = [];
      
      for (const eventDoc of similarEventsQuery.docs) {
        const eventData = eventDoc.data();
        const attendanceQuery = await collections.attendances
          .where('eventId', '==', eventDoc.id)
          .get();

        const attendances = attendanceQuery.docs.map(doc => doc.data());
        const presentCount = attendances.filter(a => a.status === 'present').length;
        const expectedCount = eventData.participants?.length || 0;
        const attendanceRate = expectedCount > 0 ? (presentCount / expectedCount) * 100 : 0;

        similarEvents.push({ attendanceRate });
      }

      return similarEvents;
    } catch (error) {
      console.error('Error finding similar events:', error);
      return [];
    }
  }

  private async calculatePredictionFactors(event: any): Promise<Array<{
    factor: string;
    impact: number;
    description: string;
  }>> {
    const factors = [];

    // Facteur jour de la semaine
    const dayOfWeek = event.startDateTime.toDate().getDay();
    if (dayOfWeek === 1) { // Lundi
      factors.push({
        factor: 'monday_effect',
        impact: -0.1,
        description: 'Les événements du lundi ont généralement une présence plus faible'
      });
    } else if (dayOfWeek === 5) { // Vendredi
      factors.push({
        factor: 'friday_effect',
        impact: -0.05,
        description: 'Les événements du vendredi peuvent avoir une présence légèrement réduite'
      });
    }

    // Facteur heure de la journée
    const hour = event.startDateTime.toDate().getHours();
    if (hour < 9 || hour > 17) {
      factors.push({
        factor: 'off_hours',
        impact: -0.15,
        description: 'Les événements en dehors des heures de bureau ont une présence réduite'
      });
    }

    // Facteur durée
    const duration = event.duration || 60; // minutes
    if (duration > 180) { // Plus de 3 heures
      factors.push({
        factor: 'long_duration',
        impact: -0.1,
        description: 'Les événements longs peuvent décourager la participation'
      });
    }

    // Facteur obligatoire
    if (event.isMandatory) {
      factors.push({
        factor: 'mandatory',
        impact: 0.2,
        description: 'Les événements obligatoires ont un taux de présence plus élevé'
      });
    }

    return factors;
  }

  private calculateConfidenceLevel(historicalEventsCount: number, factors: any[]): number {
    let confidence = 50; // Base de 50%

    // Plus d'événements historiques = plus de confiance
    confidence += Math.min(historicalEventsCount * 5, 30);

    // Plus de facteurs identifiés = plus de confiance
    confidence += Math.min(factors.length * 3, 15);

    return Math.min(95, Math.max(20, confidence));
  }

  private calculateRiskLevel(
    predictedRate: number, 
    factors: any[]
  ): 'low' | 'medium' | 'high' {
    const negativeFactors = factors.filter(f => f.impact < 0).length;
    
    if (predictedRate < 60 || negativeFactors >= 3) {return 'high';}
    if (predictedRate < 75 || negativeFactors >= 2) {return 'medium';}
    return 'low';
  }

  private generateRecommendations(
    predictedRate: number,
    factors: any[],
    event: any
  ): string[] {
    const recommendations = [];

    if (predictedRate < 70) {
      recommendations.push('Envoyer des rappels supplémentaires aux participants');
      recommendations.push('Considérer offrir des incitations à la participation');
    }

    const hasOffHoursFactor = factors.some(f => f.factor === 'off_hours');
    if (hasOffHoursFactor) {
      recommendations.push('Envisager de reprogrammer à une heure plus favorable');
    }

    const hasLongDurationFactor = factors.some(f => f.factor === 'long_duration');
    if (hasLongDurationFactor) {
      recommendations.push('Diviser l\'événement en sessions plus courtes');
      recommendations.push('Prévoir des pauses régulières');
    }

    if (predictedRate > 90) {
      recommendations.push('Vérifier la capacité de la salle');
      recommendations.push('Prévoir une liste d\'attente');
    }

    return recommendations;
  }

  private async calculateEngagementTrends(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ month: string; attendanceRate: number; eventCount: number }>> {
    const trends = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

      const eventsQuery = await collections.events
        .where('organizationId', '==', organizationId)
        .where('startDateTime', '>=', monthStart)
        .where('startDateTime', '<=', monthEnd)
        .get();

      const events = eventsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let totalExpected = 0;
      let totalPresent = 0;

      for (const event of events) {
        const attendanceQuery = await collections.attendances
          .where('eventId', '==', event.id)
          .get();

        const attendances = attendanceQuery.docs.map(doc => doc.data());
        totalExpected += ('participants' in event && Array.isArray(event.participants)) ? event.participants.length : 0;
        totalPresent += attendances.filter(a => a.status === 'present').length;
      }

      const attendanceRate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;

      trends.push({
        month: current.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }),
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        eventCount: events.length
      });

      current.setMonth(current.getMonth() + 1);
    }

    return trends;
  }

  private async identifyTopPerformers(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendancePattern[]> {
    // Récupérer tous les utilisateurs de l'organisation
    const usersQuery = await collections.users
      .where('organizationId', '==', organizationId)
      .limit(50) // Limiter pour les performances
      .get();

    const patterns = [];

    for (const userDoc of usersQuery.docs) {
      try {
        const pattern = await this.analyzeUserAttendancePattern(
          userDoc.id,
          organizationId,
          12 // 12 mois
        );

        if (pattern.attendanceRate >= 80 && pattern.totalEvents >= 5) {
          patterns.push(pattern);
        }
      } catch (error) {
        console.error(`Error analyzing pattern for user ${userDoc.id}:`, error);
      }
    }

    return patterns
      .sort((a, b) => b.attendanceRate - a.attendanceRate)
      .slice(0, 10);
  }

  private async identifyImprovementOpportunities(
    organizationId: string,
    currentAttendanceRate: number,
    events: any[]
  ): Promise<Array<{
    area: string;
    currentValue: number;
    targetValue: number;
    actionItems: string[];
  }>> {
    const opportunities = [];

    // Opportunité d'amélioration du taux de présence
    if (currentAttendanceRate < 80) {
      opportunities.push({
        area: 'Taux de présence global',
        currentValue: currentAttendanceRate,
        targetValue: 85,
        actionItems: [
          'Améliorer la communication pré-événement',
          'Optimiser les créneaux horaires',
          'Recueillir plus de feedback des participants'
        ]
      });
    }

    // Opportunité d'amélioration de la ponctualité
    const lateArrivals = events.filter(e => e.averageArrivalDelay > 10).length;
    const lateArrivalRate = events.length > 0 ? (lateArrivals / events.length) * 100 : 0;
    
    if (lateArrivalRate > 20) {
      opportunities.push({
        area: 'Ponctualité',
        currentValue: lateArrivalRate,
        targetValue: 10,
        actionItems: [
          'Envoyer des rappels 15 minutes avant le début',
          'Améliorer la signalisation des lieux',
          'Commencer par un accueil informel'
        ]
      });
    }

    return opportunities;
  }
}

export const analyticsService = new AnalyticsService();