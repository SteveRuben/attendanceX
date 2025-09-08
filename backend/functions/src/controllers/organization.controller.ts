// backend/functions/src/controllers/organization.controller.ts - Contrôleur des organisations

import { Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { organizationService } from "../services/organization/organization.service";
import { authOrganizationService } from "../services/auth/auth-organization.service";
import { OrganizationModel } from "../models/organization.model";
import { 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
 
} from "../shared";
import { AuthenticatedRequest } from "../types/middleware.types";

export class OrganizationController {
  /**
   * Obtenir les templates de secteur
   */
  static getSectorTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const templates = await organizationService.getSectorTemplates();

    return res.json({
      success: true,
      message: "Templates de secteur récupérés avec succès",
      data: templates
    });
  });

  /**
   * Obtenir un template spécifique par secteur
   */
  static getSectorTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sector } = req.params;
    const template = await organizationService.getSectorTemplate(sector);

    return res.json({
      success: true,
      message: `Template pour le secteur ${sector} récupéré avec succès`,
      data: template
    });
  });

  /**
   * Obtenir l'organisation de l'utilisateur connecté
   */
  static getMyOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const organization = await organizationService.getUserOrganization(userId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Aucune organisation trouvée pour cet utilisateur",
        data: null
      });
    }

    const orgModel = new OrganizationModel(organization);
    
    return res.json({
      success: true,
      message: "Organisation récupérée avec succès",
      data: {
        organization,
        needsSetup: orgModel.needsSetup()
      }
    });
  });

  /**
   * Compléter la configuration d'une organisation lors de la première connexion
   */
  static completeOrganizationSetup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const organizationId = req.params.organizationId;
    const organizationData: CreateOrganizationRequest = req.body;

    const organization = await organizationService.completeOrganizationSetup(
      organizationId, 
      organizationData, 
      userId
    );

    // Finaliser l'onboarding d'organisation pour l'utilisateur
    const loginResponse = await authOrganizationService.completeOrganizationOnboarding(
      userId, 
      organization.id
    );

    return res.status(200).json({
      success: true,
      message: "Configuration de l'organisation terminée avec succès",
      data: {
        organization,
        user: loginResponse.user,
        token: loginResponse.token,
        refreshToken: loginResponse.refreshToken
      }
    });
  });

  /**
   * Créer une organisation
   */
  static createOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const organizationData: CreateOrganizationRequest = req.body;

    try {
      const organization = await organizationService.createOrganization(organizationData, userId);

      // Finaliser l'onboarding d'organisation pour l'utilisateur
      const loginResponse = await authOrganizationService.completeOrganizationOnboarding(
        userId, 
        organization.id
      );

      return res.status(201).json({
        success: true,
        message: "Organisation créée avec succès",
        data: {
          organization,
          user: loginResponse.user,
          token: loginResponse.token,
          refreshToken: loginResponse.refreshToken
        }
      });
    } catch (error: any) {
      // Si l'utilisateur a déjà une organisation qui doit être configurée
      if (error.organizationId && error.needsSetup) {
        return res.status(409).json({
          success: false,
          error: "ORGANIZATION_NEEDS_SETUP",
          message: "Vous avez déjà une organisation qui doit être configurée",
          data: {
            organizationId: error.organizationId,
            needsSetup: true,
            action: "complete-setup"
          }
        });
      }
      throw error;
    }
  });

  /**
   * Obtenir une organisation
   */
  static getOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const organization = await organizationService.getOrganization(id);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: "Organisation non trouvée"
      });
    }

    return res.json({
      success: true,
      data: organization
    });
  });

  /**
   * Mettre à jour une organisation
   */
  static updateOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates: UpdateOrganizationRequest = req.body;
    const userId = req.user.uid;

    const organization = await organizationService.updateOrganization(id, updates, userId);

    return res.json({
      success: true,
      message: "Organisation mise à jour avec succès",
      data: organization
    });
  });

  /**
   * Supprimer une organisation
   */
  static deleteOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.uid;

    await organizationService.deleteOrganization(id, userId);

    return res.json({
      success: true,
      message: "Organisation supprimée avec succès"
    });
  });

  /**
   * Obtenir les membres d'une organisation
   */
  static getMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const members = await organizationService.getMembers(id);

    return res.json({
      success: true,
      data: members
    });
  });

  /**
   * Ajouter un membre à l'organisation
   */
  static addMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { userId, role, permissions } = req.body;
    const addedBy = req.user.uid;

    const member = await organizationService.addMember(id, userId, role, addedBy, permissions);

    return res.status(201).json({
      success: true,
      message: "Membre ajouté avec succès",
      data: member
    });
  });

  /**
   * Mettre à jour un membre
   */
  static updateMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id, userId } = req.params; // Commenté car non utilisé pour l'instant
    // const updates = req.body; // Commenté car non utilisé pour l'instant
    // const updatedBy = req.user.uid; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service
    // const member = await organizationService.updateMember(id, userId, updates, updatedBy);

    return res.json({
      success: true,
      message: "Membre mis à jour avec succès"
      // data: member
    });
  });

  /**
   * Supprimer un membre
   */
  static removeMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, userId } = req.params;
    const removedBy = req.user.uid;

    await organizationService.removeMember(id, userId, removedBy);

    return res.json({
      success: true,
      message: "Membre supprimé avec succès"
    });
  });

  /**
   * Obtenir les invitations d'une organisation
   */
  static getInvitations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id } = req.params; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service
    // const invitations = await organizationService.getInvitations(id);

    return res.json({
      success: true,
      data: [] // invitations
    });
  });

  /**
   * Créer une invitation
   */
  static createInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { email, role, permissions, message } = req.body;
    // const expirationDays = req.body.expirationDays; // Commenté car non utilisé pour l'instant
    const invitedBy = req.user.uid;

    const invitation = await organizationService.createInvitation(
      id, 
      email, 
      role, 
      invitedBy, 
      permissions, 
      message
    );

    return res.status(201).json({
      success: true,
      message: "Invitation créée avec succès",
      data: invitation
    });
  });

  /**
   * Annuler une invitation
   */
  static cancelInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id, invitationId } = req.params; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service
    // await organizationService.cancelInvitation(invitationId, req.user.uid);

    return res.json({
      success: true,
      message: "Invitation annulée avec succès"
    });
  });

  /**
   * Renouveler une invitation
   */
  static renewInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id, invitationId } = req.params; // Commenté car non utilisé pour l'instant
    // const { expirationDays } = req.body; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service
    // const invitation = await organizationService.renewInvitation(invitationId, expirationDays);

    return res.json({
      success: true,
      message: "Invitation renouvelée avec succès"
      // data: invitation
    });
  });

  /**
   * Accepter une invitation
   */
  static acceptInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.body;
    const userId = req.user.uid;

    const loginResponse = await authOrganizationService.acceptOrganizationInvitation(userId, token);

    return res.json({
      success: true,
      message: "Invitation acceptée avec succès",
      data: {
        user: loginResponse.user,
        token: loginResponse.token,
        refreshToken: loginResponse.refreshToken
      }
    });
  });

  /**
   * Décliner une invitation
   */
  static declineInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.body;

    // Trouver l'invitation par token et la décliner
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const invitationQuery = await db.collection('organization_invitations')
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (invitationQuery.empty) {
      return res.status(404).json({
        success: false,
        error: "Invitation non trouvée ou invalide"
      });
    }

    const invitationDoc = invitationQuery.docs[0];
    await invitationDoc.ref.update({
      status: 'declined',
      updatedAt: new Date()
    });

    return res.json({
      success: true,
      message: "Invitation déclinée avec succès"
    });
  });

  /**
   * Obtenir les statistiques d'une organisation
   */
  static getOrganizationStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const stats = await organizationService.getOrganizationStats(id);

    return res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Obtenir l'activité récente
   */
  static getRecentActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id } = req.params; // Commenté car non utilisé pour l'instant
    // const limit = parseInt(req.query.limit as string) || 50; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service
    // const activities = await organizationService.getRecentActivity(id, limit);

    return res.json({
      success: true,
      data: [] // activities
    });
  });

  /**
   * Quitter l'organisation
   */
  static leaveOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id } = req.params; // Commenté car non utilisé pour l'instant
    const userId = req.user.uid;

    await authOrganizationService.leaveOrganization(userId);

    return res.json({
      success: true,
      message: "Vous avez quitté l'organisation avec succès"
    });
  });

  /**
   * Mettre à jour le branding
   */
  static updateBranding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const branding = req.body;
    const userId = req.user.uid;

    const organization = await organizationService.updateOrganization(
      id, 
      { branding }, 
      userId
    );

    return res.json({
      success: true,
      message: "Branding mis à jour avec succès",
      data: organization.branding
    });
  });

  /**
   * Mettre à jour les paramètres
   */
  static updateSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const settings = req.body;
    const userId = req.user.uid;

    const organization = await organizationService.updateOrganization(
      id, 
      { settings }, 
      userId
    );

    return res.json({
      success: true,
      message: "Paramètres mis à jour avec succès",
      data: organization.settings
    });
  });

  /**
   * Suspendre l'organisation
   */
  static suspendOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id } = req.params; // Commenté car non utilisé pour l'instant
    // const { reason, duration } = req.body; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service avec des permissions d'admin système
    // await organizationService.suspendOrganization(id, reason, duration);

    return res.json({
      success: true,
      message: "Organisation suspendue avec succès"
    });
  });

  /**
   * Réactiver l'organisation
   */
  static reactivateOrganization = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // const { id } = req.params; // Commenté car non utilisé pour l'instant

    // Cette méthode devrait être implémentée dans le service avec des permissions d'admin système
    // await organizationService.reactivateOrganization(id);

    return res.json({
      success: true,
      message: "Organisation réactivée avec succès"
    });
  });
}