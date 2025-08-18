/**
 * Service de gestion des demandes de congé
 */

import { collections } from '../config/database';
import { LeaveRequestModel } from '../models/leave-request.model';
import { EmployeeModel } from '../models/employee.model';
import { 
  LeaveRequest, 
  LeaveType,
  LeaveStatus,
  LeaveRequestInput,
  LeaveApprovalInput,
  PaginatedResponse, 
  PaginationParams,
  Employee
} from '@attendance-x/shared';
import { logger } from 'firebase-functions';
import { Query } from 'firebase-admin/firestore';

// Interfaces pour les options de recherche
export interface LeaveListOptions extends PaginationParams {
  organizationId?: string;
  employeeId?: string;
  type?: LeaveType;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface LeaveBalanceInfo {
  leaveType: LeaveType;
  currentBalance: number;
  requestedDays: number;
  remainingBalance: number;
  canApprove: boolean;
}

export interface LeaveConflictInfo {
  hasConflict: boolean;
  conflictingRequests: LeaveRequest[];
  overlappingDates: string[];
}

export interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  byType: Record<LeaveType, number>;
  totalDaysRequested: number;
  totalDaysApproved: number;
  averageRequestDuration: number;
}

class LeaveService {
  private readonly collectionName = 'leave_requests';
  private readonly employeesCollection = 'employees';

  /**
   * Soumettre une nouvelle demande de congé
   */
  async submitLeaveRequest(
    employeeId: string, 
    requestData: LeaveRequestInput
  ): Promise<LeaveRequest> {
    try {
      logger.info('Submitting leave request', { employeeId, type: requestData.type });

      // Récupérer l'employé
      const employee = await this.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      if (!employee.isActive) {
        throw new Error('Employee is not active');
      }

      // Calculer le nombre de jours
      const totalDays = this.calculateLeaveDays(
        requestData.startDate, 
        requestData.endDate, 
        requestData.isHalfDay || false
      );

      // Créer la demande de congé
      const leaveRequest = new LeaveRequestModel({
        employeeId: employee.id!,
        organizationId: employee.organizationId,
        type: requestData.type,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        totalDays,
        isHalfDay: requestData.isHalfDay || false,
        halfDayPeriod: requestData.halfDayPeriod,
        reason: requestData.reason,
        attachments: requestData.attachments,
        status: LeaveStatus.PENDING,
        deductedFromBalance: true
      });

      // Valider la demande
      await leaveRequest.validate();

      // Vérifier les conflits avec d'autres demandes
      const conflictInfo = await this.checkLeaveConflicts(leaveRequest, employee.organizationId);
      if (conflictInfo.hasConflict) {
        throw new Error(`Leave request conflicts with existing requests: ${conflictInfo.overlappingDates.join(', ')}`);
      }

      // Vérifier le solde de congés
      const balanceInfo = await this.checkLeaveBalance(employee, requestData.type, totalDays);
      if (!balanceInfo.canApprove) {
        logger.warn('Insufficient leave balance', { 
          employeeId, 
          type: requestData.type, 
          requested: totalDays, 
          available: balanceInfo.currentBalance 
        });
        // On peut choisir de permettre la soumission avec un avertissement
        // ou l'interdire complètement selon les règles métier
      }

      // Calculer l'impact sur les soldes
      leaveRequest.updateBalanceImpact();

      // Soumettre la demande
      leaveRequest.submit();

      // Sauvegarder en base
      const docRef = collections[(this.collectionName)].doc();
      await docRef.set({
        ...leaveRequest.toFirestore(),
        id: docRef.id
      });

      logger.info('Leave request submitted successfully', { 
        id: docRef.id, 
        employeeId, 
        type: requestData.type,
        days: totalDays
      });

      return {
        ...leaveRequest.getData(),
        id: docRef.id
      };
    } catch (error) {
      logger.error('Error submitting leave request', { error, employeeId, requestData });
      throw error;
    }
  }

  /**
   * Approuver une demande de congé
   */
  async approveLeaveRequest(
    requestId: string, 
    approvalData: LeaveApprovalInput,
    approvedBy: string
  ): Promise<LeaveRequest> {
    try {
      logger.info('Approving leave request', { requestId, approvedBy });

      const doc = await collections[(this.collectionName)].doc(requestId).get();
      const leaveRequest = LeaveRequestModel.fromFirestore(doc);

      if (!leaveRequest) {
        throw new Error('Leave request not found');
      }

      if (!leaveRequest.isPending()) {
        throw new Error('Only pending requests can be approved');
      }

      // Récupérer l'employé pour vérifier le solde
      const employee = await this.getEmployeeById(leaveRequest.employeeId);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Vérifier le solde de congés
      const balanceInfo = await this.checkLeaveBalance(employee, leaveRequest.type, leaveRequest.totalDays);
      if (!balanceInfo.canApprove) {
        throw new Error(`Insufficient leave balance. Available: ${balanceInfo.currentBalance}, Requested: ${balanceInfo.requestedDays}`);
      }

      // Approuver la demande
      if (approvalData.status === LeaveStatus.APPROVED) {
        leaveRequest.approve(approvedBy, approvalData.notes);

        // Déduire du solde de l'employé si nécessaire
        if (leaveRequest.deductedFromBalance) {
          await this.deductLeaveBalance(employee.id!, leaveRequest.type, leaveRequest.totalDays);
        }
      } else {
        leaveRequest.reject(approvedBy, approvalData.rejectionReason || 'No reason provided');
      }

      // Sauvegarder
      await collections[this.collectionName].doc(requestId).update(leaveRequest.toFirestore());

      logger.info('Leave request processed successfully', { 
        requestId, 
        status: approvalData.status, 
        approvedBy 
      });

      return leaveRequest.getData();
    } catch (error) {
      logger.error('Error processing leave request', { error, requestId, approvalData, approvedBy });
      throw error;
    }
  }

  /**
   * Annuler une demande de congé
   */
  async cancelLeaveRequest(requestId: string, cancelledBy: string): Promise<LeaveRequest> {
    try {
      logger.info('Cancelling leave request', { requestId, cancelledBy });

      const doc = await collections[this.collectionName].doc(requestId).get();
      const leaveRequest = LeaveRequestModel.fromFirestore(doc);

      if (!leaveRequest) {
        throw new Error('Leave request not found');
      }

      if (!leaveRequest.canBeCancelled()) {
        throw new Error('This leave request cannot be cancelled');
      }

      // Si la demande était approuvée, restaurer le solde
      if (leaveRequest.isApproved() && leaveRequest.deductedFromBalance) {
        await this.restoreLeaveBalance(leaveRequest.employeeId, leaveRequest.type, leaveRequest.totalDays);
      }

      // Annuler la demande
      leaveRequest.cancel();

      // Sauvegarder
      await collections[this.collectionName].doc(requestId).update(leaveRequest.toFirestore());

      logger.info('Leave request cancelled successfully', { requestId, cancelledBy });
      return leaveRequest.getData();
    } catch (error) {
      logger.error('Error cancelling leave request', { error, requestId, cancelledBy });
      throw error;
    }
  }

  /**
   * Récupérer une demande de congé par ID
   */
  async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    try {
      const doc = await collections[this.collectionName].doc(id).get();
      const leaveRequest = LeaveRequestModel.fromFirestore(doc);
      return leaveRequest ? leaveRequest.getData() : null;
    } catch (error) {
      logger.error('Error getting leave request by ID', { error, id });
      throw error;
    }
  }

  /**
   * Lister les demandes de congé avec filtres et pagination
   */
  async listLeaveRequests(options: LeaveListOptions): Promise<PaginatedResponse<LeaveRequest>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        organizationId,
        employeeId,
        type,
        status,
        startDate,
        endDate,
        searchTerm
      } = options;

      let query: Query = collections[this.collectionName];

      // Filtres
      if (organizationId) {
        query = query.where('organizationId', '==', organizationId);
      }

      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      if (status) {
        query = query.where('status', '==', status);
      }

      if (startDate) {
        query = query.where('startDate', '>=', startDate);
      }

      if (endDate) {
        query = query.where('endDate', '<=', endDate);
      }

      // Tri
      query = query.orderBy(sortBy, sortOrder);

      // Pagination
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();
      const requests: LeaveRequest[] = [];

      snapshot.forEach(doc => {
        const request = LeaveRequestModel.fromFirestore(doc);
        if (request) {
          const requestData = request.getData();
          
          // Filtrage par terme de recherche
          if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!requestData.reason.toLowerCase().includes(term)) {
              return;
            }
          }

          requests.push(requestData);
        }
      });

      // Compter le total pour la pagination
      let countQuery: Query = collections[this.collectionName];
      if (organizationId) {
        countQuery = countQuery.where('organizationId', '==', organizationId);
      }
      if (employeeId) {
        countQuery = countQuery.where('employeeId', '==', employeeId);
      }
      if (type) {
        countQuery = countQuery.where('type', '==', type);
      }
      if (status) {
        countQuery = countQuery.where('status', '==', status);
      }

      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;
      const totalPages = Math.ceil(total / limit);

      return {
        data: requests,
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
      logger.error('Error listing leave requests', { error, options });
      throw error;
    }
  }

  /**
   * Obtenir les demandes de congé en attente pour un approbateur
   */
  async getPendingLeaveRequests(organizationId: string, approverId?: string): Promise<LeaveRequest[]> {
    try {
      let query: Query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('status', '==', LeaveStatus.PENDING)
        .orderBy('submittedAt', 'asc');

      const snapshot = await query.get();
      const requests: LeaveRequest[] = [];

      snapshot.forEach(doc => {
        const request = LeaveRequestModel.fromFirestore(doc);
        if (request) {
          requests.push(request.getData());
        }
      });

      return requests;
    } catch (error) {
      logger.error('Error getting pending leave requests', { error, organizationId, approverId });
      throw error;
    }
  }

  /**
   * Obtenir les congés à venir pour un employé ou une organisation
   */
  async getUpcomingLeaves(organizationId: string, employeeId?: string): Promise<LeaveRequest[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query: Query = collections[this.collectionName]
        .where('organizationId', '==', organizationId)
        .where('status', '==', LeaveStatus.APPROVED)
        .where('startDate', '>=', today)
        .orderBy('startDate', 'asc');

      if (employeeId) {
        query = query.where('employeeId', '==', employeeId);
      }

      const snapshot = await query.get();
      const requests: LeaveRequest[] = [];

      snapshot.forEach(doc => {
        const request = LeaveRequestModel.fromFirestore(doc);
        if (request) {
          requests.push(request.getData());
        }
      });

      return requests;
    } catch (error) {
      logger.error('Error getting upcoming leaves', { error, organizationId, employeeId });
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des congés
   */
  async getLeaveStatistics(
    organizationId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<LeaveStatistics> {
    try {
      let query: Query = collections[this.collectionName]
        .where('organizationId', '==', organizationId);

      if (startDate) {
        query = query.where('startDate', '>=', startDate);
      }

      if (endDate) {
        query = query.where('endDate', '<=', endDate);
      }

      const snapshot = await query.get();
      
      let totalRequests = 0;
      let pendingRequests = 0;
      let approvedRequests = 0;
      let rejectedRequests = 0;
      let cancelledRequests = 0;
      const byType: Record<LeaveType, number> = {
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
      let totalDaysRequested = 0;
      let totalDaysApproved = 0;

      snapshot.forEach(doc => {
        const request = LeaveRequestModel.fromFirestore(doc);
        if (request) {
          const data = request.getData();
          totalRequests++;

          switch (data.status) {
            case LeaveStatus.PENDING:
              pendingRequests++;
              break;
            case LeaveStatus.APPROVED:
              approvedRequests++;
              totalDaysApproved += data.totalDays;
              break;
            case LeaveStatus.REJECTED:
              rejectedRequests++;
              break;
            case LeaveStatus.CANCELLED:
              cancelledRequests++;
              break;
          }

          byType[data.type]++;
          totalDaysRequested += data.totalDays;
        }
      });

      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        cancelledRequests,
        byType,
        totalDaysRequested,
        totalDaysApproved,
        averageRequestDuration: totalRequests > 0 ? totalDaysRequested / totalRequests : 0
      };
    } catch (error) {
      logger.error('Error getting leave statistics', { error, organizationId, startDate, endDate });
      throw error;
    }
  }

  /**
   * Vérifier les conflits de congés
   */
  private async checkLeaveConflicts(
    leaveRequest: LeaveRequestModel, 
    organizationId: string
  ): Promise<LeaveConflictInfo> {
    try {
      const query = collections[this.collectionName]
        .where('employeeId', '==', leaveRequest.employeeId)
        .where('organizationId', '==', organizationId)
        .where('status', 'in', [LeaveStatus.PENDING, LeaveStatus.APPROVED]);

      const snapshot = await query.get();
      const conflictingRequests: LeaveRequest[] = [];
      const overlappingDates: string[] = [];

      snapshot.forEach(doc => {
        const existingRequest = LeaveRequestModel.fromFirestore(doc);
        if (existingRequest && leaveRequest.overlapsWith(existingRequest)) {
          conflictingRequests.push(existingRequest.getData());
          
          // Calculer les dates qui se chevauchent
          const start = new Date(Math.max(
            new Date(leaveRequest.startDate).getTime(),
            new Date(existingRequest.startDate).getTime()
          ));
          const end = new Date(Math.min(
            new Date(leaveRequest.endDate).getTime(),
            new Date(existingRequest.endDate).getTime()
          ));

          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (!overlappingDates.includes(dateStr)) {
              overlappingDates.push(dateStr);
            }
          }
        }
      });

      return {
        hasConflict: conflictingRequests.length > 0,
        conflictingRequests,
        overlappingDates
      };
    } catch (error) {
      logger.error('Error checking leave conflicts', { error, employeeId: leaveRequest.employeeId });
      return {
        hasConflict: false,
        conflictingRequests: [],
        overlappingDates: []
      };
    }
  }

  /**
   * Vérifier le solde de congés
   */
  private async checkLeaveBalance(
    employee: Employee, 
    leaveType: LeaveType, 
    requestedDays: number
  ): Promise<LeaveBalanceInfo> {
    const currentBalance = employee.leaveBalances[leaveType] || 0;
    const remainingBalance = currentBalance - requestedDays;
    const canApprove = remainingBalance >= 0;

    return {
      leaveType,
      currentBalance,
      requestedDays,
      remainingBalance,
      canApprove
    };
  }

  /**
   * Déduire du solde de congés
   */
  private async deductLeaveBalance(employeeId: string, leaveType: LeaveType, days: number): Promise<void> {
    const employeeDoc = await collections[this.employeesCollection].doc(employeeId).get();
    const employee = EmployeeModel.fromFirestore(employeeDoc);

    if (employee) {
      employee.deductLeaveBalance(leaveType, days);
      await collections[this.employeesCollection].doc(employeeId).update(employee.toFirestore());
    }
  }

  /**
   * Restaurer le solde de congés
   */
  private async restoreLeaveBalance(employeeId: string, leaveType: LeaveType, days: number): Promise<void> {
    const employeeDoc = await collections[this.employeesCollection].doc(employeeId).get();
    const employee = EmployeeModel.fromFirestore(employeeDoc);

    if (employee) {
      employee.addLeaveBalance(leaveType, days);
      await collections[this.employeesCollection].doc(employeeId).update(employee.toFirestore());
    }
  }

  /**
   * Calculer le nombre de jours de congé
   */
  private calculateLeaveDays(startDate: string, endDate: string, isHalfDay: boolean): number {
    if (isHalfDay) {
      return 0.5;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    return daysDiff;
  }

  /**
   * Récupérer un employé par ID
   */
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
}

export const leaveService = new LeaveService();