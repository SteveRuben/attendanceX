
import { asyncHandler } from "../../middleware/errorHandler";
import { Request, Response } from "express";
import { userService } from "../../services";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { UserRole, UserStatus } from "../../common/types";

/**
 * Contrôleur de gestion des utilisateurs
 */
export class UserController {
  /**
   * Créer un utilisateur
   */
  static createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const createdBy = req.user.uid;
    const userData = req.body;

    const result = await userService.createUser(userData, createdBy);

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      data: {
        user: result.user.toAPI(),
        invitation: result.invitation,
      },
    });
  });

  /**
   * Obtenir un utilisateur par ID
   */
  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    res.json({
      success: true,
      data: user.toAPI(),
    });
  });

  /**
   * Obtenir le profil de l'utilisateur connecté
   */
  static getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;

    const user = await userService.getUserById(userId);

    res.json({
      success: true,
      data: user.toAPI(),
    });
  });

  /**
   * Mettre à jour le profil utilisateur
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.uid;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const user = await userService.updateUser(userId, updates, updatedBy);

    res.json({
      success: true,
      message: "Profil mis à jour avec succès",
      data: user.toAPI(),
    });
  });

  /**
   * Mettre à jour un utilisateur (admin)
   */
  static updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const user = await userService.updateUser(id, updates, updatedBy);

    res.json({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      data: user.toAPI(),
    });
  });

  /**
   * Obtenir la liste des utilisateurs
   */
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as "asc" | "desc",
      role: req.query.role as UserRole,
      status: req.query.status as UserStatus,
      department: req.query.department as string,
      searchTerm: req.query.search as string,
      includeInactive: req.query.includeInactive === "true",
    };

    const result = await userService.getUsers(options);

    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  });

  /**
   * Rechercher des utilisateurs
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.body;
    const limit = parseInt(req.query.limit as string) || 10;

    const users = await userService.searchUsers(filters, limit);

    res.json({
      success: true,
      data: users,
    });
  });

  /**
   * Changer le rôle d'un utilisateur
   */
  static changeUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;
    const changedBy = req.user.uid;

    const user = await userService.changeUserRole(id, role, changedBy);

    res.json({
      success: true,
      message: "Rôle modifié avec succès",
      data: user.toAPI(),
    });
  });

  /**
   * Changer le statut d'un utilisateur
   */
  static changeUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const changedBy = req.user.uid;

    const user = await userService.changeUserStatus(id, status, changedBy, reason);

    res.json({
      success: true,
      message: "Statut modifié avec succès",
      data: user.toAPI(),
    });
  });

  /**
   * Accepter une invitation
   */
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    const user = await userService.acceptInvitation(token, password);

    res.json({
      success: true,
      message: "Invitation acceptée avec succès",
      data: user.toAPI(),
    });
  });

  /**
   * Obtenir les statistiques des utilisateurs
   */
  static getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Récupérer l'organisation de l'utilisateur connecté
    const user = await userService.getUserById(req.user.uid);
    const organizationId = user.getData().organizationId;

    const stats = await userService.getUserStats(organizationId);

    res.json({
      success: true,
      data: stats,
    });
  });

  /**
   * Obtenir les organisations d'un utilisateur
   */
  static getUserOrganizations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const requestingUserId = req.user.uid;

    // Vérifier les permissions : l'utilisateur peut voir ses propres organisations
    // ou avoir la permission view_all_users pour voir celles des autres
    if (id !== requestingUserId) {
      const requestingUser = await userService.getUserById(requestingUserId);
      const hasPermission = await userService.hasPermission(requestingUser, "view_all_users");

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé : vous ne pouvez voir que vos propres organisations",
        });
      }
    }

    const organizations = await userService.getUserOrganizations(id);

    return res.json({
      success: true,
      data: organizations,
    });
  });

  /**
   * Obtenir les détails d'appartenance d'un utilisateur à une organisation spécifique
   */
  static getUserOrganizationMembership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id, organizationId } = req.params;
    const requestingUserId = req.user.uid;

    // Vérifier les permissions : l'utilisateur peut voir ses propres informations
    // ou avoir la permission view_all_users pour voir celles des autres
    if (id !== requestingUserId) {
      const requestingUser = await userService.getUserById(requestingUserId);
      const hasPermission = await userService.hasPermission(requestingUser, "view_all_users");

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé : vous ne pouvez voir que vos propres informations d'organisation",
        });
      }
    }

    const membership = await userService.getUserOrganizationMembership(id, organizationId);

    // Désactiver le cache pour cette réponse
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return res.json({
      success: true,
      data: membership,
      timestamp: new Date().toISOString(), // Ajouter un timestamp pour éviter le cache
    });
  });

  /**
   * Finaliser la configuration d'un utilisateur existant
   */
  static completeUserSetup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { organizationName, userData } = req.body;
    const requestingUserId = req.user.uid;

    // Vérifier les permissions : l'utilisateur peut finaliser sa propre configuration
    // ou avoir la permission manage_users pour finaliser celle des autres
    if (id !== requestingUserId) {
      const requestingUser = await userService.getUserById(requestingUserId);
      const hasPermission = await userService.hasPermission(requestingUser, "manage_users");

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé : vous ne pouvez finaliser que votre propre configuration",
        });
      }
    }

    const result = await userService.completeUserSetup(id, {
      organizationName,
      userData,
    });

    return res.json({
      success: true,
      message: "Configuration finalisée avec succès",
      data: result,
    });
  });
}
