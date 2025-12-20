import { useState, useEffect, useCallback } from 'react'
import TimesheetService from '@/services/timesheetService'
import {
  Timesheet,
  TimeEntry,
  Project,
  ActivityCode,
  TimesheetListOptions,
  TimeEntryListOptions,
  CreateTimeEntryRequest,
  UpdateTimeEntryRequest,
  TimesheetStats
} from '@/types/timesheet.types'

interface UseTimesheetsState {
  timesheets: Timesheet[]
  loading: boolean
  error: string | null
  total: number
  hasMore: boolean
}

interface UseTimesheetsActions {
  loadTimesheets: (options?: TimesheetListOptions) => Promise<void>
  loadMore: () => Promise<void>
  createTimesheet: (data: { periodStart: string; periodEnd: string }) => Promise<Timesheet>
  submitTimesheet: (id: string) => Promise<Timesheet>
  approveTimesheet: (id: string) => Promise<Timesheet>
  rejectTimesheet: (id: string, reason: string) => Promise<Timesheet>
  refresh: () => Promise<void>
}

export const useTimesheets = (
  initialOptions?: TimesheetListOptions
): UseTimesheetsState & UseTimesheetsActions => {
  const [state, setState] = useState<UseTimesheetsState>({
    timesheets: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false
  })

  const [currentOptions, setCurrentOptions] = useState<TimesheetListOptions>(
    initialOptions || { limit: 20, offset: 0 }
  )

  const loadTimesheets = useCallback(async (options: TimesheetListOptions = {}) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const mergedOptions = { ...currentOptions, ...options }
      const response = await TimesheetService.getTimesheets(mergedOptions)
      
      setState(prev => ({
        ...prev,
        timesheets: mergedOptions.offset === 0 
          ? response.timesheets 
          : [...prev.timesheets, ...response.timesheets],
        total: response.total,
        hasMore: response.hasMore,
        loading: false
      }))
      
      setCurrentOptions(mergedOptions)
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors du chargement',
        loading: false
      }))
    }
  }, [currentOptions])

  const loadMore = useCallback(async () => {
    if (!state.hasMore || state.loading) return

    const nextOptions = {
      ...currentOptions,
      offset: (currentOptions.offset || 0) + (currentOptions.limit || 20)
    }

    await loadTimesheets(nextOptions)
  }, [state.hasMore, state.loading, currentOptions, loadTimesheets])

  const createTimesheet = useCallback(async (data: { periodStart: string; periodEnd: string }): Promise<Timesheet> => {
    const newTimesheet = await TimesheetService.createTimesheet(data)
    
    setState(prev => ({
      ...prev,
      timesheets: [newTimesheet, ...prev.timesheets],
      total: prev.total + 1
    }))
    
    return newTimesheet
  }, [])

  const submitTimesheet = useCallback(async (id: string): Promise<Timesheet> => {
    const updatedTimesheet = await TimesheetService.submitTimesheet(id)
    
    setState(prev => ({
      ...prev,
      timesheets: prev.timesheets.map(timesheet =>
        timesheet.id === id ? updatedTimesheet : timesheet
      )
    }))
    
    return updatedTimesheet
  }, [])

  const approveTimesheet = useCallback(async (id: string): Promise<Timesheet> => {
    const updatedTimesheet = await TimesheetService.approveTimesheet(id)
    
    setState(prev => ({
      ...prev,
      timesheets: prev.timesheets.map(timesheet =>
        timesheet.id === id ? updatedTimesheet : timesheet
      )
    }))
    
    return updatedTimesheet
  }, [])

  const rejectTimesheet = useCallback(async (id: string, reason: string): Promise<Timesheet> => {
    const updatedTimesheet = await TimesheetService.rejectTimesheet(id, reason)
    
    setState(prev => ({
      ...prev,
      timesheets: prev.timesheets.map(timesheet =>
        timesheet.id === id ? updatedTimesheet : timesheet
      )
    }))
    
    return updatedTimesheet
  }, [])

  const refresh = useCallback(async () => {
    await loadTimesheets({ ...currentOptions, offset: 0 })
  }, [currentOptions, loadTimesheets])

  // Chargement initial
  useEffect(() => {
    if (initialOptions) {
      loadTimesheets(initialOptions)
    }
  }, []) // Seulement au montage

  return {
    ...state,
    loadTimesheets,
    loadMore,
    createTimesheet,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet,
    refresh
  }
}

// Hook pour les feuilles de temps de l'utilisateur connecté
export const useMyTimesheets = (options?: TimesheetListOptions) => {
  const [state, setState] = useState<UseTimesheetsState>({
    timesheets: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false
  })

  const loadMyTimesheets = useCallback(async (newOptions?: TimesheetListOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const mergedOptions = { ...options, ...newOptions }
      const response = await TimesheetService.getMyTimesheets(mergedOptions)
      
      setState(prev => ({
        ...prev,
        timesheets: mergedOptions?.offset === 0 
          ? response.timesheets 
          : [...prev.timesheets, ...response.timesheets],
        total: response.total,
        hasMore: response.hasMore,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors du chargement',
        loading: false
      }))
    }
  }, []) // Retirer la dépendance 'options'

  useEffect(() => {
    loadMyTimesheets(options) // Passer les options directement
  }, []) // Seulement au montage

  return {
    ...state,
    loadMyTimesheets,
    refresh: () => loadMyTimesheets({ offset: 0 })
  }
}

// Hook pour une feuille de temps spécifique
export const useTimesheet = (timesheetId?: string) => {
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTimesheet = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await TimesheetService.getTimesheet(id)
      setTimesheet(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timesheetId) {
      loadTimesheet(timesheetId)
    }
  }, [timesheetId, loadTimesheet])

  return {
    timesheet,
    loading,
    error,
    loadTimesheet,
    refresh: () => timesheet ? loadTimesheet(timesheet.id) : Promise.resolve()
  }
}

// Hook pour les entrées de temps d'une feuille de temps
export const useTimeEntries = (timesheetId: string, options?: TimeEntryListOptions) => {
  const [state, setState] = useState<{
    timeEntries: TimeEntry[]
    loading: boolean
    error: string | null
    total: number
    hasMore: boolean
  }>({
    timeEntries: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false
  })

  const loadTimeEntries = useCallback(async (newOptions?: TimeEntryListOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const mergedOptions = { ...options, ...newOptions }
      const response = await TimesheetService.getTimesheetEntries(timesheetId, mergedOptions)
      
      setState(prev => ({
        ...prev,
        timeEntries: mergedOptions?.offset === 0 
          ? response.timeEntries 
          : [...prev.timeEntries, ...response.timeEntries],
        total: response.total,
        hasMore: response.hasMore,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur lors du chargement',
        loading: false
      }))
    }
  }, [timesheetId, options])

  const createTimeEntry = useCallback(async (data: CreateTimeEntryRequest) => {
    const newEntry = await TimesheetService.createTimeEntry(timesheetId, data)
    
    setState(prev => ({
      ...prev,
      timeEntries: [newEntry, ...prev.timeEntries],
      total: prev.total + 1
    }))
    
    return newEntry
  }, [timesheetId])

  const updateTimeEntry = useCallback(async (entryId: string, data: UpdateTimeEntryRequest) => {
    const updatedEntry = await TimesheetService.updateTimeEntry(timesheetId, entryId, data)
    
    setState(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.map(entry =>
        entry.id === entryId ? updatedEntry : entry
      )
    }))
    
    return updatedEntry
  }, [timesheetId])

  const deleteTimeEntry = useCallback(async (entryId: string) => {
    await TimesheetService.deleteTimeEntry(timesheetId, entryId)
    
    setState(prev => ({
      ...prev,
      timeEntries: prev.timeEntries.filter(entry => entry.id !== entryId),
      total: prev.total - 1
    }))
  }, [timesheetId])

  useEffect(() => {
    if (timesheetId) {
      loadTimeEntries()
    }
  }, [timesheetId, loadTimeEntries])

  return {
    ...state,
    loadTimeEntries,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    refresh: () => loadTimeEntries({ offset: 0 })
  }
}

// Hook pour les projets
export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await TimesheetService.getProjects()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    loading,
    error,
    loadProjects,
    refresh: loadProjects
  }
}

// Hook pour les codes d'activité
export const useActivityCodes = () => {
  const [activityCodes, setActivityCodes] = useState<ActivityCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadActivityCodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await TimesheetService.getActivityCodes()
      setActivityCodes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadActivityCodes()
  }, [loadActivityCodes])

  return {
    activityCodes,
    loading,
    error,
    loadActivityCodes,
    refresh: loadActivityCodes
  }
}

// Hook pour les statistiques
export const useTimesheetStats = (startDate?: string, endDate?: string) => {
  const [stats, setStats] = useState<TimesheetStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await TimesheetService.getTimesheetStats(startDate, endDate)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, []) // Retirer les dépendances startDate et endDate

  useEffect(() => {
    loadStats()
  }, [startDate, endDate]) // Garder les dépendances ici pour re-charger quand les dates changent

  return {
    stats,
    loading,
    error,
    loadStats,
    refresh: loadStats
  }
}