/**
 * Service Employee pour la gestion de présence
 */

import { 
  DEFAULT_LEAVE_BALANCES, 
  Employee, 
  GeoLocation, 
  LeaveType,
  PaginatedResponse,
  PaginationParams
} from '../../shared';
import { logger } from 'firebase-functions';
import { Query } from 'firebase-admin/firestore';
import { collections } from '../../config';
import { EmployeeModel } from '../../models/employee.model';

// Interfaces pour les options de recherche
export interface EmployeeListOptions extends PaginationParams {
  organizationId?: string;
  departmentId?: string;
  isActive?: boolean;
  searchTerm?: string;
  workScheduleId?: string;
}

export interface EmployeeCreateRequest {
  userId: string;
  employeeId: string;
  organizationId: string;
  departmentId?: string;
  position: string;
  hireDate: Date;
  workEmail?: string;
  workPhone?: string;
  requiresGeolocation?: boolean;
  locationRadius?: number;
  allowedLocations?: GeoLocation[];
  leaveBalances?: Partial<Record<LeaveType, number>>;
  createdBy: string;
}

export interface EmployeeUpdateRequest {
  departmentId?: string;
  position?: string;
  workEmail?: string;
  workPhone?: string;
  workScheduleId?: string;
  requiresGeolocation?: boolean;
  locationRadius?: number;
  allowedLocations?: GeoLocation[];
  isActive?: boolean;
  updatedBy: string;
}

export interface LeaveBalanceUpdate {
  leaveType: LeaveType;
  amount: number;
  reason?: string;
  updatedBy: string;
}

class EmployeeService {
  private readonly collectionName = 'employees';

  /**
   * Créer un nouvel employé
   */
  async createEmployee(data: EmployeeCreateRequest): Promise<Employee> {
    try {
      logger.info('Creating employee', { employeeId: data.employeeId, organizationId: data.organizationId });

      // Vérifier que l'employeeId est unique dans l'organisation
      await this.validateUniqueEmployeeId(data.employeeId, data.organizationId);

      // Vérifier que l'utilisateur existe
      const userDoc = await collections.users.doc(data.userId).get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      // Vérifier que l'utilisateur n'est pas déjà employé dans cette organisation
      const existingEmployee = await this.findByUserAndOrganization(data.userId, data.organizationId);
      if (existingEmployee) {
        throw new Error('User is already an employee in this organization');
      }

      // Créer le modèle employé
      const employeeData: Partial<Employee> = {
        ...data,
        leaveBalances: {
          ...DEFAULT_LEAVE_BALANCES,
          ...data.leaveBalances
        },
        isActive: true,
        requiresGeolocation: data.requiresGeolocation || false,
        locationRadius: data.locationRadius || 100
      };

      const employee = new EmployeeModel(employeeData);
      await employee.validate();

      // Sauvegarder en base
      const docRef = collections[this.collectionName].doc();
      await docRef.set({
        ...employee.toFirestore(),
        id: docRef.id
      });

      logger.info('Employee created successfully', { id: docRef.id, employeeId: data.employeeId });

      return {
        ...employee.getData(),
        id: docRef.id
      };
    } catch (error) {
      logger.error('Error creating employee', { error, data });
      throw error;
    }
  }

  /**
   * Récupérer un employé par ID
   */
  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);
      return employee ? employee.getData() : null;
    } catch (error) {
      logger.error('Error getting employee by ID', { error, id });
      throw error;
    }
  }

  /**
   * Récupérer un employé par employeeId et organizationId
   */
  async getEmployeeByEmployeeId(employeeId: string, organizationId: string): Promise<Employee | null> {
    try {
      const query = collections[this.collectionName]
        .where('employeeId', '==', employeeId)
        .where('organizationId', '==', organizationId)
        .limit(1);

      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }

      const employee = EmployeeModel.fromFirestore(snapshot.docs[0]);
      return employee ? employee.getData() : null;
    } catch (error) {
      logger.error('Error getting employee by employee ID', { error, employeeId, organizationId });
      throw error;
    }
  }

  /**
   * Récupérer un employé par userId et organizationId
   */
  async findByUserAndOrganization(userId: string, organizationId: string): Promise<Employee | null> {
    try {
      const query = collections[this.collectionName]
        .where('userId', '==', userId)
        .where('organizationId', '==', organizationId)
        .limit(1);

      const snapshot = await query.get();
      if (snapshot.empty) {
        return null;
      }

      const employee = EmployeeModel.fromFirestore(snapshot.docs[0]);
      return employee ? employee.getData() : null;
    } catch (error) {
      logger.error('Error finding employee by user and organization', { error, userId, organizationId });
      throw error;
    }
  }

  /**
   * Lister les employés avec pagination et filtres
   */
  async listEmployees(options: EmployeeListOptions): Promise<PaginatedResponse<Employee>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        organizationId,
        departmentId,
        isActive,
        searchTerm,
        workScheduleId
      } = options;

      let query: Query = collections[this.collectionName];

      // Filtres
      if (organizationId) {
        query = query.where('organizationId', '==', organizationId);
      }

      if (departmentId) {
        query = query.where('departmentId', '==', departmentId);
      }

      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      }

      if (workScheduleId) {
        query = query.where('workScheduleId', '==', workScheduleId);
      }

      // Tri
      query = query.orderBy(sortBy, sortOrder);

      // Pagination
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();
      const employees: Employee[] = [];

      snapshot.forEach(doc => {
        const employee = EmployeeModel.fromFirestore(doc);
        if (employee) {
          employees.push(employee.getData());
        }
      });

      // Filtrage par terme de recherche (côté client pour simplicité)
      let filteredEmployees = employees;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredEmployees = employees.filter(emp => 
          emp.employeeId.toLowerCase().includes(term) ||
          emp.position.toLowerCase().includes(term) ||
          emp.workEmail?.toLowerCase().includes(term) ||
          emp.workPhone?.includes(term)
        );
      }

      // Compter le total pour la pagination
      let countQuery: Query = collections[this.collectionName];
      if (organizationId) {
        countQuery = countQuery.where('organizationId', '==', organizationId);
      }
      if (departmentId) {
        countQuery = countQuery.where('departmentId', '==', departmentId);
      }
      if (isActive !== undefined) {
        countQuery = countQuery.where('isActive', '==', isActive);
      }

      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;
      const totalPages = Math.ceil(total / limit);

      return {
        data: filteredEmployees,
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
      logger.error('Error listing employees', { error, options });
      throw error;
    }
  }

  /**
   * Mettre à jour un employé
   */
  async updateEmployee(id: string, updates: EmployeeUpdateRequest): Promise<Employee> {
    try {
      logger.info('Updating employee', { id, updates });

      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Appliquer les mises à jour
      employee.update(updates);
      await employee.validate();

      // Sauvegarder
      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      logger.info('Employee updated successfully', { id });
      return employee.getData();
    } catch (error) {
      logger.error('Error updating employee', { error, id, updates });
      throw error;
    }
  }

  /**
   * Supprimer un employé (soft delete)
   */
  async deleteEmployee(id: string, deletedBy: string): Promise<void> {
    try {
      logger.info('Deleting employee', { id, deletedBy });

      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Désactiver l'employé au lieu de le supprimer
      employee.deactivate();
      employee.update({ updatedBy: deletedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      logger.info('Employee deleted successfully', { id });
    } catch (error) {
      logger.error('Error deleting employee', { error, id, deletedBy });
      throw error;
    }
  }

  /**
   * Activer/Désactiver un employé
   */
  async toggleEmployeeStatus(id: string, isActive: boolean, updatedBy: string): Promise<Employee> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      if (isActive) {
        employee.activate();
      } else {
        employee.deactivate();
      }

      employee.update({ updatedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      return employee.getData();
    } catch (error) {
      logger.error('Error toggling employee status', { error, id, isActive, updatedBy });
      throw error;
    }
  }

  /**
   * Assigner un horaire de travail
   */
  async assignWorkSchedule(id: string, scheduleId: string, updatedBy: string): Promise<Employee> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      employee.assignWorkSchedule(scheduleId);
      employee.update({ updatedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      return employee.getData();
    } catch (error) {
      logger.error('Error assigning work schedule', { error, id, scheduleId, updatedBy });
      throw error;
    }
  }

  /**
   * Retirer l'horaire de travail
   */
  async removeWorkSchedule(id: string, updatedBy: string): Promise<Employee> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      employee.removeWorkSchedule();
      employee.update({ updatedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      return employee.getData();
    } catch (error) {
      logger.error('Error removing work schedule', { error, id, updatedBy });
      throw error;
    }
  }

  /**
   * Mettre à jour les soldes de congés
   */
  async updateLeaveBalance(id: string, update: LeaveBalanceUpdate): Promise<Employee> {
    try {
      logger.info('Updating leave balance', { id, update });

      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      employee.updateLeaveBalance(update.leaveType, update.amount);
      employee.update({ updatedBy: update.updatedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      logger.info('Leave balance updated successfully', { id, leaveType: update.leaveType, amount: update.amount });
      return employee.getData();
    } catch (error) {
      logger.error('Error updating leave balance', { error, id, update });
      throw error;
    }
  }

  /**
   * Réinitialiser les soldes de congés
   */
  async resetLeaveBalances(id: string, newBalances: Partial<Record<LeaveType, number>>, updatedBy: string): Promise<Employee> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      employee.resetLeaveBalances(newBalances);
      employee.update({ updatedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      return employee.getData();
    } catch (error) {
      logger.error('Error resetting leave balances', { error, id, newBalances, updatedBy });
      throw error;
    }
  }

  /**
   * Mettre à jour les paramètres de géolocalisation
   */
  async updateLocationSettings(
    id: string, 
    settings: {
      requiresGeolocation?: boolean;
      locationRadius?: number;
      allowedLocations?: GeoLocation[];
    },
    updatedBy: string
  ): Promise<Employee> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const employee = EmployeeModel.fromFirestore(doc);

      if (!employee) {
        throw new Error('Employee not found');
      }

      employee.updateLocationSettings(settings);
      employee.update({ updatedBy });

      await collections[this.collectionName].doc(id).update(employee.toFirestore());

      return employee.getData();
    } catch (error) {
      logger.error('Error updating location settings', { error, id, settings, updatedBy });
      throw error;
    }
  }

  /**
   * Obtenir les employés par département
   */
  async getEmployeesByDepartment(organizationId: string, departmentId: string): Promise<Employee[]> {
    try {
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('departmentId', '==', departmentId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      const employees: Employee[] = [];

      snapshot.forEach(doc => {
        const employee = EmployeeModel.fromFirestore(doc);
        if (employee) {
          employees.push(employee.getData());
        }
      });

      return employees;
    } catch (error) {
      logger.error('Error getting employees by department', { error, organizationId, departmentId });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des employés
   */
  async getEmployeeStats(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byDepartment: Record<string, number>;
    totalLeaveBalance: Record<LeaveType, number>;
  }> {
    try {
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId);

      const snapshot = await query.get();
      
      let total = 0;
      let active = 0;
      let inactive = 0;
      const byDepartment: Record<string, number> = {};
      const totalLeaveBalance: Record<LeaveType, number> = {
        [LeaveType.VACATION]: 0,
        [LeaveType.SICK_LEAVE]: 0,
        [LeaveType.PERSONAL]: 0,
        [LeaveType.MATERNITY]: 0,
        [LeaveType.PATERNITY]: 0,
        [LeaveType.BEREAVEMENT]: 0,
        [LeaveType.UNPAID]: 0,
        [LeaveType.COMPENSATORY]: 0,
        [LeaveType.STUDY]: 0
      };

      snapshot.forEach(doc => {
        const employee = EmployeeModel.fromFirestore(doc);
        if (employee) {
          const data = employee.getData();
          total++;
          
          if (data.isActive) {
            active++;
          } else {
            inactive++;
          }

          if (data.departmentId) {
            byDepartment[data.departmentId] = (byDepartment[data.departmentId] || 0) + 1;
          }

          // Additionner les soldes de congés
          Object.entries(data.leaveBalances).forEach(([leaveType, balance]) => {
            totalLeaveBalance[leaveType as LeaveType] += balance;
          });
        }
      });

      return {
        total,
        active,
        inactive,
        byDepartment,
        totalLeaveBalance
      };
    } catch (error) {
      logger.error('Error getting employee stats', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les employés disponibles pour remplacement
   */
  async getAvailableEmployeesForReplacement(
    organizationId: string, 
    date: Date, 
    requiredSkills?: string[]
  ): Promise<Employee[]> {
    try {
      // Pour l'instant, retourner tous les employés actifs
      // Dans une implémentation complète, on vérifierait les congés, horaires, etc.
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      const employees: Employee[] = [];

      snapshot.forEach(doc => {
        const employee = EmployeeModel.fromFirestore(doc);
        if (employee) {
          employees.push(employee.getData());
        }
      });

      // TODO: Filtrer par disponibilité et compétences
      return employees;
    } catch (error) {
      logger.error('Error getting available employees for replacement', { error, organizationId, date });
      throw error;
    }
  }

  /**
   * Obtenir les employés avec des anomalies de présence
   */
  async getEmployeesWithAnomalies(organizationId: string, date: Date): Promise<{
    employee: Employee;
    anomalies: string[];
  }[]> {
    try {
      // Cette méthode sera complétée avec la logique de détection d'anomalies
      // Pour l'instant, retourner un tableau vide
      return [];
    } catch (error) {
      logger.error('Error getting employees with anomalies', { error, organizationId, date });
      throw error;
    }
  }

  /**
   * Obtenir les employés avec des congés à prendre bientôt
   */
  async getEmployeesWithUpcomingLeaveDeadlines(organizationId: string): Promise<{
    employee: Employee;
    leaveType: LeaveType;
    balance: number;
    deadline: Date;
  }[]> {
    try {
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      const results: {
        employee: Employee;
        leaveType: LeaveType;
        balance: number;
        deadline: Date;
      }[] = [];

      snapshot.forEach(doc => {
        const employee = EmployeeModel.fromFirestore(doc);
        if (employee) {
          const data = employee.getData();
          
          // Vérifier les soldes de congés qui expirent (exemple: fin d'année)
          Object.entries(data.leaveBalances).forEach(([leaveType, balance]) => {
            if (balance > 0 && leaveType === LeaveType.VACATION) {
              // Exemple: les congés expirent le 31 décembre
              const deadline = new Date(new Date().getFullYear(), 11, 31);
              const now = new Date();
              const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              // Alerter si moins de 60 jours avant expiration
              if (daysUntilDeadline <= 60 && daysUntilDeadline > 0) {
                results.push({
                  employee: data,
                  leaveType: leaveType as LeaveType,
                  balance,
                  deadline
                });
              }
            }
          });
        }
      });

      return results;
    } catch (error) {
      logger.error('Error getting employees with upcoming leave deadlines', { error, organizationId });
      throw error;
    }
  }

  /**
   * Obtenir les employés par compétences
   */
  async getEmployeesBySkills(organizationId: string, skills: string[]): Promise<Employee[]> {
    try {
      // Pour l'instant, retourner tous les employés actifs
      // Dans une implémentation complète, on filtrerait par compétences
      const query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('isActive', '==', true);

      const snapshot = await query.get();
      const employees: Employee[] = [];

      snapshot.forEach(doc => {
        const employee = EmployeeModel.fromFirestore(doc);
        if (employee) {
          employees.push(employee.getData());
        }
      });

      // TODO: Implémenter le filtrage par compétences
      return employees;
    } catch (error) {
      logger.error('Error getting employees by skills', { error, organizationId, skills });
      throw error;
    }
  }

  /**
   * Valider l'unicité de l'employeeId dans l'organisation
   */
  private async validateUniqueEmployeeId(employeeId: string, organizationId: string, excludeId?: string): Promise<void> {
    const query = collections[this.collectionName]
      .where('employeeId', '==', employeeId)
      .where('organizationId', '==', organizationId);

    const snapshot = await query.get();
    
    if (!snapshot.empty) {
      // Si on exclut un ID (pour les mises à jour), vérifier que ce n'est pas le même
      if (excludeId && snapshot.docs.length === 1 && snapshot.docs[0].id === excludeId) {
        return;
      }
      throw new Error(`Employee ID ${employeeId} already exists in this organization`);
    }
  }
}

export const employeeService = new EmployeeService();