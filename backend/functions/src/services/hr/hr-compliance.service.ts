// backend/functions/src/services/hr-compliance.service.ts - Service de conformité RH

import { ERROR_CODES } from "../../common/constants";
import { getFirestore } from "firebase-admin/firestore";


export interface ComplianceRule {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  eventTypes: string[];
  isActive: boolean;
  requiredAttendanceRate: number; // Pourcentage minimum requis
  gracePeriodDays: number; // Période de grâce pour justifier une absence
  escalationLevels: EscalationLevel[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationLevel {
  level: number;
  triggerAfterDays: number;
  notifyRoles: string[]; // 'manager', 'hr', 'admin'
  actions: string[]; // 'email', 'warning', 'disciplinary'
  message: string;
}

export interface ComplianceViolation {
  id: string;
  userId: string;
  eventId: string;
  ruleId: string;
  violationType: 'absence' | 'late' | 'early_departure' | 'insufficient_attendance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  status: 'open' | 'acknowledged' | 'justified' | 'resolved' | 'escalated';
  justification?: string;
  justifiedBy?: string;
  justifiedAt?: Date;
  escalationLevel: number;
  nextEscalationAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes: string[];
}

export interface ComplianceReport {
  userId: string;
  organizationId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  mandatoryEvents: {
    total: number;
    attended: number;
    missed: number;
    attendanceRate: number;
  };
  violations: ComplianceViolation[];
  complianceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  generatedAt: Date;
}

export class HRComplianceService {
  private readonly db = getFirestore();

  /**
   * Créer une règle de conformité
   */
  async createComplianceRule(rule: Omit<ComplianceRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceRule> {
    try {
      const ruleId = this.db.collection('compliance_rules').doc().id;
      const complianceRule: ComplianceRule = {
        ...rule,
        id: ruleId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.db.collection('compliance_rules').doc(ruleId).set(complianceRule);
      
      return complianceRule;
    } catch (error) {
      console.error('Error creating compliance rule:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Vérifier la conformité après un événement
   */
  async checkEventCompliance(eventId: string): Promise<ComplianceViolation[]> {
    try {
      const event = await this.getEventById(eventId);
      if (!event.isMandatory) {
        return []; // Pas de vérification pour les événements non obligatoires
      }

      const rules = await this.getActiveComplianceRules(event.organizationId, event.type);
      const violations: ComplianceViolation[] = [];

      // Obtenir tous les participants attendus
      const expectedParticipants = await this.getExpectedParticipants(eventId);
      
      // Obtenir les présences réelles
      const attendances = await this.getEventAttendances(eventId);
      const attendanceMap = new Map(attendances.map(a => [a.userId, a]));

      for (const participantId of expectedParticipants) {
        const attendance = attendanceMap.get(participantId);
        
        for (const rule of rules) {
          const violation = await this.evaluateParticipantCompliance(
            participantId,
            eventId,
            rule,
            attendance
          );
          
          if (violation) {
            violations.push(violation);
          }
        }
      }

      // Sauvegarder les violations
      for (const violation of violations) {
        await this.saveViolation(violation);
      }

      return violations;
    } catch (error) {
      console.error('Error checking event compliance:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Générer un rapport de conformité pour un utilisateur
   */
  async generateComplianceReport(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    try {
      // Obtenir tous les événements obligatoires de la période
      const mandatoryEvents = await this.getMandatoryEventsInPeriod(
        organizationId,
        startDate,
        endDate
      );

      // Obtenir les présences de l'utilisateur
      const userAttendances = await this.getUserAttendancesInPeriod(
        userId,
        startDate,
        endDate
      );

      const attendanceMap = new Map(userAttendances.map(a => [a.eventId, a]));

      let attendedCount = 0;
      for (const event of mandatoryEvents) {
        if (attendanceMap.has(event.id)) {
          const attendance = attendanceMap.get(event.id)!;
          if (['present', 'late'].includes(attendance.status)) {
            attendedCount++;
          }
        }
      }

      const attendanceRate = mandatoryEvents.length > 0 
        ? (attendedCount / mandatoryEvents.length) * 100 
        : 100;

      // Obtenir les violations de la période
      const violations = await this.getUserViolationsInPeriod(
        userId,
        startDate,
        endDate
      );

      // Calculer le score de conformité
      const complianceScore = this.calculateComplianceScore(
        attendanceRate,
        violations
      );

      // Déterminer le niveau de risque
      const riskLevel = this.determineRiskLevel(complianceScore, violations);

      // Générer des recommandations
      const recommendations = this.generateRecommendations(
        attendanceRate,
        violations,
        riskLevel
      );

      const report: ComplianceReport = {
        userId,
        organizationId,
        period: { startDate, endDate },
        mandatoryEvents: {
          total: mandatoryEvents.length,
          attended: attendedCount,
          missed: mandatoryEvents.length - attendedCount,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        },
        violations,
        complianceScore,
        riskLevel,
        recommendations,
        generatedAt: new Date()
      };

      // Sauvegarder le rapport
      await this.saveComplianceReport(report);

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Justifier une violation
   */
  async justifyViolation(
    violationId: string,
    justification: string,
    justifiedBy: string
  ): Promise<ComplianceViolation> {
    try {
      const violation = await this.getViolationById(violationId);
      if (!violation) {
        throw new Error('Violation not found');
      }

      const updatedViolation: ComplianceViolation = {
        ...violation,
        status: 'justified',
        justification,
        justifiedBy,
        justifiedAt: new Date(),
        notes: [
          ...violation.notes,
          `Justifié par ${justifiedBy}: ${justification}`
        ]
      };

      await this.db.collection('compliance_violations').doc(violationId).update({
        status: updatedViolation.status,
        justifiedBy: updatedViolation.justifiedBy,
        justifiedAt: updatedViolation.justifiedAt,
        notes: updatedViolation.notes
      });

      return updatedViolation;
    } catch (error) {
      console.error('Error justifying violation:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Traiter les escalades automatiques
   */
  async processEscalations(): Promise<{
    processed: number;
    escalated: number;
    errors: string[];
  }> {
    try {
      const now = new Date();
      const violations = await this.getViolationsForEscalation(now);
      
      let processed = 0;
      let escalated = 0;
      const errors: string[] = [];

      for (const violation of violations) {
        try {
          const rule = await this.getComplianceRuleById(violation.ruleId);
          if (!rule) {continue;}

          const nextLevel = violation.escalationLevel + 1;
          const escalationConfig = rule.escalationLevels.find(e => e.level === nextLevel);
          
          if (escalationConfig) {
            // Escalader la violation
            await this.escalateViolation(violation, escalationConfig);
            escalated++;
          }
          
          processed++;
        } catch (error: any) {
          errors.push(`Violation ${violation.id}: ${error.message}`);
        }
      }

      return { processed, escalated, errors };
    } catch (error) {
      console.error('Error processing escalations:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Obtenir les statistiques de conformité d'une organisation
   */
  async getOrganizationComplianceStats(
    organizationId: string,
    period: { startDate: Date; endDate: Date }
  ): Promise<{
    totalEmployees: number;
    compliantEmployees: number;
    complianceRate: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
    averageComplianceScore: number;
    riskDistribution: Record<string, number>;
  }> {
    try {
      // Obtenir tous les employés de l'organisation
      const employees = await this.getOrganizationEmployees(organizationId);
      
      // Générer les rapports de conformité pour tous les employés
      const reports = await Promise.all(
        employees.map(emp => 
          this.generateComplianceReport(emp.id, organizationId, period.startDate, period.endDate)
        )
      );

      const compliantEmployees = reports.filter(r => r.complianceScore >= 80).length;
      const complianceRate = employees.length > 0 ? (compliantEmployees / employees.length) * 100 : 100;

      const allViolations = reports.flatMap(r => r.violations);
      const violationsByType = this.groupBy(allViolations, 'violationType');
      const violationsBySeverity = this.groupBy(allViolations, 'severity');
      const riskDistribution = this.groupBy(reports, 'riskLevel');

      const averageComplianceScore = reports.length > 0
        ? reports.reduce((sum, r) => sum + r.complianceScore, 0) / reports.length
        : 100;

      return {
        totalEmployees: employees.length,
        compliantEmployees,
        complianceRate: Math.round(complianceRate * 100) / 100,
        totalViolations: allViolations.length,
        violationsByType: this.countGroups(violationsByType),
        violationsBySeverity: this.countGroups(violationsBySeverity),
        averageComplianceScore: Math.round(averageComplianceScore * 100) / 100,
        riskDistribution: this.countGroups(riskDistribution)
      };
    } catch (error) {
      console.error('Error getting organization compliance stats:', error);
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // Méthodes privées

  private async evaluateParticipantCompliance(
    userId: string,
    eventId: string,
    rule: ComplianceRule,
    attendance?: any
  ): Promise<ComplianceViolation | null> {
    if (!attendance) {
      // Absence complète
      return this.createViolation(
        userId,
        eventId,
        rule.id,
        'absence',
        'high',
        'Absence à un événement obligatoire'
      );
    }

    // Vérifier les autres types de violations
    if (attendance.status === 'late') {
      const lateMinutes = this.calculateLateMinutes(attendance);
      if (lateMinutes > 15) { // Plus de 15 minutes de retard
        return this.createViolation(
          userId,
          eventId,
          rule.id,
          'late',
          'medium',
          `Retard de ${lateMinutes} minutes`
        );
      }
    }

    if (attendance.status === 'left_early') {
      return this.createViolation(
        userId,
        eventId,
        rule.id,
        'early_departure',
        'medium',
        'Départ anticipé de l\'événement'
      );
    }

    return null;
  }

  private createViolation(
    userId: string,
    eventId: string,
    ruleId: string,
    violationType: ComplianceViolation['violationType'],
    severity: ComplianceViolation['severity'],
    description: string
  ): ComplianceViolation {
    const violationId = this.db.collection('compliance_violations').doc().id;
    
    return {
      id: violationId,
      userId,
      eventId,
      ruleId,
      violationType,
      severity,
      detectedAt: new Date(),
      status: 'open',
      escalationLevel: 0,
      notes: [description]
    };
  }

  private calculateComplianceScore(
    attendanceRate: number,
    violations: ComplianceViolation[]
  ): number {
    let score = attendanceRate;

    // Pénalités basées sur les violations
    const severityPenalties = {
      low: 2,
      medium: 5,
      high: 10,
      critical: 20
    };

    for (const violation of violations) {
      if (violation.status !== 'justified' && violation.status !== 'resolved') {
        score -= severityPenalties[violation.severity];
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private determineRiskLevel(
    complianceScore: number,
    violations: ComplianceViolation[]
  ): ComplianceReport['riskLevel'] {
    const openViolations = violations.filter(v => 
      v.status === 'open' || v.status === 'escalated'
    );

    const criticalViolations = openViolations.filter(v => v.severity === 'critical');

    if (criticalViolations.length > 0 || complianceScore < 50) {
      return 'critical';
    } else if (complianceScore < 70 || openViolations.length > 3) {
      return 'high';
    } else if (complianceScore < 85 || openViolations.length > 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateRecommendations(
    attendanceRate: number,
    violations: ComplianceViolation[],
    riskLevel: ComplianceReport['riskLevel']
  ): string[] {
    const recommendations: string[] = [];

    if (attendanceRate < 80) {
      recommendations.push('Améliorer le taux de présence aux événements obligatoires');
    }

    const lateViolations = violations.filter(v => v.violationType === 'late');
    if (lateViolations.length > 2) {
      recommendations.push('Travailler sur la ponctualité');
    }

    const absenceViolations = violations.filter(v => v.violationType === 'absence');
    if (absenceViolations.length > 1) {
      recommendations.push('Planifier et prioriser la participation aux événements obligatoires');
    }

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Rencontre avec le manager recommandée');
      recommendations.push('Plan d\'amélioration de la conformité requis');
    }

    return recommendations;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = groups[value] || [];
      groups[value].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private countGroups<T>(groups: Record<string, T[]>): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [key, items] of Object.entries(groups)) {
      counts[key] = items.length;
    }
    return counts;
  }

  // Méthodes de base de données (à implémenter selon votre structure)
  private async getEventById(eventId: string): Promise<any> {
    // Implémentation à adapter selon votre modèle d'événement
    const eventDoc = await this.db.collection('events').doc(eventId).get();
    return eventDoc.data();
  }

  private async getActiveComplianceRules(organizationId: string, eventType: string): Promise<ComplianceRule[]> {
    const rulesQuery = await this.db
      .collection('compliance_rules')
      .where('organizationId', '==', organizationId)
      .where('isActive', '==', true)
      .where('eventTypes', 'array-contains', eventType)
      .get();

    return rulesQuery.docs.map(doc => doc.data() as ComplianceRule);
  }

  private async saveViolation(violation: ComplianceViolation): Promise<void> {
    await this.db.collection('compliance_violations').doc(violation.id).set(violation);
  }

  private async saveComplianceReport(report: ComplianceReport): Promise<void> {
    const reportId = `${report.userId}_${report.period.startDate.toISOString().split('T')[0]}_${report.period.endDate.toISOString().split('T')[0]}`;
    await this.db.collection('compliance_reports').doc(reportId).set(report);
  }

  // Autres méthodes utilitaires à implémenter selon vos besoins...
  private async getExpectedParticipants(eventId: string): Promise<string[]> {
    // Implémentation à adapter
    return [];
  }

  private async getEventAttendances(eventId: string): Promise<any[]> {
    // Implémentation à adapter
    return [];
  }

  private async getMandatoryEventsInPeriod(organizationId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implémentation à adapter
    return [];
  }

  private async getUserAttendancesInPeriod(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Implémentation à adapter
    return [];
  }

  private async getUserViolationsInPeriod(userId: string, startDate: Date, endDate: Date): Promise<ComplianceViolation[]> {
    // Implémentation à adapter
    return [];
  }

  private async getViolationById(violationId: string): Promise<ComplianceViolation | null> {
    // Implémentation à adapter
    return null;
  }

  private async getViolationsForEscalation(now: Date): Promise<ComplianceViolation[]> {
    // Implémentation à adapter
    return [];
  }

  private async getComplianceRuleById(ruleId: string): Promise<ComplianceRule | null> {
    // Implémentation à adapter
    return null;
  }

  private async escalateViolation(violation: ComplianceViolation, escalationConfig: EscalationLevel): Promise<void> {
    // Implémentation à adapter
  }

  private async getOrganizationEmployees(organizationId: string): Promise<any[]> {
    // Implémentation à adapter
    return [];
  }

  private calculateLateMinutes(attendance: any): number {
    // Implémentation à adapter
    return 0;
  }
}

export const hrComplianceService = new HRComplianceService();