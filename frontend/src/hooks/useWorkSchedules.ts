/**
 * Hook pour la gestion des horaires de travail
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';

// Types locaux pour les horaires
interface WorkDay {
  dayOfWeek: number; // 0 = dimanche, 1 = lundi, etc.
  isWorkingDay: boolean;
  startTime: string; // format HH:mm
  endTime: string;
  breakDuration?: number; // en minutes
}

interface WorkSchedule {
  id: string;
  name: string;
  organizationId: string;
  employeeId?: string;
  workDays: WorkDay[];
  timezone: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Service temporaire pour les horaires
const scheduleService = {
  listWorkSchedules: async (params: any) => ({ success: true, data: [] }),
  getEmployeeSchedule: async (employeeId: string) => ({ success: true, data: null }),
  createWorkSchedule: async (data: any) => ({ success: true, data: { id: Date.now().toString(), ...data } }),
  updateWorkSchedule: async (id: string, data: any) => ({ success: true, data: { id, ...data } }),
  deleteWorkSchedule: async (id: string) => ({ success: true }),
  assignScheduleToEmployees: async (scheduleId: string, employeeIds: string[]) => ({ success: true }),
  checkScheduleConflicts: async (data: any) => ({ success: true, data: [] })
};

interface CreateScheduleData {
  name: string;
  description?: string;
  type: 'fixed' | 'flexible';
  isActive: boolean;
  isDefault?: boolean;
  weeklyPattern: Record<string, WorkDay>;
  lateThresholdMinutes?: number;
  overtimeThresholdMinutes?: number;
  autoBreak?: boolean;
  exceptions?: Array<{
    date: string;
    isWorkDay: boolean;
    startTime?: string;
    endTime?: string;
    reason: string;
  }>;
  organizationId: string;
  assignedEmployees?: string[];
}

interface UpdateScheduleData extends Partial<CreateScheduleData> {}

interface ScheduleFilters {
  isActive?: boolean;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const useWorkSchedules = (organizationId?: string) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [employeeSchedule, setEmployeeSchedule] = useState<WorkSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false
  });

  const targetOrganizationId = organizationId || user?.organizationId;

  // Charger les horaires de travail
  const loadSchedules = useCallback(async (filters: ScheduleFilters = {}) => {
    if (!targetOrganizationId) return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        ...filters,
        organizationId: targetOrganizationId
      };

      const response = await scheduleService.listWorkSchedules(params);
      
      if (response.success) {
        setSchedules(response.data);
        setPagination(response.pagination || {
          total: response.data.length,
          page: 1,
          limit: 20,
          hasMore: false
        });
      } else {
        setError(response.error || 'Erreur lors du chargement des horaires');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load work schedules:', err);
    } finally {
      setLoading(false);
    }
  }, [targetOrganizationId]);

  // Charger l'horaire d'un employé spécifique
  const loadEmployeeSchedule = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleService.getEmployeeSchedule(employeeId);
      
      if (response.success) {
        setEmployeeSchedule(response.data);
      } else {
        setError(response.error || 'Erreur lors du chargement de l\'horaire');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to load employee schedule:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Créer un nouvel horaire
  const createSchedule = useCallback(async (data: CreateScheduleData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleService.createWorkSchedule(data);
      
      if (response.success) {
        // Ajouter le nouvel horaire à la liste
        setSchedules(prev => [response.data, ...prev]);
        return response;
      } else {
        setError(response.error || 'Erreur lors de la création de l\'horaire');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to create work schedule:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour un horaire
  const updateSchedule = useCallback(async (scheduleId: string, data: UpdateScheduleData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleService.updateWorkSchedule(scheduleId, data);
      
      if (response.success) {
        // Mettre à jour l'horaire dans la liste
        setSchedules(prev => 
          prev.map(schedule => 
            schedule.id === scheduleId ? response.data : schedule
          )
        );
        
        // Mettre à jour l'horaire employé si c'est le même
        if (employeeSchedule?.id === scheduleId) {
          setEmployeeSchedule(response.data);
        }
        
        return response;
      } else {
        setError(response.error || 'Erreur lors de la mise à jour');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to update work schedule:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, [employeeSchedule]);

  // Supprimer un horaire
  const deleteSchedule = useCallback(async (scheduleId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleService.deleteWorkSchedule(scheduleId);
      
      if (response.success) {
        // Supprimer l'horaire de la liste
        setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
        
        // Réinitialiser l'horaire employé si c'est le même
        if (employeeSchedule?.id === scheduleId) {
          setEmployeeSchedule(null);
        }
        
        return response;
      } else {
        setError(response.error || 'Erreur lors de la suppression');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to delete work schedule:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, [employeeSchedule]);

  // Assigner un horaire à des employés
  const assignScheduleToEmployees = useCallback(async (scheduleId: string, employeeIds: string[]) => {
    try {
      setLoading(true);
      setError(null);

      const response = await scheduleService.assignScheduleToEmployees(scheduleId, employeeIds);
      
      if (response.success) {
        // Mettre à jour l'horaire dans la liste
        setSchedules(prev => 
          prev.map(schedule => 
            schedule.id === scheduleId 
              ? { ...schedule, assignedEmployees: employeeIds }
              : schedule
          )
        );
        
        return response;
      } else {
        setError(response.error || 'Erreur lors de l\'assignation');
        return response;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Failed to assign schedule:', err);
      return { success: false, error: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Dupliquer un horaire
  const duplicateSchedule = useCallback(async (scheduleId: string, newName: string) => {
    const originalSchedule = schedules.find(s => s.id === scheduleId);
    if (!originalSchedule) {
      setError('Horaire introuvable');
      return { success: false, error: 'Horaire introuvable' };
    }

    const duplicateData: CreateScheduleData = {
      name: newName,
      description: `Copie de ${originalSchedule.name}`,
      type: originalSchedule.type,
      isActive: false, // Désactivé par défaut
      isDefault: false,
      weeklyPattern: originalSchedule.weeklyPattern || {},
      lateThresholdMinutes: originalSchedule.lateThresholdMinutes,
      overtimeThresholdMinutes: originalSchedule.overtimeThresholdMinutes,
      autoBreak: originalSchedule.autoBreak,
      exceptions: originalSchedule.exceptions,
      organizationId: targetOrganizationId!,
      assignedEmployees: []
    };

    return createSchedule(duplicateData);
  }, [schedules, targetOrganizationId, createSchedule]);

  // Obtenir l'horaire par défaut
  const getDefaultSchedule = useCallback(() => {
    return schedules.find(schedule => schedule.isDefault) || null;
  }, [schedules]);

  // Filtrer les horaires actifs
  const getActiveSchedules = useCallback(() => {
    return schedules.filter(schedule => schedule.isActive);
  }, [schedules]);

  // Calculer les heures totales d'un horaire
  const calculateWeeklyHours = useCallback((schedule: WorkSchedule) => {
    if (!schedule.weeklyPattern) return 0;
    
    return Object.values(schedule.weeklyPattern).reduce((total, day) => {
      if (day.isWorkDay && day.startTime && day.endTime) {
        const start = parseTime(day.startTime);
        const end = parseTime(day.endTime);
        const breakTime = day.breakDuration || 0;
        return total + (end - start) / 60 - breakTime / 60;
      }
      return total;
    }, 0);
  }, []);

  // Parser une heure au format HH:MM en minutes
  const parseTime = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Vérifier les conflits d'horaires
  const checkScheduleConflicts = useCallback(async (scheduleData: CreateScheduleData) => {
    try {
      const response = await scheduleService.checkScheduleConflicts(scheduleData);
      return response.success ? response.data : null;
    } catch (err) {
      console.error('Error checking schedule conflicts:', err);
      return null;
    }
  }, []);

  // Obtenir les statistiques des horaires
  const getScheduleStats = useCallback(() => {
    const stats = {
      total: schedules.length,
      active: schedules.filter(s => s.isActive).length,
      inactive: schedules.filter(s => !s.isActive).length,
      fixed: schedules.filter(s => s.type === 'fixed').length,
      flexible: schedules.filter(s => s.type === 'flexible').length,
      totalAssignedEmployees: schedules.reduce((sum, s) => sum + (s.assignedEmployees?.length || 0), 0),
      averageWeeklyHours: schedules.length > 0 
        ? schedules.reduce((sum, s) => sum + calculateWeeklyHours(s), 0) / schedules.length 
        : 0
    };

    return stats;
  }, [schedules, calculateWeeklyHours]);

  // Actualiser les données
  const refreshSchedules = useCallback((filters?: ScheduleFilters) => {
    loadSchedules(filters);
  }, [loadSchedules]);

  // Charger les données au montage
  useEffect(() => {
    if (targetOrganizationId) {
      loadSchedules();
    }
  }, [targetOrganizationId, loadSchedules]);

  return {
    schedules,
    employeeSchedule,
    loading,
    error,
    pagination,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    assignScheduleToEmployees,
    duplicateSchedule,
    loadEmployeeSchedule,
    getDefaultSchedule,
    getActiveSchedules,
    calculateWeeklyHours,
    checkScheduleConflicts,
    getScheduleStats,
    refreshSchedules,
    loadSchedules
  };
};