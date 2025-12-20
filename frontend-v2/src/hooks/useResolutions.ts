import { useState, useEffect, useCallback } from 'react'
import { 
  Resolution, 
  ResolutionListOptions, 
  ResolutionListResponse,
  CreateResolutionRequest,
  UpdateResolutionRequest
} from '@/types/resolution.types'
import ResolutionService from '@/services/resolutionService'

interface UseResolutionsState {
  resolutions: Resolution[]
  loading: boolean
  error: string | null
  total: number
  hasMore: boolean
}

interface UseResolutionsActions {
  loadResolutions: (eventId: string, options?: ResolutionListOptions) => Promise<void>
  loadMore: () => Promise<void>
  createResolution: (eventId: string, data: CreateResolutionRequest) => Promise<Resolution>
  updateResolution: (id: string, data: UpdateResolutionRequest) => Promise<Resolution>
  deleteResolution: (id: string) => Promise<void>
  updateStatus: (id: string, status: string) => Promise<Resolution>
  updateProgress: (id: string, progress: number) => Promise<Resolution>
  addComment: (id: string, content: string) => Promise<Resolution>
  refresh: () => Promise<void>
}

export const useResolutions = (
  initialEventId?: string,
  initialOptions?: ResolutionListOptions
): UseResolutionsState & UseResolutionsActions => {
  const [state, setState] = useState<UseResolutionsState>({
    resolutions: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false
  })

  const [currentEventId, setCurrentEventId] = useState<string | undefined>(initialEventId)
  const [currentOptions, setCurrentOptions] = useState<ResolutionListOptions>(
    initialOptions || { limit: 20, offset: 0 }
  )

  const loadResolutions = useCallback(async (
    eventId: string, 
    options: ResolutionListOptions = {}
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const mergedOptions = { ...currentOptions, ...options }
      const response = await ResolutionService.getEventResolutions(eventId, mergedOptions)
      
      setState(prev => ({
        ...prev,
        resolutions: mergedOptions.offset === 0 
          ? response.resolutions 
          : [...prev.resolutions, ...response.resolutions],
        total: response.total,
        hasMore: response.hasMore,
        loading: false
      }))
      
      setCurrentEventId(eventId)
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
    if (!currentEventId || !state.hasMore || state.loading) return

    const nextOptions = {
      ...currentOptions,
      offset: (currentOptions.offset || 0) + (currentOptions.limit || 20)
    }

    await loadResolutions(currentEventId, nextOptions)
  }, [currentEventId, state.hasMore, state.loading, currentOptions, loadResolutions])

  const createResolution = useCallback(async (
    eventId: string, 
    data: CreateResolutionRequest
  ): Promise<Resolution> => {
    const newResolution = await ResolutionService.createResolution(eventId, data)
    
    setState(prev => ({
      ...prev,
      resolutions: [newResolution, ...prev.resolutions],
      total: prev.total + 1
    }))
    
    return newResolution
  }, [])

  const updateResolution = useCallback(async (
    id: string, 
    data: UpdateResolutionRequest
  ): Promise<Resolution> => {
    const updatedResolution = await ResolutionService.updateResolution(id, data)
    
    setState(prev => ({
      ...prev,
      resolutions: prev.resolutions.map(resolution =>
        resolution.id === id ? updatedResolution : resolution
      )
    }))
    
    return updatedResolution
  }, [])

  const deleteResolution = useCallback(async (id: string) => {
    await ResolutionService.deleteResolution(id)
    
    setState(prev => ({
      ...prev,
      resolutions: prev.resolutions.filter(resolution => resolution.id !== id),
      total: prev.total - 1
    }))
  }, [])

  const updateStatus = useCallback(async (id: string, status: string): Promise<Resolution> => {
    const updatedResolution = await ResolutionService.updateStatus(id, status)
    
    setState(prev => ({
      ...prev,
      resolutions: prev.resolutions.map(resolution =>
        resolution.id === id ? updatedResolution : resolution
      )
    }))
    
    return updatedResolution
  }, [])

  const updateProgress = useCallback(async (id: string, progress: number): Promise<Resolution> => {
    const updatedResolution = await ResolutionService.updateProgress(id, progress)
    
    setState(prev => ({
      ...prev,
      resolutions: prev.resolutions.map(resolution =>
        resolution.id === id ? updatedResolution : resolution
      )
    }))
    
    return updatedResolution
  }, [])

  const addComment = useCallback(async (id: string, content: string): Promise<Resolution> => {
    const updatedResolution = await ResolutionService.addComment(id, content)
    
    setState(prev => ({
      ...prev,
      resolutions: prev.resolutions.map(resolution =>
        resolution.id === id ? updatedResolution : resolution
      )
    }))
    
    return updatedResolution
  }, [])

  const refresh = useCallback(async () => {
    if (currentEventId) {
      await loadResolutions(currentEventId, { ...currentOptions, offset: 0 })
    }
  }, [currentEventId, currentOptions, loadResolutions])

  // Chargement initial
  useEffect(() => {
    if (initialEventId) {
      loadResolutions(initialEventId, initialOptions)
    }
  }, []) // Seulement au montage

  return {
    ...state,
    loadResolutions,
    loadMore,
    createResolution,
    updateResolution,
    deleteResolution,
    updateStatus,
    updateProgress,
    addComment,
    refresh
  }
}

// Hook pour une résolution spécifique
export const useResolution = (resolutionId?: string) => {
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadResolution = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await ResolutionService.getResolution(id)
      setResolution(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateResolution = useCallback(async (data: UpdateResolutionRequest) => {
    if (!resolution) return null

    try {
      const updated = await ResolutionService.updateResolution(resolution.id, data)
      setResolution(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
      return null
    }
  }, [resolution])

  useEffect(() => {
    if (resolutionId) {
      loadResolution(resolutionId)
    }
  }, [resolutionId, loadResolution])

  return {
    resolution,
    loading,
    error,
    loadResolution,
    updateResolution,
    refresh: () => resolution ? loadResolution(resolution.id) : Promise.resolve()
  }
}

// Hook pour les tâches personnelles
export const useMyTasks = (options?: ResolutionListOptions) => {
  const [state, setState] = useState<UseResolutionsState>({
    resolutions: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false
  })

  const loadTasks = useCallback(async (newOptions?: ResolutionListOptions) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const mergedOptions = { ...options, ...newOptions }
      const response = await ResolutionService.getMyTasks(mergedOptions)
      
      setState(prev => ({
        ...prev,
        resolutions: mergedOptions?.offset === 0 
          ? response.resolutions 
          : [...prev.resolutions, ...response.resolutions],
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
  }, []) // Retirer la dépendance 'options' qui cause la boucle

  const updateTask = useCallback(async (id: string, data: UpdateResolutionRequest) => {
    const updated = await ResolutionService.updateResolution(id, data)
    
    setState(prev => ({
      ...prev,
      resolutions: prev.resolutions.map(task =>
        task.id === id ? updated : task
      )
    }))
    
    return updated
  }, [])

  useEffect(() => {
    loadTasks(options) // Passer les options directement
  }, []) // Seulement au montage

  return {
    ...state,
    loadTasks,
    updateTask,
    refresh: () => loadTasks({ offset: 0 })
  }
}