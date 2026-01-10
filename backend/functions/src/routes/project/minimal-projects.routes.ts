import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware'
import { rateLimitPresets } from '../../middleware/smartRateLimit'
import {
  createProjectController,
  getProjectController,
  getProjectsController,
  updateProjectController,
  deleteProjectController,
  getProjectStatsController,
  getProjectTemplatesController,
  addTeamController,
  getTeamsController,
  updateTeamController,
  removeTeamController,
  addObjectiveController,
  getObjectivesController,
  updateObjectiveController,
  removeObjectiveController,
  createRegistrationFormController,
  getRegistrationFormController,
  updateRegistrationFormController,
  deleteRegistrationFormController
} from '../../controllers/project/minimal-project.controller'

const router = Router()

// Apply middleware chain to all routes
router.use(rateLimitPresets.normal())
router.use(authenticate) // Use the correct auth middleware
router.use(tenantContextMiddleware.injectTenantContext())
router.use(tenantContextMiddleware.validateTenantAccess())

// Project CRUD routes
router.post('/', createProjectController)
router.get('/templates', getProjectTemplatesController)
router.get('/stats', getProjectStatsController)
router.get('/:projectId', getProjectController)
router.get('/', getProjectsController)
router.put('/:projectId', updateProjectController)
router.delete('/:projectId', deleteProjectController)

// Team management routes
router.post('/:projectId/teams', addTeamController)
router.get('/:projectId/teams', getTeamsController)
router.put('/:projectId/teams/:teamId', updateTeamController)
router.delete('/:projectId/teams/:teamId', removeTeamController)

// Objective management routes
router.post('/:projectId/objectives', addObjectiveController)
router.get('/:projectId/objectives', getObjectivesController)
router.put('/:projectId/objectives/:objectiveId', updateObjectiveController)
router.delete('/:projectId/objectives/:objectiveId', removeObjectiveController)

// Registration form routes
router.post('/:projectId/registration-form', createRegistrationFormController)
router.get('/:projectId/registration-form', getRegistrationFormController)
router.put('/:projectId/registration-form', updateRegistrationFormController)
router.delete('/:projectId/registration-form', deleteRegistrationFormController)

export default router