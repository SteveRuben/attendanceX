import { apiClient } from '@/services/apiClient'
import { apiCache } from '@/utils/debounce'
import {
  Timesheet,
  TimeEntry,
  Project,
  ActivityCode,
  TimesheetListOptions,
  TimesheetListResponse,
  TimeEntryListOptions,
  TimeEntryListResponse,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  CreateProjectRequest,
  CreateActivityCodeRequest,
  TimesheetStats
} from '@/types/timesheet.types'

class TimesheetService {
  /**
   * Obtenir les feuilles de temps
   */
  static async getTimesheets(options: TimesheetListOptions = {}): Promise<TimesheetListResponse> {
    try {
      const params = new URLSearchParams()
      
      if (options.limit) params.set('limit', String(options.limit))
      if (options.offset) params.set('offset', String(options.offset))
      if (options.sortBy) params.set('sortBy', options.sortBy)
      if (options.sortOrder) params.set('sortOrder', options.sortOrder)
      
      if (options.filters) {
        if (options.filters.status) params.set('status', options.filters.status)
        if (options.filters.startDate) params.set('startDate', options.filters.startDate)
        if (options.filters.endDate) params.set('endDate', options.filters.endDate)
        if (options.filters.employeeId) params.set('employeeId', options.filters.employeeId)
        if (options.filters.projectId) params.set('projectId', options.filters.projectId)
      }

      const response = await apiClient.get<{ data: TimesheetListResponse }>(
        `/timesheets?${params.toString()}`
      )
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getTimesheets, retour de données vides:', error)
      return {
        timesheets: [],
        total: 0,
        hasMore: false
      }
    }
  }

  /**
   * Obtenir les feuilles de temps de l'utilisateur connecté
   */
  static async getMyTimesheets(options: TimesheetListOptions = {}): Promise<TimesheetListResponse> {
    try {
      // Créer une clé de cache basée sur les options
      const cacheKey = `my-timesheets-${JSON.stringify(options)}`
      
      // Vérifier le cache
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const params = new URLSearchParams()
      
      if (options.limit) params.set('limit', String(options.limit))
      if (options.offset) params.set('offset', String(options.offset))
      if (options.sortBy) params.set('sortBy', options.sortBy)
      if (options.sortOrder) params.set('sortOrder', options.sortOrder)
      
      if (options.filters) {
        if (options.filters.status) params.set('status', options.filters.status)
        if (options.filters.startDate) params.set('startDate', options.filters.startDate)
        if (options.filters.endDate) params.set('endDate', options.filters.endDate)
        if (options.filters.projectId) params.set('projectId', options.filters.projectId)
      }

      const response = await apiClient.get<{ data: TimesheetListResponse }>(
        `/timesheets/my-timesheets?${params.toString()}`
      )
      
      // Mettre en cache le résultat
      apiCache.set(cacheKey, response.data)
      
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getMyTimesheets, retour de données vides:', error)
      return {
        timesheets: [],
        total: 0,
        hasMore: false
      }
    }
  }

  /**
   * Obtenir une feuille de temps par ID
   */
  static async getTimesheet(id: string): Promise<Timesheet> {
    const response = await apiClient.get<{ data: Timesheet }>(`/timesheets/${id}`)
    return response.data
  }

  /**
   * Créer une nouvelle feuille de temps
   */
  static async createTimesheet(data: {
    periodStart: string
    periodEnd: string
  }): Promise<Timesheet> {
    const response = await apiClient.post<{ data: Timesheet }>('/timesheets', data)
    return response.data
  }

  /**
   * Soumettre une feuille de temps
   */
  static async submitTimesheet(id: string): Promise<Timesheet> {
    const response = await apiClient.post<{ data: Timesheet }>(`/timesheets/${id}/submit`)
    return response.data
  }

  /**
   * Approuver une feuille de temps
   */
  static async approveTimesheet(id: string): Promise<Timesheet> {
    const response = await apiClient.post<{ data: Timesheet }>(`/timesheets/${id}/approve`)
    return response.data
  }

  /**
   * Rejeter une feuille de temps
   */
  static async rejectTimesheet(id: string, reason: string): Promise<Timesheet> {
    const response = await apiClient.post<{ data: Timesheet }>(`/timesheets/${id}/reject`, {
      reason
    })
    return response.data
  }

  /**
   * Obtenir les entrées de temps d'une feuille de temps
   */
  static async getTimesheetEntries(
    timesheetId: string,
    options: TimeEntryListOptions = {}
  ): Promise<TimeEntryListResponse> {
    try {
      const params = new URLSearchParams()
      
      if (options.limit) params.set('limit', String(options.limit))
      if (options.offset) params.set('offset', String(options.offset))
      if (options.sortBy) params.set('sortBy', options.sortBy)
      if (options.sortOrder) params.set('sortOrder', options.sortOrder)

      const response = await apiClient.get<{ data: TimeEntryListResponse }>(
        `/timesheets/${timesheetId}/entries?${params.toString()}`
      )
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getTimesheetEntries, retour de données vides:', error)
      return {
        timeEntries: [],
        total: 0,
        hasMore: false
      }
    }
  }

  /**
   * Créer une entrée de temps
   */
  static async createTimeEntry(
    timesheetId: string,
    data: CreateTimeEntryRequest
  ): Promise<TimeEntry> {
    const response = await apiClient.post<{ data: TimeEntry }>(
      `/timesheets/${timesheetId}/entries`,
      data
    )
    return response.data
  }

  /**
   * Mettre à jour une entrée de temps
   */
  static async updateTimeEntry(
    timesheetId: string,
    entryId: string,
    data: UpdateTimeEntryRequest
  ): Promise<TimeEntry> {
    const response = await apiClient.put<{ data: TimeEntry }>(
      `/timesheets/${timesheetId}/entries/${entryId}`,
      data
    )
    return response.data
  }

  /**
   * Supprimer une entrée de temps
   */
  static async deleteTimeEntry(timesheetId: string, entryId: string): Promise<void> {
    await apiClient.delete(`/timesheets/${timesheetId}/entries/${entryId}`)
  }

  /**
   * Obtenir les projets
   */
  static async getProjects(): Promise<Project[]> {
    try {
      const response = await apiClient.get<{ data: Project[] }>('/projects')
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getProjects, retour de données vides:', error)
      return []
    }
  }

  /**
   * Créer un projet
   */
  static async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await apiClient.post<{ data: Project }>('/projects', data)
    return response.data
  }

  /**
   * Obtenir les codes d'activité
   */
  static async getActivityCodes(): Promise<ActivityCode[]> {
    try {
      const response = await apiClient.get<{ data: ActivityCode[] }>('/activity-codes')
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getActivityCodes, retour de données vides:', error)
      return []
    }
  }

  /**
   * Créer un code d'activité
   */
  static async createActivityCode(data: CreateActivityCodeRequest): Promise<ActivityCode> {
    const response = await apiClient.post<{ data: ActivityCode }>('/activity-codes', data)
    return response.data
  }

  /**
   * Obtenir les statistiques des feuilles de temps
   */
  static async getTimesheetStats(
    startDate?: string,
    endDate?: string
  ): Promise<TimesheetStats> {
    try {
      // Créer une clé de cache basée sur les paramètres
      const cacheKey = `timesheet-stats-${startDate || 'none'}-${endDate || 'none'}`
      
      // Vérifier le cache
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const response = await apiClient.get<{ data: TimesheetStats }>(
        `/timesheets/stats?${params.toString()}`
      )
      
      // Mettre en cache le résultat
      apiCache.set(cacheKey, response.data)
      
      return response.data
    } catch (error) {
      console.warn('API non disponible pour getTimesheetStats, retour de données vides:', error)
      return {
        totalTimesheets: 0,
        byStatus: {
          draft: 0,
          submitted: 0,
          under_review: 0,
          approved: 0,
          rejected: 0,
          locked: 0
        },
        totalHours: 0,
        totalBillableHours: 0,
        totalCost: 0,
        averageHoursPerTimesheet: 0,
        billablePercentage: 0
      }
    }
  }

  /**
   * Créer une session de travail depuis une tâche accomplie
   */
  static async createSessionFromTask(data: {
    resolutionId: string
    date: string
    duration: number // en minutes
    description?: string
    projectId?: string
    activityCodeId?: string
  }): Promise<TimeEntry> {
    const response = await apiClient.post<{ data: TimeEntry }>(
      '/time-entries/from-task',
      data
    )
    return response.data
  }
}

export default TimesheetService