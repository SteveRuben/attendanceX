import { apiClient } from '@/services/apiClient'
import {
  EventProject,
  ProjectTemplate,
  ProjectTeam,
  ProjectObjective,
  RegistrationForm,
  ProjectStatus,
  ProjectPhase
} from '@/types/project.types'

export class ProjectService {
  /**
   * Créer un nouveau projet d'événement
   */
  static async createProject(data: {
    title: string
    description: string
    template: ProjectTemplate
    eventDetails: any
  }): Promise<EventProject> {
    const projectData = {
      title: data.title,
      description: data.description,
      template: data.template,
      eventDetails: {
        type: data.eventDetails.type,
        startDate: data.eventDetails.startDate,
        endDate: data.eventDetails.endDate,
        location: data.eventDetails.location,
        capacity: data.eventDetails.capacity,
        isPublic: data.eventDetails.isPublic,
        requiresRegistration: data.eventDetails.requiresRegistration,
        tags: data.eventDetails.tags || []
      }
    }

    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.post<any>('/projects', projectData, {
      withAuth: true,
      withToast: {
        loading: 'Création du projet...',
        success: 'Projet créé avec succès'
      }
    })

    return this.transformBackendProjectToFrontend(response)
  }

  /**
   * Obtenir un projet par ID
   */
  static async getProject(projectId: string): Promise<EventProject> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.get<any>(`/projects/${projectId}`, { withAuth: true })
    
    return this.transformBackendProjectToFrontend(response)
  }

  /**
   * Obtenir tous les projets
   */
  static async getProjects(options: {
    page?: number
    limit?: number
    status?: ProjectStatus
    template?: ProjectTemplate
  } = {}): Promise<{
    projects: EventProject[]
    total: number
    hasMore: boolean
  }> {
    try {
      const params = new URLSearchParams()
      if (options.page) params.set('page', String(options.page))
      if (options.limit) params.set('limit', String(options.limit))
      if (options.status) params.set('status', options.status)
      if (options.template) params.set('template', options.template)

      const query = params.toString()
      const endpoint = `/projects${query ? `?${query}` : ''}`
      
      // apiClient extracts data automatically and sends X-Tenant-ID header
      const response = await apiClient.get<any[]>(endpoint, { withAuth: true })

      // Protection contre les réponses undefined ou malformées
      if (!response || !Array.isArray(response)) {
        console.warn('API response is malformed:', response)
        return {
          projects: [],
          total: 0,
          hasMore: false
        }
      }

      const projects = response.map(project => this.transformBackendProjectToFrontend(project))
      const total = response.length // For now, use array length as total
      
      return {
        projects,
        total,
        hasMore: false // For now, no pagination
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      // Retourner une structure par défaut en cas d'erreur
      return {
        projects: [],
        total: 0,
        hasMore: false
      }
    }
  }

  /**
   * Mettre à jour un projet
   */
  static async updateProject(
    projectId: string,
    data: Partial<EventProject>
  ): Promise<EventProject> {
    // Transformer les données du projet pour l'API backend
    const updateData: any = {}
    
    if (data.title) updateData.title = data.title
    if (data.description) updateData.description = data.description
    if (data.status) updateData.status = data.status
    if (data.currentPhase) updateData.currentPhase = data.currentPhase
    if (data.eventDetails) updateData.eventDetails = data.eventDetails
    if (data.teams) updateData.teams = data.teams
    
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.put<any>(`/projects/${projectId}`, updateData, {
      withAuth: true,
      withToast: {
        loading: 'Mise à jour du projet...',
        success: 'Projet mis à jour'
      }
    })

    return this.transformBackendProjectToFrontend(response)
  }

  /**
   * Supprimer un projet
   */
  static async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}`, {
      withAuth: true,
      withToast: {
        loading: 'Suppression du projet...',
        success: 'Projet supprimé'
      }
    })
  }

  /**
   * Gestion des équipes
   */
  static async createTeam(projectId: string, team: Omit<ProjectTeam, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectTeam> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.post<any>(`/projects/${projectId}/teams`, team, { withAuth: true })

    return {
      id: response.id,
      name: response.name,
      description: response.description || '',
      color: response.color || '#3B82F6',
      members: response.members || [],
      leaderId: response.leaderId,
      objectives: response.objectives || [],
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    }
  }

  static async updateTeam(projectId: string, teamId: string, updates: Partial<ProjectTeam>): Promise<ProjectTeam> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.put<any>(`/projects/${projectId}/teams/${teamId}`, updates, { withAuth: true })

    return {
      id: response.id,
      name: response.name,
      description: response.description || '',
      color: response.color || '#3B82F6',
      members: response.members || [],
      leaderId: response.leaderId,
      objectives: response.objectives || [],
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    }
  }

  static async deleteTeam(projectId: string, teamId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/teams/${teamId}`, { withAuth: true })
  }

  /**
   * Gestion des objectifs
   */
  static async createObjective(projectId: string, objective: Omit<ProjectObjective, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectObjective> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.post<any>(`/projects/${projectId}/objectives`, objective, { withAuth: true })

    return {
      id: response.id,
      title: response.title,
      description: response.description || '',
      teamId: response.teamId,
      phase: response.phase as ProjectPhase || ProjectPhase.CONCEPTION,
      priority: response.priority || 'medium',
      status: response.status || 'pending',
      assignedTo: response.assignedTo || [],
      dueDate: response.dueDate,
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    }
  }

  static async updateObjective(projectId: string, objectiveId: string, updates: Partial<ProjectObjective>): Promise<ProjectObjective> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.put<any>(`/projects/${projectId}/objectives/${objectiveId}`, updates, { withAuth: true })

    return {
      id: response.id,
      title: response.title,
      description: response.description || '',
      teamId: response.teamId,
      phase: response.phase as ProjectPhase || ProjectPhase.CONCEPTION,
      priority: response.priority || 'medium',
      status: response.status || 'pending',
      assignedTo: response.assignedTo || [],
      dueDate: response.dueDate,
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    }
  }

  static async deleteObjective(projectId: string, objectiveId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/objectives/${objectiveId}`, { withAuth: true })
  }

  /**
   * Gestion du formulaire d'inscription
   */
  static async updateRegistrationForm(projectId: string, form: RegistrationForm): Promise<RegistrationForm> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.put<any>(`/projects/${projectId}/registration-form`, form, { withAuth: true })

    return {
      id: response.id,
      title: response.title,
      description: response.description || '',
      fields: response.fields || [],
      settings: response.settings || {
        isPublic: true,
        requiresApproval: false,
        allowMultipleSubmissions: false
      },
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    }
  }

  /**
   * Sauvegarder un formulaire du Form Builder
   */
  static async saveFormBuilderForm(projectId: string, form: any): Promise<any> {
    try {
      // Essayer de créer d'abord (POST)
      const response = await apiClient.post<any>(`/projects/${projectId}/registration-form`, form, { 
        withAuth: true,
        withToast: {
          loading: 'Sauvegarde du formulaire...',
          success: 'Formulaire sauvegardé avec succès'
        }
      })
      return response
    } catch (error: any) {
      // Si le formulaire existe déjà, faire une mise à jour (PUT)
      if (error.status === 409 || error.message?.includes('already exists')) {
        const response = await apiClient.put<any>(`/projects/${projectId}/registration-form`, form, { 
          withAuth: true,
          withToast: {
            loading: 'Mise à jour du formulaire...',
            success: 'Formulaire mis à jour avec succès'
          }
        })
        return response
      }
      throw error
    }
  }

  /**
   * Publier un formulaire du Form Builder
   */
  static async publishFormBuilderForm(projectId: string, form: any): Promise<any> {
    const publishedForm = {
      ...form,
      status: 'published',
      updatedAt: new Date().toISOString()
    }
    
    const response = await apiClient.put<any>(`/projects/${projectId}/registration-form`, publishedForm, { 
      withAuth: true,
      withToast: {
        loading: 'Publication du formulaire...',
        success: 'Formulaire publié avec succès'
      }
    })
    return response
  }

  static async createRegistrationForm(projectId: string, form: Omit<RegistrationForm, 'id' | 'createdAt' | 'updatedAt'>): Promise<RegistrationForm> {
    // apiClient extracts data automatically and sends X-Tenant-ID header
    const response = await apiClient.post<any>(`/projects/${projectId}/registration-form`, form, { withAuth: true })

    return {
      id: response.id,
      title: response.title,
      description: response.description || '',
      fields: response.fields || [],
      settings: response.settings || {
        isPublic: true,
        requiresApproval: false,
        allowMultipleSubmissions: false
      },
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    }
  }

  static async getRegistrationForm(projectId: string): Promise<RegistrationForm | null> {
    try {
      // apiClient extracts data automatically and sends X-Tenant-ID header
      const response = await apiClient.get<any>(`/projects/${projectId}/registration-form`, { withAuth: true })

      if (!response) {
        return null
      }

      return {
        id: response.id,
        title: response.title,
        description: response.description || '',
        fields: response.fields || [],
        settings: response.settings || {
          isPublic: true,
          requiresApproval: false,
          allowMultipleSubmissions: false
        },
        createdAt: response.createdAt || new Date().toISOString(),
        updatedAt: response.updatedAt || new Date().toISOString()
      }
    } catch (error) {
      return null
    }
  }

  static async deleteRegistrationForm(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/registration-form`, { withAuth: true })
  }

  /**
   * Changer la phase du projet
   */
  static async changePhase(projectId: string, newPhase: ProjectPhase): Promise<EventProject> {
    const project = await this.getProject(projectId)
    
    // Marquer la phase précédente comme complétée
    const completedPhases = [...project.workflow.completedPhases]
    if (!completedPhases.includes(project.currentPhase)) {
      completedPhases.push(project.currentPhase)
    }

    const updatedProject = {
      ...project,
      currentPhase: newPhase,
      workflow: {
        ...project.workflow,
        currentPhaseId: newPhase,
        completedPhases
      }
    }

    return await this.updateProject(projectId, updatedProject)
  }

  /**
   * Transformer un projet du backend vers le format frontend
   */
  private static transformBackendProjectToFrontend(backendProject: any): EventProject {
    return {
      id: backendProject.id,
      title: backendProject.title,
      description: backendProject.description || '',
      template: backendProject.template as ProjectTemplate || ProjectTemplate.CONFERENCE,
      status: this.mapBackendStatusToProjectStatus(backendProject.status),
      currentPhase: backendProject.currentPhase as ProjectPhase || ProjectPhase.CONCEPTION,
      
      eventDetails: {
        type: backendProject.eventDetails?.type || 'conference',
        startDate: backendProject.eventDetails?.startDate || new Date().toISOString(),
        endDate: backendProject.eventDetails?.endDate || new Date().toISOString(),
        location: backendProject.eventDetails?.location || { type: 'physical', name: 'TBD' },
        capacity: backendProject.eventDetails?.capacity || 100,
        isPublic: backendProject.eventDetails?.isPublic ?? true,
        requiresRegistration: backendProject.eventDetails?.requiresRegistration ?? false,
        tags: backendProject.eventDetails?.tags || []
      },
      
      teams: (backendProject.teams || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description || '',
        color: team.color || '#3B82F6',
        members: team.members || [],
        leaderId: team.leaderId,
        objectives: team.objectives || [],
        createdAt: team.createdAt || new Date().toISOString(),
        updatedAt: team.updatedAt || new Date().toISOString()
      })),
      
      objectives: backendProject.objectives?.map((obj: any) => ({
        id: obj.id,
        title: obj.title,
        description: obj.description || '',
        teamId: obj.teamId,
        phase: obj.phase as ProjectPhase || ProjectPhase.CONCEPTION,
        priority: obj.priority || 'medium',
        status: obj.status || 'pending',
        assignedTo: obj.assignedTo || [],
        dueDate: obj.dueDate,
        createdAt: obj.createdAt || new Date().toISOString(),
        updatedAt: obj.updatedAt || new Date().toISOString()
      })) || [],
      
      registrationForm: backendProject.registrationForm ? {
        id: backendProject.registrationForm.id,
        title: backendProject.registrationForm.title,
        description: backendProject.registrationForm.description || '',
        fields: backendProject.registrationForm.fields || [],
        settings: backendProject.registrationForm.settings || {
          isPublic: true,
          requiresApproval: false,
          allowMultipleSubmissions: false
        },
        createdAt: backendProject.registrationForm.createdAt || new Date().toISOString(),
        updatedAt: backendProject.registrationForm.updatedAt || new Date().toISOString()
      } : undefined,
      
      workflow: {
        phases: [],
        currentPhaseId: backendProject.currentPhase as ProjectPhase || ProjectPhase.CONCEPTION,
        completedPhases: []
      },
      
      templateConfig: {
        template: backendProject.template as ProjectTemplate || ProjectTemplate.CONFERENCE,
        customizations: {
          phases: [],
          teams: [],
          objectives: [],
          registrationFields: []
        }
      },
      
      createdBy: backendProject.createdBy,
      tenantId: backendProject.tenantId,
      createdAt: backendProject.createdAt || new Date().toISOString(),
      updatedAt: backendProject.updatedAt || new Date().toISOString()
    }
  }

  /**
   * Mapper le statut du backend vers le statut de projet frontend
   */
  private static mapBackendStatusToProjectStatus(backendStatus: string): ProjectStatus {
    const mapping: Record<string, ProjectStatus> = {
      'DRAFT': ProjectStatus.DRAFT,
      'PLANNING': ProjectStatus.PLANNING,
      'ACTIVE': ProjectStatus.EXECUTION,
      'COMPLETED': ProjectStatus.COMPLETED,
      'CANCELLED': ProjectStatus.CANCELLED
    }
    return mapping[backendStatus] || ProjectStatus.DRAFT
  }

  /**
   * Transformer un événement de l'API en projet
   */
  private static transformEventToProject(event: any): EventProject {
    // Extraire le template des tags
    const templateTag = event.tags?.find((tag: string) => tag.startsWith('template:'))
    const template = templateTag ? templateTag.replace('template:', '') as ProjectTemplate : ProjectTemplate.CONFERENCE

    // Données par défaut pour un nouveau projet
    const defaultProject: EventProject = {
      id: event.id,
      title: event.title,
      description: event.description,
      template,
      status: this.mapEventStatusToProjectStatus(event.status),
      currentPhase: ProjectPhase.CONCEPTION,
      
      eventDetails: {
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        capacity: event.capacity,
        isPublic: event.isPublic,
        requiresRegistration: event.requiresRegistration,
        tags: event.tags || []
      },
      
      teams: [],
      objectives: [],
      registrationForm: undefined,
      
      workflow: {
        phases: [],
        currentPhaseId: ProjectPhase.CONCEPTION,
        completedPhases: []
      },
      
      templateConfig: {
        template,
        customizations: {
          phases: [],
          teams: [],
          objectives: [],
          registrationFields: []
        }
      },
      
      createdBy: event.createdBy,
      tenantId: event.tenantId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }

    // Si l'événement a des métadonnées de projet, les utiliser
    if (event.projectData) {
      return {
        ...defaultProject,
        ...event.projectData
      }
    }

    return defaultProject
  }

  /**
   * Transformer un projet en données d'événement pour l'API
   */
  private static transformProjectToEvent(project: Partial<EventProject>): any {
    const eventData: any = {}

    if (project.title) eventData.title = project.title
    if (project.description) eventData.description = project.description
    if (project.eventDetails) {
      eventData.type = project.eventDetails.type
      eventData.startDate = project.eventDetails.startDate
      eventData.endDate = project.eventDetails.endDate
      eventData.location = project.eventDetails.location
      eventData.capacity = project.eventDetails.capacity
      eventData.isPublic = project.eventDetails.isPublic
      eventData.requiresRegistration = project.eventDetails.requiresRegistration
      eventData.tags = project.eventDetails.tags
    }

    // Stocker les données de projet dans les métadonnées
    eventData.projectData = {
      template: project.template,
      status: project.status,
      currentPhase: project.currentPhase,
      teams: project.teams,
      objectives: project.objectives,
      registrationForm: project.registrationForm,
      workflow: project.workflow,
      templateConfig: project.templateConfig
    }

    return eventData
  }

  /**
   * Mapper le statut d'événement vers le statut de projet
   */
  private static mapEventStatusToProjectStatus(eventStatus: string): ProjectStatus {
    const mapping: Record<string, ProjectStatus> = {
      'draft': ProjectStatus.DRAFT,
      'published': ProjectStatus.PLANNING,
      'active': ProjectStatus.EXECUTION,
      'completed': ProjectStatus.COMPLETED,
      'cancelled': ProjectStatus.CANCELLED
    }
    return mapping[eventStatus] || ProjectStatus.DRAFT
  }
}

export default ProjectService