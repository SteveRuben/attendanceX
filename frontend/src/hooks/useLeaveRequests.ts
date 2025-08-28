/**
 * Hook pour la gestion des demandes de congé
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';

// Types locaux pour les congés
enum LeaveType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  OTHER = 'other'
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  organizationId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Service temporaire pour les congés
const leaveService = {
  listLeaveRequests: async (params: any) => ({ success: true, data: [] }),
  createLeaveRequest: async (data: any) => ({ success: true, data: { id: Date.now().toString(), ...data } }),
  updateLeaveRequest: async (id: string, data: any) => ({ success: true, data: { id, ...data } }),
  deleteLeaveRequest: async (id: string) => ({ success: true }),
  getLeaveBalances: async (employeeId: string) => ({ success: true, data: {} }),
  checkAvailability: async (data: any) => ({ success: true, data: { available: true } })
};

interface CreateLeaveRequestData {
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  daysRequested: number;
  employeeId: string;
  organizationId: string;
  status: 'pending';
}

interface UpdateLeaveRequestData {
  status?: 'approved' | 'rejected' | 'cancelled';
  managerNotes?: string;
  approverId?: string;
}

interface LeaveRequestFilters {
  status?: string;
  type?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const useLeaveRequests = (employeeId?: string) => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false
  });

  const targetEmployeeId = employeeId || user?.employeeId;

  // Charger les demandes de congé
  const loadLeaveRequests = useCallback(async (filters: LeaveRequestFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        employeeId: filters.employeeId || targetEmployeeId,
        organizationId: user?.organizationId
      };

      const response = await leaveService.listLeaveRequests(params);
      
      if (response.success) {
        setLeaveRequests(response.data);
        setPagination(response.pagination || {
          total: response.data.length,
          page: 1,
          limit: 20,
          hasMore: false
        });
      } else {
        setError(response.error || 'Erreur lors du chargement des demandes');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  }, [targetEmployeeId, user?.organizationId]);

  // Créer une demande de congé
  const createLeaveRequest = useCallback(async (data: CreateLeaveRequestData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await leaveService.createLeaveRequest(data);
      
      if (response.success) {
        // Ajouter la nouvelle demande à la liste
        setLeaveRequests(prev => [response.data, ...prev]);
        return response;
      } else {
        setError(response.error || 'Erreur lors de la création de la demande');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to create leave request:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour une demande de congé
  const updateLeaveRequest = useCallback(async (requestId: string, data: UpdateLeaveRequestData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await leaveService.updateLeaveRequest(requestId, data);
      
      if (response.success) {
        // Mettre à jour la demande dans la liste
        setLeaveRequests(prev => 
          prev.map(request => 
            request.id === requestId ? response.data : request
          )
        );
        return response;
      } else {
        setError(response.error || 'Erreur lors de la mise à jour');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to update leave request:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Approuver une demande de congé
  const approveLeaveRequest = useCallback(async (requestId: string, managerNotes?: string) => {
    return updateLeaveRequest(requestId, {
      status: 'approved',
      managerNotes,
      approverId: user?.uid
    });
  }, [updateLeaveRequest, user?.uid]);

  // Rejeter une demande de congé
  const rejectLeaveRequest = useCallback(async (requestId: string, managerNotes: string) => {
    return updateLeaveRequest(requestId, {
      status: 'rejected',
      managerNotes,
      approverId: user?.uid
    });
  }, [updateLeaveRequest, user?.uid]);

  // Annuler une demande de congé
  const cancelLeaveRequest = useCallback(async (requestId: string) => {
    return updateLeaveRequest(requestId, {
      status: 'cancelled'
    });
  }, [updateLeaveRequest]);

  // Supprimer une demande de congé
  const deleteLeaveRequest = useCallback(async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await leaveService.deleteLeaveRequest(requestId);
      
      if (response.success) {
        // Supprimer la demande de la liste
        setLeaveRequests(prev => prev.filter(request => request.id !== requestId));
        return response;
      } else {
        setError(response.error || 'Erreur lors de la suppression');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to delete leave request:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtenir les soldes de congés
  const getLeaveBalances = useCallback(async (employeeId?: string) => {
    try {
      const targetId = employeeId || targetEmployeeId;
      if (!targetId) return null;

      const response = await leaveService.getLeaveBalances(targetId);
      
      if (response.success) {
        return response.data;
      } else {
        console.error('Failed to get leave balances:', response.error);
        return null;
      }
    } catch (err) {
      console.error('Error getting leave balances:', err);
      return null;
    }
  }, [targetEmployeeId]);

  // Filtrer les demandes par statut
  const filterByStatus = useCallback((status: string) => {
    if (status === 'all') return leaveRequests;
    return leaveRequests.filter(request => request.status === status);
  }, [leaveRequests]);

  // Filtrer les demandes par type
  const filterByType = useCallback((type: string) => {
    if (type === 'all') return leaveRequests;
    return leaveRequests.filter(request => request.type === type);
  }, [leaveRequests]);

  // Obtenir les statistiques des congés
  const getLeaveStats = useCallback(() => {
    const stats = {
      total: leaveRequests.length,
      pending: leaveRequests.filter(r => r.status === 'pending').length,
      approved: leaveRequests.filter(r => r.status === 'approved').length,
      rejected: leaveRequests.filter(r => r.status === 'rejected').length,
      cancelled: leaveRequests.filter(r => r.status === 'cancelled').length,
      totalDaysRequested: leaveRequests.reduce((sum, r) => sum + (r.daysRequested || 0), 0),
      approvedDays: leaveRequests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + (r.daysRequested || 0), 0)
    };

    return stats;
  }, [leaveRequests]);

  // Vérifier si une période est disponible
  const checkAvailability = useCallback(async (startDate: Date, endDate: Date, excludeRequestId?: string) => {
    try {
      const response = await leaveService.checkAvailability({
        employeeId: targetEmployeeId!,
        startDate,
        endDate,
        excludeRequestId
      });
      
      return response.success ? response.data : null;
    } catch (err) {
      console.error('Error checking availability:', err);
      return null;
    }
  }, [targetEmployeeId]);

  // Actualiser les données
  const refresh = useCallback((filters?: LeaveRequestFilters) => {
    loadLeaveRequests(filters);
  }, [loadLeaveRequests]);

  // Charger les données au montage
  useEffect(() => {
    if (targetEmployeeId) {
      loadLeaveRequests();
    }
  }, [targetEmployeeId, loadLeaveRequests]);

  return {
    leaveRequests,
    loading,
    error,
    pagination,
    createLeaveRequest,
    updateLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest,
    deleteLeaveRequest,
    getLeaveBalances,
    filterByStatus,
    filterByType,
    getLeaveStats,
    checkAvailability,
    refresh,
    loadLeaveRequests
  };
};