import { Response } from 'express'
import { SimpleProjectService } from '../../services/project/simple-project.service'
import { AuthenticatedRequest } from '../../types/middleware.types'
import { handleControllerError } from '../../middleware/errorHandler'

// Helper function to extract tenant and user context
const extractContext = (req: AuthenticatedRequest) => {
  const tenantId = req.tenantContext?.tenantId || 
                   req.headers['x-tenant-id'] as string ||
                   req.params.tenantId ||
                   req.query.tenantId as string ||
                   req.body?.tenantId
  
  const userId = req.user?.uid

  if (!tenantId || !userId) {
    throw new Error(`Tenant context or user ID missing - tenantId: ${tenantId}, userId: ${userId}`)
  }

  return { tenantId, userId }
}

/**
 * Create a new project
 */
export const createProjectController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const projectData = req.body

    const project = await SimpleProjectService.createProject(projectData, userId, tenantId)

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get project by ID
 */
export const getProjectController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params

    const project = await SimpleProjectService.getProjectById(projectId, userId, tenantId)

    res.json({
      success: true,
      data: project
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get projects list with filtering and pagination
 */
export const getProjectsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    
    // Simple options for now
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as any, // Cast to any to avoid type issues for now
      searchTerm: req.query.search as string
    }

    const result = await SimpleProjectService.getProjects(options, userId, tenantId)

    res.json({
      success: true,
      data: result.projects,
      pagination: result.pagination
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Update project
 */
export const updateProjectController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params
    const updates = req.body

    const project = await SimpleProjectService.updateProject(projectId, updates, userId, tenantId)

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Delete project
 */
export const deleteProjectController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params

    await SimpleProjectService.deleteProject(projectId, userId, tenantId)

    res.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get project statistics
 */
export const getProjectStatsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)

    const stats = await SimpleProjectService.getProjectStats(tenantId, userId)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get project templates
 */
export const getProjectTemplatesController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await SimpleProjectService.getProjectTemplates()

    res.json({
      success: true,
      data: templates
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

// ===== TEAM MANAGEMENT CONTROLLERS =====

/**
 * Add team to project
 */
export const addTeamController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params
    const teamData = req.body

    const team = await SimpleProjectService.addTeam(projectId, teamData, userId, tenantId)

    res.status(201).json({
      success: true,
      data: team,
      message: 'Team added successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get project teams
 */
export const getTeamsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params

    const teams = await SimpleProjectService.getTeams(projectId, userId, tenantId)

    res.json({
      success: true,
      data: teams
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Update team
 */
export const updateTeamController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId, teamId } = req.params
    const updates = req.body

    const team = await SimpleProjectService.updateTeam(projectId, teamId, updates, userId, tenantId)

    res.json({
      success: true,
      data: team,
      message: 'Team updated successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Remove team from project
 */
export const removeTeamController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId, teamId } = req.params

    await SimpleProjectService.removeTeam(projectId, teamId, userId, tenantId)

    res.json({
      success: true,
      message: 'Team removed successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

// ===== OBJECTIVE MANAGEMENT CONTROLLERS =====

/**
 * Add objective to project
 */
export const addObjectiveController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params
    const objectiveData = req.body

    const objective = await SimpleProjectService.addObjective(projectId, objectiveData, userId, tenantId)

    res.status(201).json({
      success: true,
      data: objective,
      message: 'Objective added successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get project objectives
 */
export const getObjectivesController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params

    const objectives = await SimpleProjectService.getObjectives(projectId, userId, tenantId)

    res.json({
      success: true,
      data: objectives
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Update objective
 */
export const updateObjectiveController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId, objectiveId } = req.params
    const updates = req.body

    const objective = await SimpleProjectService.updateObjective(projectId, objectiveId, updates, userId, tenantId)

    res.json({
      success: true,
      data: objective,
      message: 'Objective updated successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Remove objective from project
 */
export const removeObjectiveController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId, objectiveId } = req.params

    await SimpleProjectService.removeObjective(projectId, objectiveId, userId, tenantId)

    res.json({
      success: true,
      message: 'Objective removed successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

// ===== REGISTRATION FORM CONTROLLERS =====

/**
 * Create registration form for project
 */
export const createRegistrationFormController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params
    const formData = req.body

    const form = await SimpleProjectService.createRegistrationForm(projectId, formData, userId, tenantId)

    res.status(201).json({
      success: true,
      data: form,
      message: 'Registration form created successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Get registration form for project
 */
export const getRegistrationFormController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params

    const form = await SimpleProjectService.getRegistrationForm(projectId, userId, tenantId)

    res.json({
      success: true,
      data: form
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Update registration form
 */
export const updateRegistrationFormController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params
    const updates = req.body

    const form = await SimpleProjectService.updateRegistrationForm(projectId, updates, userId, tenantId)

    res.json({
      success: true,
      data: form,
      message: 'Registration form updated successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}

/**
 * Delete registration form
 */
export const deleteRegistrationFormController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = extractContext(req)
    const { projectId } = req.params

    await SimpleProjectService.deleteRegistrationForm(projectId, userId, tenantId)

    res.json({
      success: true,
      message: 'Registration form deleted successfully'
    })
  } catch (error) {
    handleControllerError(error, res)
  }
}