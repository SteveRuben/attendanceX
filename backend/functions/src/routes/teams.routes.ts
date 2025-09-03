/**
 * Routes pour la gestion des équipes
 */

import { Router, Request, Response } from 'express';
import { teamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth';
import {
  enforceOrganizationAccess,
  validateContext
} from '../middleware/organization-context.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { z } from 'zod';
import { asyncHandler, asyncAuthHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/team-templates/status', asyncHandler(async (_req: Request, res: Response) => {
  const services = {
    auth: 'operational',
    notifications: 'unknown',
    push: 'operational',
    ml: 'operational',
  };

  return res.json({ data: services });
}));

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

// Routes pour les templates d'équipes (pas besoin de contexte d'organisation)
router.get('/team-templates/:sector', [
  validateParams(z.object({
    sector: z.enum([
      'EDUCATION', 'HEALTHCARE', 'CORPORATE', 'GOVERNMENT', 'NON_PROFIT',
      'OTHER', 'TECHNOLOGY', 'FINANCE', 'RETAIL', 'MANUFACTURING',
      'HOSPITALITY', 'CONSULTING', 'SERVICES', 'ASSOCIATION'
    ])
  }))
], asyncAuthHandler(teamController.getTeamTemplates.bind(teamController)));

// Routes pour les équipes d'une organisation
// 📝 Créer une nouvelle équipe
router.post('/organizations/:organizationId/teams',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis")
  })),
  validateBody(z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
    description: z.string().max(500).optional(),
    department: z.string().max(100).optional(),
    managerId: z.string().min(1).optional(),
    settings: z.object({
      canValidateAttendance: z.boolean().optional(),
      canCreateEvents: z.boolean().optional(),
      canInviteParticipants: z.boolean().optional(),
      canViewAllEvents: z.boolean().optional(),
      canExportData: z.boolean().optional(),
      maxEventsPerMonth: z.number().min(1).max(1000).optional(),
      allowedEventTypes: z.array(z.string()).optional()
    }).optional(),
    initialMembers: z.array(z.string()).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.createTeam.bind(teamController))
);

// 📋 Obtenir toutes les équipes d'une organisation
router.get('/organizations/:organizationId/teams',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis")
  })),
  validateQuery(z.object({
    department: z.string().optional(),
    managerId: z.string().optional(),
    isActive: z.boolean().optional(),
    search: z.string().optional(),
    page: z.number().optional(),
    limit: z.number().optional()
  })),
  validateContext,
  enforceOrganizationAccess('view_members'),
  asyncAuthHandler(teamController.getTeams.bind(teamController))
);

// 📖 Obtenir une équipe par ID
router.get('/organizations/:organizationId/teams/:teamId',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_members'),
  asyncAuthHandler(teamController.getTeamById.bind(teamController))
);

// ✏️ Mettre à jour une équipe
router.put('/organizations/:organizationId/teams/:teamId',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis")
  })),
  validateBody(z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    department: z.string().max(100).optional(),
    managerId: z.string().min(1).optional(),
    settings: z.object({
      canValidateAttendance: z.boolean().optional(),
      canCreateEvents: z.boolean().optional(),
      canInviteParticipants: z.boolean().optional(),
      canViewAllEvents: z.boolean().optional(),
      canExportData: z.boolean().optional(),
      maxEventsPerMonth: z.number().min(1).max(1000).optional(),
      allowedEventTypes: z.array(z.string()).optional()
    }).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.updateTeam.bind(teamController))
);

// 🗑️ Supprimer une équipe
router.delete('/organizations/:organizationId/teams/:teamId',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis")
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.deleteTeam.bind(teamController))
);

// 📊 Obtenir les statistiques d'une équipe
router.get('/organizations/:organizationId/teams/:teamId/stats',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_analytics'),
  asyncAuthHandler(teamController.getTeamStats.bind(teamController))
);

// 👥 Gestion des membres d'équipe

// ➕ Ajouter un membre à une équipe
router.post('/organizations/:organizationId/teams/:teamId/members',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis")
  })),
  validateBody(z.object({
    userId: z.string().min(1, "ID d'utilisateur requis"),
    role: z.enum(['manager', 'member', 'viewer']).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.addTeamMember.bind(teamController))
);

// 📋 Obtenir les membres d'une équipe
router.get('/organizations/:organizationId/teams/:teamId/members',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis")
  })),
  validateQuery(z.object({
    userId: z.string().optional(),
    role: z.string().optional(),
    isActive: z.boolean().optional()
  })),
  validateContext,
  enforceOrganizationAccess('view_members'),
  asyncAuthHandler(teamController.getTeamMembers.bind(teamController))
);

// 🗑️ Supprimer un membre d'une équipe
router.delete('/organizations/:organizationId/teams/:teamId/members/:userId',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis"),
    userId: z.string().min(1, "ID d'utilisateur requis")
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.removeTeamMember.bind(teamController))
);

// ✏️ Mettre à jour le rôle d'un membre dans une équipe
router.put('/organizations/:organizationId/teams/:teamId/members/:userId',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    teamId: z.string().min(1, "ID d'équipe requis"),
    userId: z.string().min(1, "ID d'utilisateur requis")
  })),
  validateBody(z.object({
    role: z.enum(['manager', 'member', 'viewer'])
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.updateTeamMemberRole.bind(teamController))
);

// 👤 Gestion des équipes d'un utilisateur

// 📋 Obtenir les équipes d'un utilisateur
router.get('/organizations/:organizationId/users/:userId/teams',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    userId: z.string().min(1, "ID d'utilisateur requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_members'),
  asyncAuthHandler(teamController.getUserTeams.bind(teamController))
);

// ➕ Affecter un utilisateur à plusieurs équipes
router.post('/organizations/:organizationId/users/:userId/teams/bulk-assign',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    userId: z.string().min(1, "ID d'utilisateur requis")
  })),
  validateBody(z.object({
    teamIds: z.array(z.string().min(1)),
    role: z.enum(['manager', 'member', 'viewer']).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.assignUserToTeams.bind(teamController))
);

// 🗑️ Retirer un utilisateur de plusieurs équipes
router.post('/organizations/:organizationId/users/:userId/teams/bulk-remove',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis"),
    userId: z.string().min(1, "ID d'utilisateur requis")
  })),
  validateBody(z.object({
    teamIds: z.array(z.string().min(1))
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.removeUserFromTeams.bind(teamController))
);

// 📦 Gestion en masse

// ➕ Affectation en masse d'équipes
router.post('/organizations/:organizationId/teams/bulk-assign',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis")
  })),
  validateBody(z.object({
    assignments: z.array(z.object({
      userId: z.string().min(1),
      teamIds: z.array(z.string().min(1)),
      role: z.enum(['manager', 'member', 'viewer']).optional()
    }))
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.bulkAssignTeams.bind(teamController))
);

// 🏗️ Créer des équipes par défaut selon le secteur
router.post('/organizations/:organizationId/teams/create-defaults',
  validateParams(z.object({
    organizationId: z.string().min(1, "ID d'organisation requis")
  })),
  validateBody(z.object({
    sector: z.enum([
      'EDUCATION', 'HEALTHCARE', 'CORPORATE', 'GOVERNMENT', 'NON_PROFIT',
      'OTHER', 'TECHNOLOGY', 'FINANCE', 'RETAIL', 'MANUFACTURING',
      'HOSPITALITY', 'CONSULTING', 'SERVICES', 'ASSOCIATION'
    ])
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  asyncAuthHandler(teamController.createDefaultTeams.bind(teamController))
);

export default router;