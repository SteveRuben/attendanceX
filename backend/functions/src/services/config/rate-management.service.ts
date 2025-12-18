/**
 * Service de gestion des taux horaires
 */

import { firestore } from 'firebase-admin';
import { ValidationError } from '../../models/base.model';

// Types pour les taux horaires
export interface HourlyRate {
  id?: string;
  tenantId: string;
  
  // Identification
  employeeId?: string; // Si null, c'est un taux par défaut
  projectId?: string; // Si null, c'est un taux général
  activityCodeId?: string; // Si null, s'applique à toutes les activités
  
  // Taux
  standardRate: number; // Taux horaire standard
  overtimeRate?: number; // Taux heures supplémentaires (si différent du calcul automatique)
  billableRate?: number; // Taux facturable client (peut être différent du coût)
  
  // Période de validité
  effectiveFrom: Date;
  effectiveTo?: Date; // Si null, taux actuel
  
  // Métadonnées
  currency: string; // EUR, USD, etc.
  rateType: 'default' | 'employee' | 'project' | 'activity' | 'employee_project' | 'employee_activity';
  description?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export class RateManagementService {
  private db: firestore.Firestore;
  private ratesCollection: string = 'hourly_rates';

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // ==================== Gestion des taux par défaut ====================

  /**
   * Créer ou mettre à jour le taux par défaut de l'organisation
   */
  async setDefaultRate(
    tenantId: string,
    standardRate: number,
    currency: string = 'EUR',
    createdBy: string,
    description?: string
  ): Promise<HourlyRate> {
    try {
      // Désactiver l'ancien taux par défaut s'il existe
      await this.deactivateCurrentDefaultRate(tenantId);

      const rateData: HourlyRate = {
        tenantId,
        standardRate,
        currency,
        rateType: 'default',
        description: description || 'Default organizational rate',
        effectiveFrom: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const docRef = await this.db.collection(this.ratesCollection).add(rateData);
      
      return {
        ...rateData,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to set default rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le taux par défaut actuel
   */
  async getDefaultRate(tenantId: string): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('rateType', '==', 'default')
        .where('effectiveTo', '==', null)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as HourlyRate;
    } catch (error) {
      throw new Error(`Failed to get default rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des taux par employé ====================

  /**
   * Définir un taux spécifique pour un employé
   */
  async setEmployeeRate(
    tenantId: string,
    employeeId: string,
    standardRate: number,
    createdBy: string,
    billableRate?: number,
    effectiveFrom?: Date,
    description?: string
  ): Promise<HourlyRate> {
    try {
      // Désactiver l'ancien taux de l'employé s'il existe
      await this.deactivateCurrentEmployeeRate(tenantId, employeeId);

      const rateData: HourlyRate = {
        tenantId,
        employeeId,
        standardRate,
        billableRate,
        currency: 'EUR', // TODO: Récupérer depuis la config
        rateType: 'employee',
        description: description || `Rate for employee ${employeeId}`,
        effectiveFrom: effectiveFrom || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const docRef = await this.db.collection(this.ratesCollection).add(rateData);
      
      return {
        ...rateData,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to set employee rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le taux actuel d'un employé
   */
  async getEmployeeRate(tenantId: string, employeeId: string): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('rateType', '==', 'employee')
        .where('effectiveTo', '==', null)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as HourlyRate;
    } catch (error) {
      throw new Error(`Failed to get employee rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des taux par projet ====================

  /**
   * Définir un taux spécifique pour un projet
   */
  async setProjectRate(
    tenantId: string,
    projectId: string,
    standardRate: number,
    createdBy: string,
    billableRate?: number,
    effectiveFrom?: Date,
    description?: string
  ): Promise<HourlyRate> {
    try {
      // Désactiver l'ancien taux du projet s'il existe
      await this.deactivateCurrentProjectRate(tenantId, projectId);

      const rateData: HourlyRate = {
        tenantId,
        projectId,
        standardRate,
        billableRate,
        currency: 'EUR',
        rateType: 'project',
        description: description || `Rate for project ${projectId}`,
        effectiveFrom: effectiveFrom || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const docRef = await this.db.collection(this.ratesCollection).add(rateData);
      
      return {
        ...rateData,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to set project rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir le taux actuel d'un projet
   */
  async getProjectRate(tenantId: string, projectId: string): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('projectId', '==', projectId)
        .where('rateType', '==', 'project')
        .where('effectiveTo', '==', null)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as HourlyRate;
    } catch (error) {
      throw new Error(`Failed to get project rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion des taux combinés ====================

  /**
   * Définir un taux spécifique pour un employé sur un projet
   */
  async setEmployeeProjectRate(
    tenantId: string,
    employeeId: string,
    projectId: string,
    standardRate: number,
    createdBy: string,
    billableRate?: number,
    effectiveFrom?: Date,
    description?: string
  ): Promise<HourlyRate> {
    try {
      // Désactiver l'ancien taux employé-projet s'il existe
      await this.deactivateCurrentEmployeeProjectRate(tenantId, employeeId, projectId);

      const rateData: HourlyRate = {
        tenantId,
        employeeId,
        projectId,
        standardRate,
        billableRate,
        currency: 'EUR',
        rateType: 'employee_project',
        description: description || `Rate for employee ${employeeId} on project ${projectId}`,
        effectiveFrom: effectiveFrom || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy
      };

      const docRef = await this.db.collection(this.ratesCollection).add(rateData);
      
      return {
        ...rateData,
        id: docRef.id
      };
    } catch (error) {
      throw new Error(`Failed to set employee project rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Calcul automatique des taux ====================

  /**
   * Calculer le taux applicable pour une entrée de temps
   * Hiérarchie: Employé-Projet > Employé > Projet > Défaut
   */
  async calculateApplicableRate(
    tenantId: string,
    employeeId: string,
    projectId?: string,
    activityCodeId?: string,
    date?: Date
  ): Promise<{
    standardRate: number;
    billableRate: number;
    overtimeRate: number;
    currency: string;
    rateSource: string;
    rateId?: string;
  }> {
    try {
      const effectiveDate = date || new Date();
      let applicableRate: HourlyRate | null = null;
      let rateSource = 'default';

      // 1. Chercher taux employé-projet spécifique
      if (projectId) {
        applicableRate = await this.getEmployeeProjectRateAtDate(tenantId, employeeId, projectId, effectiveDate);
        if (applicableRate) {
          rateSource = 'employee_project';
        }
      }

      // 2. Chercher taux employé spécifique
      if (!applicableRate) {
        applicableRate = await this.getEmployeeRateAtDate(tenantId, employeeId, effectiveDate);
        if (applicableRate) {
          rateSource = 'employee';
        }
      }

      // 3. Chercher taux projet spécifique
      if (!applicableRate && projectId) {
        applicableRate = await this.getProjectRateAtDate(tenantId, projectId, effectiveDate);
        if (applicableRate) {
          rateSource = 'project';
        }
      }

      // 4. Utiliser le taux par défaut
      if (!applicableRate) {
        applicableRate = await this.getDefaultRateAtDate(tenantId, effectiveDate);
        rateSource = 'default';
      }

      if (!applicableRate) {
        throw new ValidationError('No applicable rate found');
      }

      // Calculer le taux d'heures supplémentaires
      const overtimeMultiplier = await this.getOvertimeMultiplier(tenantId);
      const overtimeRate = applicableRate.overtimeRate || (applicableRate.standardRate * overtimeMultiplier);

      return {
        standardRate: applicableRate.standardRate,
        billableRate: applicableRate.billableRate || applicableRate.standardRate,
        overtimeRate,
        currency: applicableRate.currency,
        rateSource,
        rateId: applicableRate.id
      };
    } catch (error) {
      throw new Error(`Failed to calculate applicable rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculer le coût d'une entrée de temps
   */
  async calculateEntryCost(
    tenantId: string,
    employeeId: string,
    projectId: string | undefined,
    duration: number, // en minutes
    isOvertime: boolean = false,
    date?: Date
  ): Promise<{
    standardCost: number;
    billableCost: number;
    actualCost: number;
    currency: string;
    rateUsed: number;
    rateSource: string;
  }> {
    try {
      const rates = await this.calculateApplicableRate(tenantId, employeeId, projectId, undefined, date);
      const hours = duration / 60;
      
      const rateUsed = isOvertime ? rates.overtimeRate : rates.standardRate;
      const billableRateUsed = isOvertime ? rates.overtimeRate : rates.billableRate;
      
      return {
        standardCost: hours * rates.standardRate,
        billableCost: hours * billableRateUsed,
        actualCost: hours * rateUsed,
        currency: rates.currency,
        rateUsed,
        rateSource: rates.rateSource
      };
    } catch (error) {
      throw new Error(`Failed to calculate entry cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Gestion de l'historique ====================

  /**
   * Obtenir l'historique des taux pour un employé
   */
  async getEmployeeRateHistory(tenantId: string, employeeId: string): Promise<HourlyRate[]> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .orderBy('effectiveFrom', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HourlyRate));
    } catch (error) {
      throw new Error(`Failed to get employee rate history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir l'historique des taux pour un projet
   */
  async getProjectRateHistory(tenantId: string, projectId: string): Promise<HourlyRate[]> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('projectId', '==', projectId)
        .orderBy('effectiveFrom', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HourlyRate));
    } catch (error) {
      throw new Error(`Failed to get project rate history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Méthodes utilitaires privées ====================

  private async deactivateCurrentDefaultRate(tenantId: string): Promise<void> {
    const currentRate = await this.getDefaultRate(tenantId);
    if (currentRate && currentRate.id) {
      await this.db.collection(this.ratesCollection).doc(currentRate.id).update({
        effectiveTo: new Date(),
        updatedAt: new Date()
      });
    }
  }

  private async deactivateCurrentEmployeeRate(tenantId: string, employeeId: string): Promise<void> {
    const currentRate = await this.getEmployeeRate(tenantId, employeeId);
    if (currentRate && currentRate.id) {
      await this.db.collection(this.ratesCollection).doc(currentRate.id).update({
        effectiveTo: new Date(),
        updatedAt: new Date()
      });
    }
  }

  private async deactivateCurrentProjectRate(tenantId: string, projectId: string): Promise<void> {
    const currentRate = await this.getProjectRate(tenantId, projectId);
    if (currentRate && currentRate.id) {
      await this.db.collection(this.ratesCollection).doc(currentRate.id).update({
        effectiveTo: new Date(),
        updatedAt: new Date()
      });
    }
  }

  private async deactivateCurrentEmployeeProjectRate(tenantId: string, employeeId: string, projectId: string): Promise<void> {
    const query = await this.db.collection(this.ratesCollection)
      .where('tenantId', '==', tenantId)
      .where('employeeId', '==', employeeId)
      .where('projectId', '==', projectId)
      .where('rateType', '==', 'employee_project')
      .where('effectiveTo', '==', null)
      .get();

    const batch = this.db.batch();
    query.docs.forEach(doc => {
      batch.update(doc.ref, {
        effectiveTo: new Date(),
        updatedAt: new Date()
      });
    });

    if (!query.empty) {
      await batch.commit();
    }
  }

  private async getEmployeeProjectRateAtDate(
    tenantId: string,
    employeeId: string,
    projectId: string,
    date: Date
  ): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('projectId', '==', projectId)
        .where('rateType', '==', 'employee_project')
        .where('effectiveFrom', '<=', date)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      const rate = { id: doc.id, ...doc.data() } as HourlyRate;

      // Vérifier que le taux est encore valide à cette date
      if (rate.effectiveTo && rate.effectiveTo < date) {
        return null;
      }

      return rate;
    } catch (error) {
      return null;
    }
  }

  private async getEmployeeRateAtDate(tenantId: string, employeeId: string, date: Date): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('employeeId', '==', employeeId)
        .where('rateType', '==', 'employee')
        .where('effectiveFrom', '<=', date)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      const rate = { id: doc.id, ...doc.data() } as HourlyRate;

      if (rate.effectiveTo && rate.effectiveTo < date) {
        return null;
      }

      return rate;
    } catch (error) {
      return null;
    }
  }

  private async getProjectRateAtDate(tenantId: string, projectId: string, date: Date): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('projectId', '==', projectId)
        .where('rateType', '==', 'project')
        .where('effectiveFrom', '<=', date)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      const rate = { id: doc.id, ...doc.data() } as HourlyRate;

      if (rate.effectiveTo && rate.effectiveTo < date) {
        return null;
      }

      return rate;
    } catch (error) {
      return null;
    }
  }

  private async getDefaultRateAtDate(tenantId: string, date: Date): Promise<HourlyRate | null> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('rateType', '==', 'default')
        .where('effectiveFrom', '<=', date)
        .orderBy('effectiveFrom', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      const rate = { id: doc.id, ...doc.data() } as HourlyRate;

      if (rate.effectiveTo && rate.effectiveTo < date) {
        return null;
      }

      return rate;
    } catch (error) {
      return null;
    }
  }

  private async getOvertimeMultiplier(tenantId: string): Promise<number> {
    try {
      // Importer le service de configuration pour obtenir le multiplicateur
      // Pour l'instant, retourner une valeur par défaut
      return 1.5;
    } catch (error) {
      return 1.5; // Valeur par défaut
    }
  }

  // ==================== Méthodes d'administration ====================

  /**
   * Lister tous les taux actifs pour un tenant
   */
  async listActiveRates(tenantId: string): Promise<HourlyRate[]> {
    try {
      const query = await this.db.collection(this.ratesCollection)
        .where('tenantId', '==', tenantId)
        .where('effectiveTo', '==', null)
        .orderBy('rateType')
        .orderBy('effectiveFrom', 'desc')
        .get();

      return query.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HourlyRate));
    } catch (error) {
      throw new Error(`Failed to list active rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Supprimer un taux (le désactiver)
   */
  async deactivateRate(rateId: string, updatedBy: string): Promise<void> {
    try {
      await this.db.collection(this.ratesCollection).doc(rateId).update({
        effectiveTo: new Date(),
        updatedAt: new Date(),
        updatedBy
      });
    } catch (error) {
      throw new Error(`Failed to deactivate rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obtenir les statistiques des taux
   */
  async getRateStatistics(tenantId: string): Promise<{
    totalActiveRates: number;
    ratesByType: Record<string, number>;
    averageStandardRate: number;
    averageBillableRate: number;
    currency: string;
  }> {
    try {
      const activeRates = await this.listActiveRates(tenantId);
      
      const ratesByType: Record<string, number> = {};
      let totalStandardRate = 0;
      let totalBillableRate = 0;
      let billableRateCount = 0;
      let currency = 'EUR';

      activeRates.forEach(rate => {
        ratesByType[rate.rateType] = (ratesByType[rate.rateType] || 0) + 1;
        totalStandardRate += rate.standardRate;
        
        if (rate.billableRate) {
          totalBillableRate += rate.billableRate;
          billableRateCount++;
        }
        
        currency = rate.currency; // Prendre la dernière devise trouvée
      });

      return {
        totalActiveRates: activeRates.length,
        ratesByType,
        averageStandardRate: activeRates.length > 0 ? totalStandardRate / activeRates.length : 0,
        averageBillableRate: billableRateCount > 0 ? totalBillableRate / billableRateCount : 0,
        currency
      };
    } catch (error) {
      throw new Error(`Failed to get rate statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}