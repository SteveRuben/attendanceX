import { getFirestore } from 'firebase-admin/firestore'
import { 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  ProjectListOptions,
  ProjectStatus,
  ProjectPhase
} from '../../types/project.types'
import { ValidationError, NotFoundError } from '../../utils/common/errors'

// Define a simple Project interface for our service
interface SimpleProject {
  id: string
  tenantId: string
  title: string
  description: string
  status: ProjectStatus
  currentPhase: ProjectPhase
  template: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  eventDetails: {
    type: string
    startDate: Date
    endDate: Date
    location: {
      type: 'physical' | 'virtual' | 'hybrid'
      name?: string
    }
    capacity?: number
    isPublic: boolean
    requiresRegistration: boolean
    tags: string[]
  }
  teams: any[]
  objectives: any[]
  registrationForm: any
}

const db = getFirestore()

/**
 * Simple Project Service for basic CRUD operations
 * Avoids conflicts with existing timesheet project system
 */
export class SimpleProjectService {
  
  /**
   * Create a new project
   */
  static async createProject(
    projectData: CreateProjectRequest, 
    userId: string, 
    tenantId: string
  ): Promise<SimpleProject> {
    try {
      // Basic validation
      if (!projectData.title?.trim()) {
        throw new ValidationError('Project title is required')
      }

      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc()
      
      const project: SimpleProject = {
        id: projectRef.id,
        tenantId,
        title: projectData.title.trim(),
        description: projectData.description || '',
        status: 'DRAFT' as ProjectStatus,
        currentPhase: 'PLANNING' as ProjectPhase,
        template: projectData.template || 'custom',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        eventDetails: {
          type: projectData.eventDetails?.type || 'conference',
          startDate: projectData.eventDetails?.startDate || new Date(),
          endDate: projectData.eventDetails?.endDate || new Date(),
          location: projectData.eventDetails?.location || {
            type: 'physical',
            name: 'TBD'
          },
          capacity: projectData.eventDetails?.capacity || 100,
          isPublic: projectData.eventDetails?.isPublic ?? true,
          requiresRegistration: projectData.eventDetails?.requiresRegistration ?? false,
          tags: projectData.eventDetails?.tags || []
        },
        teams: [],
        objectives: [],
        registrationForm: null
      }

      await projectRef.set(project)
      return project
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    }
  }

  /**
   * Get project by ID
   */
  static async getProjectById(
    projectId: string, 
    userId: string, 
    tenantId: string
  ): Promise<SimpleProject> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      return { id: doc.id, ...doc.data() } as SimpleProject
    } catch (error) {
      console.error('Error getting project:', error)
      throw error
    }
  }

  /**
   * Get projects list with basic filtering
   */
  static async getProjects(
    options: ProjectListOptions, 
    userId: string, 
    tenantId: string
  ): Promise<{ projects: SimpleProject[]; pagination: any }> {
    try {
      let query = db.collection('tenants').doc(tenantId).collection('projects')
        .orderBy('createdAt', 'desc')

      // Apply basic filters
      if (options.status) {
        query = query.where('status', '==', options.status)
      }

      // Apply pagination
      const limit = Math.min(options.limit || 20, 100)
      query = query.limit(limit)

      if (options.page && options.page > 1) {
        // Note: Firestore doesn't support offset, so we'll use a simple approach
        // In production, you'd want to use cursor-based pagination
      }

      const snapshot = await query.get()
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimpleProject[]

      return {
        projects,
        pagination: {
          page: options.page || 1,
          limit,
          total: projects.length,
          totalPages: 1
        }
      }
    } catch (error) {
      console.error('Error getting projects:', error)
      throw error
    }
  }

  /**
   * Update project
   */
  static async updateProject(
    projectId: string,
    updates: UpdateProjectRequest,
    userId: string,
    tenantId: string
  ): Promise<SimpleProject> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      }

      await projectRef.update(updateData)
      
      const updatedDoc = await projectRef.get()
      return { id: updatedDoc.id, ...updatedDoc.data() } as SimpleProject
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  /**
   * Delete project
   */
  static async deleteProject(
    projectId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      await projectRef.delete()
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(tenantId: string, userId: string): Promise<any> {
    try {
      const projectsRef = db.collection('tenants').doc(tenantId).collection('projects')
      
      // Get counts by status
      const [draftSnapshot, activeSnapshot, completedSnapshot] = await Promise.all([
        projectsRef.where('status', '==', 'DRAFT').get(),
        projectsRef.where('status', '==', 'ACTIVE').get(),
        projectsRef.where('status', '==', 'COMPLETED').get()
      ])

      return {
        total: draftSnapshot.size + activeSnapshot.size + completedSnapshot.size,
        draft: draftSnapshot.size,
        active: activeSnapshot.size,
        completed: completedSnapshot.size
      }
    } catch (error) {
      console.error('Error getting project stats:', error)
      throw error
    }
  }

  /**
   * Get available project templates
   */
  static async getProjectTemplates(): Promise<any> {
    try {
      // Return static templates for now
      return {
        conference: {
          name: 'Conference',
          description: 'Multi-day conference with sessions and networking',
          phases: ['planning', 'preparation', 'execution', 'follow-up'],
          defaultObjectives: [
            'Secure venue',
            'Confirm speakers',
            'Setup registration',
            'Manage logistics'
          ]
        },
        workshop: {
          name: 'Workshop',
          description: 'Interactive learning session',
          phases: ['planning', 'preparation', 'execution'],
          defaultObjectives: [
            'Define learning objectives',
            'Prepare materials',
            'Setup venue',
            'Facilitate session'
          ]
        },
        meeting: {
          name: 'Meeting',
          description: 'Regular team or business meeting',
          phases: ['planning', 'execution'],
          defaultObjectives: [
            'Set agenda',
            'Invite participants',
            'Prepare materials',
            'Conduct meeting'
          ]
        },
        custom: {
          name: 'Custom',
          description: 'Create your own project structure',
          phases: ['planning', 'execution'],
          defaultObjectives: []
        }
      }
    } catch (error) {
      console.error('Error getting project templates:', error)
      throw error
    }
  }

  // ===== TEAM MANAGEMENT METHODS =====

  /**
   * Add team to project
   */
  static async addTeam(
    projectId: string,
    teamData: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const teamId = db.collection('temp').doc().id // Generate unique ID

      const team = {
        id: teamId,
        name: teamData.name || 'New Team',
        description: teamData.description || '',
        color: teamData.color || '#3B82F6',
        members: teamData.members || [],
        leaderId: teamData.leaderId || userId,
        objectives: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedTeams = [...(project.teams || []), team]
      await projectRef.update({ 
        teams: updatedTeams,
        updatedAt: new Date()
      })

      return team
    } catch (error) {
      console.error('Error adding team:', error)
      throw error
    }
  }

  /**
   * Get project teams
   */
  static async getTeams(
    projectId: string,
    userId: string,
    tenantId: string
  ): Promise<any[]> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      return project.teams || []
    } catch (error) {
      console.error('Error getting teams:', error)
      throw error
    }
  }

  /**
   * Update team
   */
  static async updateTeam(
    projectId: string,
    teamId: string,
    updates: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const teams = project.teams || []
      const teamIndex = teams.findIndex(t => t.id === teamId)

      if (teamIndex === -1) {
        throw new NotFoundError('Team not found')
      }

      const updatedTeam = {
        ...teams[teamIndex],
        ...updates,
        updatedAt: new Date()
      }

      teams[teamIndex] = updatedTeam
      await projectRef.update({ 
        teams: teams,
        updatedAt: new Date()
      })

      return updatedTeam
    } catch (error) {
      console.error('Error updating team:', error)
      throw error
    }
  }

  /**
   * Remove team from project
   */
  static async removeTeam(
    projectId: string,
    teamId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const teams = project.teams || []
      const filteredTeams = teams.filter(t => t.id !== teamId)

      await projectRef.update({ 
        teams: filteredTeams,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error removing team:', error)
      throw error
    }
  }

  // ===== OBJECTIVE MANAGEMENT METHODS =====

  /**
   * Add objective to project
   */
  static async addObjective(
    projectId: string,
    objectiveData: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const objectiveId = db.collection('temp').doc().id // Generate unique ID

      const objective = {
        id: objectiveId,
        title: objectiveData.title || 'New Objective',
        description: objectiveData.description || '',
        teamId: objectiveData.teamId || null,
        phase: objectiveData.phase || 'planning',
        priority: objectiveData.priority || 'medium',
        status: objectiveData.status || 'pending',
        assignedTo: objectiveData.assignedTo || [],
        dueDate: objectiveData.dueDate || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedObjectives = [...(project.objectives || []), objective]
      await projectRef.update({ 
        objectives: updatedObjectives,
        updatedAt: new Date()
      })

      return objective
    } catch (error) {
      console.error('Error adding objective:', error)
      throw error
    }
  }

  /**
   * Get project objectives
   */
  static async getObjectives(
    projectId: string,
    userId: string,
    tenantId: string
  ): Promise<any[]> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      return project.objectives || []
    } catch (error) {
      console.error('Error getting objectives:', error)
      throw error
    }
  }

  /**
   * Update objective
   */
  static async updateObjective(
    projectId: string,
    objectiveId: string,
    updates: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const objectives = project.objectives || []
      const objectiveIndex = objectives.findIndex(o => o.id === objectiveId)

      if (objectiveIndex === -1) {
        throw new NotFoundError('Objective not found')
      }

      const updatedObjective = {
        ...objectives[objectiveIndex],
        ...updates,
        updatedAt: new Date()
      }

      objectives[objectiveIndex] = updatedObjective
      await projectRef.update({ 
        objectives: objectives,
        updatedAt: new Date()
      })

      return updatedObjective
    } catch (error) {
      console.error('Error updating objective:', error)
      throw error
    }
  }

  /**
   * Remove objective from project
   */
  static async removeObjective(
    projectId: string,
    objectiveId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const objectives = project.objectives || []
      const filteredObjectives = objectives.filter(o => o.id !== objectiveId)

      await projectRef.update({ 
        objectives: filteredObjectives,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error removing objective:', error)
      throw error
    }
  }

  // ===== REGISTRATION FORM METHODS =====

  /**
   * Create registration form for project
   */
  static async createRegistrationForm(
    projectId: string,
    formData: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const form = {
        id: db.collection('temp').doc().id,
        title: formData.title || 'Registration Form',
        description: formData.description || '',
        fields: formData.fields || [],
        settings: formData.settings || {
          isPublic: true,
          requiresApproval: false,
          allowMultipleSubmissions: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await projectRef.update({ 
        registrationForm: form,
        updatedAt: new Date()
      })

      return form
    } catch (error) {
      console.error('Error creating registration form:', error)
      throw error
    }
  }

  /**
   * Get registration form for project
   */
  static async getRegistrationForm(
    projectId: string,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      return project.registrationForm || null
    } catch (error) {
      console.error('Error getting registration form:', error)
      throw error
    }
  }

  /**
   * Update registration form
   */
  static async updateRegistrationForm(
    projectId: string,
    updates: any,
    userId: string,
    tenantId: string
  ): Promise<any> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      const project = doc.data() as SimpleProject
      const currentForm = project.registrationForm

      if (!currentForm) {
        throw new NotFoundError('Registration form not found')
      }

      const updatedForm = {
        ...currentForm,
        ...updates,
        updatedAt: new Date()
      }

      await projectRef.update({ 
        registrationForm: updatedForm,
        updatedAt: new Date()
      })

      return updatedForm
    } catch (error) {
      console.error('Error updating registration form:', error)
      throw error
    }
  }

  /**
   * Delete registration form
   */
  static async deleteRegistrationForm(
    projectId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const projectRef = db.collection('tenants').doc(tenantId).collection('projects').doc(projectId)
      const doc = await projectRef.get()

      if (!doc.exists) {
        throw new NotFoundError('Project not found')
      }

      await projectRef.update({ 
        registrationForm: null,
        updatedAt: new Date()
      })
    } catch (error) {
      console.error('Error deleting registration form:', error)
      throw error
    }
  }
}