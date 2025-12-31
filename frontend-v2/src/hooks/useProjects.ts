import { useState, useEffect, useCallback } from 'react'
import { 
  EventProject,
  ProjectTemplate,
  ProjectStatus,
  ProjectTeam,
  ProjectObjective,
  RegistrationForm
} from '@/types/project.types'
import ProjectService from '@/services/projectService'

interface UseProjectsState {
  projects: EventProject[]
  loading: boolean
  error: string | null
  total: number
  hasMore: boolean
}

interface UseProjectsActions {
  loadProjects: (options?: {
    page?: number
    limit?: number
    status?: ProjectStatus
    template?: ProjectTemplate
  }) => Promise<void>
  createProject: (data: {
    title: string
    description: string
    template: ProjectTemplate
    eventDetails: any
  }) => Promise<EventProject>
  updateProject: (id: string, data: Partial<EventProject>) => Promise<EventProject>
  deleteProject: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export const useProjects = (): UseProjectsState & UseProjectsActions => {
  const [state, setState] = useState<UseProjectsState>({
    projects: [],
    loading: false,
    error: null,
    total: 0,
    hasMore: false
  })

  const [currentOptions, setCurrentOptions] = useState<{
    page?: number
    limit?: number
    status?: ProjectStatus
    template?: ProjectTemplate
  }>({ page: 1, limit: 20 })

  const loadProjects = useCallback(async (options = {}) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      // Utiliser les options par défaut si aucune option n'est fournie
      const defaultOptions = { page: 1, limit: 20 }
      const mergedOptions = { ...defaultOptions, ...options }
      const response = await ProjectService.getProjects(mergedOptions)
      
      setState(prev => ({
        ...prev,
        projects: mergedOptions.page === 1 
          ? response.projects 
          : [...prev.projects, ...response.projects],
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
  }, []) // Pas de dépendances pour éviter les re-renders

  const createProject = useCallback(async (data: {
    title: string
    description: string
    template: ProjectTemplate
    eventDetails: any
  }): Promise<EventProject> => {
    const newProject = await ProjectService.createProject(data)
    
    setState(prev => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      total: prev.total + 1
    }))
    
    return newProject
  }, [])

  const updateProject = useCallback(async (
    id: string, 
    data: Partial<EventProject>
  ): Promise<EventProject> => {
    const updatedProject = await ProjectService.updateProject(id, data)
    
    setState(prev => ({
      ...prev,
      projects: prev.projects.map(project =>
        project.id === id ? updatedProject : project
      )
    }))
    
    return updatedProject
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    await ProjectService.deleteProject(id)
    
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(project => project.id !== id),
      total: prev.total - 1
    }))
  }, [])

  const refresh = useCallback(async () => {
    await loadProjects({ page: 1, limit: 20 })
  }, [loadProjects])

  // Chargement initial
  useEffect(() => {
    loadProjects()
  }, []) // Seulement au montage

  return {
    ...state,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    refresh
  }
}

// Hook pour un projet spécifique
export const useProject = (projectId?: string) => {
  const [project, setProject] = useState<EventProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await ProjectService.getProject(id)
      setProject(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProject = useCallback(async (data: Partial<EventProject>) => {
    if (!project) return null

    try {
      const updated = await ProjectService.updateProject(project.id, data)
      setProject(updated)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
      return null
    }
  }, [project])

  // Gestion des équipes
  const createTeam = useCallback(async (team: Omit<ProjectTeam, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!project) return null

    try {
      const newTeam = await ProjectService.createTeam(project.id, team)
      setProject(prev => prev ? {
        ...prev,
        teams: [...prev.teams, newTeam]
      } : null)
      return newTeam
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'équipe')
      return null
    }
  }, [project])

  const updateTeam = useCallback(async (teamId: string, updates: Partial<ProjectTeam>) => {
    if (!project) return null

    try {
      const updatedTeam = await ProjectService.updateTeam(project.id, teamId, updates)
      setProject(prev => prev ? {
        ...prev,
        teams: prev.teams.map(team => team.id === teamId ? updatedTeam : team)
      } : null)
      return updatedTeam
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'équipe')
      return null
    }
  }, [project])

  const deleteTeam = useCallback(async (teamId: string) => {
    if (!project) return

    try {
      await ProjectService.deleteTeam(project.id, teamId)
      setProject(prev => prev ? {
        ...prev,
        teams: prev.teams.filter(team => team.id !== teamId)
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'équipe')
    }
  }, [project])

  // Gestion des objectifs
  const createObjective = useCallback(async (objective: Omit<ProjectObjective, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!project) return null

    try {
      const newObjective = await ProjectService.createObjective(project.id, objective)
      setProject(prev => prev ? {
        ...prev,
        objectives: [...prev.objectives, newObjective]
      } : null)
      return newObjective
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'objectif')
      return null
    }
  }, [project])

  const updateObjective = useCallback(async (objectiveId: string, updates: Partial<ProjectObjective>) => {
    if (!project) return null

    try {
      const updatedObjective = await ProjectService.updateObjective(project.id, objectiveId, updates)
      setProject(prev => prev ? {
        ...prev,
        objectives: prev.objectives.map(obj => obj.id === objectiveId ? updatedObjective : obj)
      } : null)
      return updatedObjective
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'objectif')
      return null
    }
  }, [project])

  const deleteObjective = useCallback(async (objectiveId: string) => {
    if (!project) return

    try {
      await ProjectService.deleteObjective(project.id, objectiveId)
      setProject(prev => prev ? {
        ...prev,
        objectives: prev.objectives.filter(obj => obj.id !== objectiveId)
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'objectif')
    }
  }, [project])

  // Gestion du formulaire d'inscription
  const updateRegistrationForm = useCallback(async (form: RegistrationForm) => {
    if (!project) return null

    try {
      const updatedForm = await ProjectService.updateRegistrationForm(project.id, form)
      setProject(prev => prev ? {
        ...prev,
        registrationForm: updatedForm
      } : null)
      return updatedForm
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du formulaire')
      return null
    }
  }, [project])

  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId, loadProject])

  return {
    project,
    loading,
    error,
    loadProject,
    updateProject,
    createTeam,
    updateTeam,
    deleteTeam,
    createObjective,
    updateObjective,
    deleteObjective,
    updateRegistrationForm,
    refresh: () => project ? loadProject(project.id) : Promise.resolve()
  }
}