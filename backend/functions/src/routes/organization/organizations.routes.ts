// backend/functions/src/routes/organizations.routes.ts - Routes pour les organisations

import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  enforceOrganizationAccess,
  requireNoOrganization,
  setOrganizationFromParams,
  validateContext
} from "../../middleware/organization-context.middleware";
import { validateBody, validateParams } from "../../middleware/validation";
import { z } from "zod";
import { OrganizationRole } from "../../shared";
import { OrganizationController } from "../../controllers/organization/organization.controller";

const router = Router();

// 🔒 Authentification requise pour toutes les routes
router.use(authenticate);

// 🎯 Compléter la configuration d'une organisation (première connexion)
router.post("/:id/complete-setup",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    displayName: z.string().max(150).optional(),
    description: z.string().max(500).optional(),
    sector: z.enum([
      'education', 'healthcare', 'corporate', 'government', 'non_profit',
      'technology', 'finance', 'retail', 'manufacturing', 'hospitality',
      'consulting', 'other'
    ]),
    contactInfo: z.object({
      email: z.string().email("Email invalide"),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string().optional(),
        postalCode: z.string(),
        country: z.string()
      }).optional()
    }),
    settings: z.object({
      timezone: z.string().optional(),
      language: z.string().optional(),
      workingHours: z.object({
        start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        workingDays: z.array(z.number().min(0).max(6))
      }).optional()
    }).optional(),
    branding: z.object({
      primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      logoUrl: z.string().url().optional()
    }).optional(),
    templateId: z.string().optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_organization', OrganizationRole.OWNER),
  OrganizationController.completeOrganizationSetup
);

// 📋 Obtenir les templates de secteur
router.get("/sector-templates",
  OrganizationController.getSectorTemplates
);

// 📋 Obtenir les templates de secteur (route alternative)
router.get("/templates",
  OrganizationController.getSectorTemplates
);

// 📋 Obtenir un template spécifique par secteur
router.get("/templates/:sector",
  OrganizationController.getSectorTemplate
);

// 👤 Obtenir l'organisation de l'utilisateur connecté
router.get("/my-organization",
  OrganizationController.getMyOrganization
);

// 📝 Créer une organisation (utilisateur sans organisation uniquement)
router.post("/",
  requireNoOrganization,
  validateBody(z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
    displayName: z.string().max(150).optional(),
    description: z.string().max(500).optional(),
    sector: z.enum([
      'education', 'healthcare', 'corporate', 'government', 'non_profit',
      'technology', 'finance', 'retail', 'manufacturing', 'hospitality',
      'consulting', 'other'
    ]),
    contactInfo: z.object({
      email: z.string().email("Email invalide"),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string().optional(),
        postalCode: z.string(),
        country: z.string()
      }).optional()
    }),
    settings: z.object({
      timezone: z.string().optional(),
      language: z.string().optional(),
      workingHours: z.object({
        start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        workingDays: z.array(z.number().min(0).max(6))
      }).optional()
    }).optional(),
    branding: z.object({
      primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      logoUrl: z.string().url().optional()
    }).optional(),
    templateId: z.string().optional()
  })),
  OrganizationController.createOrganization
);

// 📖 Obtenir une organisation par ID
router.get("/:id",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  setOrganizationFromParams('id'),
  validateContext,
  enforceOrganizationAccess('view_organization'),
  OrganizationController.getOrganization
);

// ✏️ Mettre à jour une organisation
router.put("/:id",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    name: z.string().min(2).max(100).optional(),
    displayName: z.string().max(150).optional(),
    description: z.string().max(500).optional(),
    contactInfo: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        country: z.string().optional()
      }).optional()
    }).optional(),
    settings: z.object({
      timezone: z.string().optional(),
      language: z.string().optional(),
      workingHours: z.object({
        start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        workingDays: z.array(z.number().min(0).max(6)).optional()
      }).optional(),
      notifications: z.object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        digestFrequency: z.enum(['daily', 'weekly', 'monthly', 'never']).optional()
      }).optional()
    }).optional(),
    branding: z.object({
      primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      logoUrl: z.string().url().optional(),
      customCss: z.string().max(10000).optional()
    }).optional(),
    features: z.object({
      attendance: z.boolean().optional(),
      events: z.boolean().optional(),
      appointments: z.boolean().optional(),
      analytics: z.boolean().optional(),
      integrations: z.boolean().optional(),
      customBranding: z.boolean().optional(),
      advancedReporting: z.boolean().optional(),
      apiAccess: z.boolean().optional(),
      ssoIntegration: z.boolean().optional(),
      auditLogs: z.boolean().optional()
    }).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_organization'),
  OrganizationController.updateOrganization
);

// 🗑️ Supprimer une organisation (propriétaire uniquement)
router.delete("/:id",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateContext,
  enforceOrganizationAccess('manage_organization', OrganizationRole.OWNER),
  OrganizationController.deleteOrganization
);

// 👥 Gestion des membres

// 📋 Obtenir les membres d'une organisation
router.get("/:id/members",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_members'),
  OrganizationController.getMembers
);

// ➕ Ajouter un membre à l'organisation
router.post("/:id/members",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    userId: z.string().min(1, "ID utilisateur requis"),
    role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']),
    permissions: z.array(z.string()).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  OrganizationController.addMember
);

// ✏️ Mettre à jour un membre
router.put("/:id/members/:userId",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis"),
    userId: z.string().min(1, "ID utilisateur requis")
  })),
  validateBody(z.object({
    role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']).optional(),
    permissions: z.array(z.string()).optional(),
    department: z.string().optional(),
    jobTitle: z.string().optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_members'),
  OrganizationController.updateMember
);

// 🗑️ Supprimer un membre
router.delete("/:id/members/:userId",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis"),
    userId: z.string().min(1, "ID utilisateur requis")
  })),
  validateContext,
  enforceOrganizationAccess('remove_members'),
  OrganizationController.removeMember
);

// 📧 Gestion des invitations

// 📋 Obtenir les invitations d'une organisation
router.get("/:id/invitations",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_members'),
  OrganizationController.getInvitations
);

// 📤 Créer une invitation
router.post("/:id/invitations",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    email: z.string().email("Email invalide"),
    role: z.enum(['admin', 'manager', 'member', 'viewer']),
    permissions: z.array(z.string()).optional(),
    message: z.string().max(500).optional(),
    expirationDays: z.number().min(1).max(30).optional()
  })),
  validateContext,
  enforceOrganizationAccess('invite_members'),
  OrganizationController.createInvitation
);

// ❌ Annuler une invitation
router.delete("/:id/invitations/:invitationId",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis"),
    invitationId: z.string().min(1, "ID invitation requis")
  })),
  validateContext,
  enforceOrganizationAccess('invite_members'),
  OrganizationController.cancelInvitation
);

// 🔄 Renouveler une invitation
router.post("/:id/invitations/:invitationId/renew",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis"),
    invitationId: z.string().min(1, "ID invitation requis")
  })),
  validateBody(z.object({
    expirationDays: z.number().min(1).max(30).optional()
  })),
  validateContext,
  enforceOrganizationAccess('invite_members'),
  OrganizationController.renewInvitation
);

// ✅ Accepter une invitation (endpoint public)
router.post("/invitations/accept",
  validateBody(z.object({
    token: z.string().min(1, "Token d'invitation requis")
  })),
  OrganizationController.acceptInvitation
);

// ❌ Décliner une invitation (endpoint public)
router.post("/invitations/decline",
  validateBody(z.object({
    token: z.string().min(1, "Token d'invitation requis")
  })),
  OrganizationController.declineInvitation
);

// 📊 Statistiques et rapports

// 📈 Obtenir les statistiques d'une organisation
router.get("/:id/stats",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_analytics'),
  OrganizationController.getOrganizationStats
);

// 📋 Obtenir l'activité récente
router.get("/:id/activity",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateContext,
  enforceOrganizationAccess('view_audit_logs'),
  OrganizationController.getRecentActivity
);

// 🏃‍♂️ Quitter l'organisation (membre lui-même)
router.post("/:id/leave",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateContext,
  OrganizationController.leaveOrganization
);

// 🔧 Gestion des paramètres avancés

// 🎨 Mettre à jour le branding
router.put("/:id/branding",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    accentColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    fontFamily: z.string().optional(),
    customCss: z.string().max(10000).optional(),
    favicon: z.string().url().optional(),
    emailTemplate: z.object({
      headerColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      footerText: z.string().max(200).optional(),
      logoUrl: z.string().url().optional()
    }).optional()
  })),
  validateContext,
  enforceOrganizationAccess('manage_organization_branding'),
  OrganizationController.updateBranding
);

// ⚙️ Mettre à jour les paramètres
router.put("/:id/settings",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    timezone: z.string().optional(),
    language: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    currency: z.string().optional(),
    workingHours: z.object({
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      workingDays: z.array(z.number().min(0).max(6)).optional()
    }).optional(),
    notifications: z.object({
      emailEnabled: z.boolean().optional(),
      smsEnabled: z.boolean().optional(),
      pushEnabled: z.boolean().optional(),
      digestFrequency: z.enum(['daily', 'weekly', 'monthly', 'never']).optional()
    }).optional(),
    security: z.object({
      requireTwoFactor: z.boolean().optional(),
      passwordPolicy: z.object({
        minLength: z.number().min(6).max(128).optional(),
        requireUppercase: z.boolean().optional(),
        requireLowercase: z.boolean().optional(),
        requireNumbers: z.boolean().optional(),
        requireSymbols: z.boolean().optional()
      }).optional(),
      sessionTimeout: z.number().min(5).max(1440).optional(),
      allowedDomains: z.array(z.string()).optional()
    }).optional()
  })),
  validateContext,
  enforceOrganizationAccess('update_organization_settings'),
  OrganizationController.updateSettings
);

// 🔐 Gestion de la sécurité

// 🔒 Suspendre l'organisation (admin système uniquement)
router.post("/:id/suspend",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  validateBody(z.object({
    reason: z.string().min(1, "Raison de suspension requise"),
    duration: z.number().optional() // en jours
  })),
  // Note: Ici vous ajouteriez un middleware pour vérifier les permissions d'admin système
  OrganizationController.suspendOrganization
);

// 🔓 Réactiver l'organisation (admin système uniquement)
router.post("/:id/reactivate",
  validateParams(z.object({
    id: z.string().min(1, "ID organisation requis")
  })),
  // Note: Ici vous ajouteriez un middleware pour vérifier les permissions d'admin système
  OrganizationController.reactivateOrganization
);


export { router as organizationRoutes };