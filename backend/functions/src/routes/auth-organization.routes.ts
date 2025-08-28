// backend/functions/src/routes/auth-organization.routes.ts - Routes d'authentification avec support d'organisation

import { Router } from "express";
import { AuthOrganizationController } from "../controllers/auth-organization.controller";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { z } from "zod";

const router = Router();

// 🔐 Connexion
router.post("/login",
  validateBody(z.object({
    email: z.string().email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis"),
    deviceInfo: z.object({
      type: z.enum(['web', 'mobile', 'tablet']),
      browser: z.string().optional(),
      os: z.string().optional(),
      model: z.string().optional(),
      ip: z.string().optional(),
      userAgent: z.string().optional()
    }).optional()
  })),
  AuthOrganizationController.login
);

// 📝 Inscription
router.post("/register",
  validateBody(z.object({
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    profile: z.object({
      jobTitle: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      timezone: z.string().optional()
    }).optional(),
    preferences: z.object({
      language: z.string().optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      notifications: z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional()
      }).optional()
    }).optional()
  })),
  AuthOrganizationController.register
);

// 🔄 Rafraîchir le token
router.post("/refresh",
  validateBody(z.object({
    refreshToken: z.string().min(1, "Token de rafraîchissement requis")
  })),
  AuthOrganizationController.refreshToken
);

// 🚪 Déconnexion
router.post("/logout",
  authenticate,
  validateBody(z.object({
    sessionId: z.string().optional()
  })),
  AuthOrganizationController.logout
);

// 🏢 Vérifier le statut d'organisation
router.get("/organization-status",
  authenticate,
  AuthOrganizationController.checkOrganizationStatus
);

// ✅ Finaliser l'onboarding d'organisation
router.post("/complete-onboarding",
  authenticate,
  validateBody(z.object({
    organizationId: z.string().min(1, "ID organisation requis")
  })),
  AuthOrganizationController.completeOrganizationOnboarding
);

// 📧 Accepter une invitation d'organisation
router.post("/accept-invitation",
  authenticate,
  validateBody(z.object({
    token: z.string().min(1, "Token d'invitation requis")
  })),
  AuthOrganizationController.acceptInvitation
);

// 🚪 Quitter l'organisation
router.post("/leave-organization",
  authenticate,
  AuthOrganizationController.leaveOrganization
);

// 📧 Vérification d'email
router.post("/verify-email",
  validateBody(z.object({
    token: z.string().min(1, "Token de vérification requis")
  })),
  AuthOrganizationController.verifyEmail
);

// 🔄 Renvoyer l'email de vérification
router.post("/resend-verification",
  authenticate,
  AuthOrganizationController.resendVerificationEmail
);

// 🔑 Demande de réinitialisation de mot de passe
router.post("/forgot-password",
  validateBody(z.object({
    email: z.string().email("Email invalide")
  })),
  AuthOrganizationController.forgotPassword
);

// 🔑 Réinitialisation de mot de passe
router.post("/reset-password",
  validateBody(z.object({
    token: z.string().min(1, "Token de réinitialisation requis"),
    newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères")
  })),
  AuthOrganizationController.resetPassword
);

// 🔐 Changement de mot de passe
router.post("/change-password",
  authenticate,
  validateBody(z.object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
  })),
  AuthOrganizationController.changePassword
);

// 🔐 Configuration de l'authentification à deux facteurs
router.post("/2fa/setup",
  authenticate,
  validateBody(z.object({
    password: z.string().min(1, "Mot de passe requis pour configurer 2FA")
  })),
  AuthOrganizationController.setup2FA
);

// ✅ Vérification 2FA
router.post("/2fa/verify",
  authenticate,
  validateBody(z.object({
    code: z.string().length(6, "Code à 6 chiffres requis"),
    backupCode: z.string().optional()
  })),
  AuthOrganizationController.verify2FA
);

// ❌ Désactiver 2FA
router.post("/2fa/disable",
  authenticate,
  validateBody(z.object({
    password: z.string().min(1, "Mot de passe requis"),
    code: z.string().length(6, "Code 2FA requis")
  })),
  AuthOrganizationController.disable2FA
);

// 📱 Obtenir les sessions actives
router.get("/sessions",
  authenticate,
  AuthOrganizationController.getActiveSessions
);

// 🗑️ Révoquer une session
router.delete("/sessions/:sessionId",
  authenticate,
  AuthOrganizationController.revokeSession
);

// 🗑️ Révoquer toutes les sessions
router.delete("/sessions",
  authenticate,
  AuthOrganizationController.revokeAllSessions
);

// 👤 Obtenir le profil utilisateur
router.get("/profile",
  authenticate,
  AuthOrganizationController.getProfile
);

// ✏️ Mettre à jour le profil utilisateur
router.put("/profile",
  authenticate,
  validateBody(z.object({
    name: z.string().min(2).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    phone: z.string().optional(),
    profile: z.object({
      jobTitle: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      bio: z.string().max(500).optional(),
      timezone: z.string().optional()
    }).optional(),
    preferences: z.object({
      language: z.string().optional(),
      theme: z.enum(['light', 'dark', 'auto']).optional(),
      notifications: z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
        digest: z.enum(['daily', 'weekly', 'monthly', 'never']).optional()
      }).optional(),
      privacy: z.object({
        showProfile: z.boolean().optional(),
        showActivity: z.boolean().optional(),
        allowDirectMessages: z.boolean().optional()
      }).optional()
    }).optional()
  })),
  AuthOrganizationController.updateProfile
);

// 🗑️ Supprimer le compte
router.delete("/account",
  authenticate,
  validateBody(z.object({
    password: z.string().min(1, "Mot de passe requis"),
    confirmation: z.literal("DELETE", {
      errorMap: () => ({ message: "Tapez 'DELETE' pour confirmer" })
    })
  })),
  AuthOrganizationController.deleteAccount
);

export { router as authOrganizationRoutes };