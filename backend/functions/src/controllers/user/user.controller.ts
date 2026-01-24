
import { asyncHandler } from "../../middleware/errorHandler";
import { Request, Response } from "express";
import { userService } from "../../services";
import { AuthenticatedRequest } from "../../types/middleware.types";
import { UserStatus } from "../../common/types";
import { 
  sendSuccess, 
  sendCreated, 
  validateRequiredFields, 
  validateEmail,
  validatePagination,
  createPaginationMeta,
  handleCommonErrors
} from "../../utils/response.utils";
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError 
} from "../../utils/common/errors";

/**
 * Contrôleur de gestion des utilisateurs
 */
export class UserController {
  /**
   * Créer un utilisateur
   */
  static createUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const createdBy = req.user.uid;
      const userData = req.body;

      // Validate required fields
      validateRequiredFields(userData, ['email', 'name']);
      
      // Validate email format
      validateEmail(userData.email);

      const result = await userService.createUser(userData, createdBy);

      sendCreated(res, {
        user: result.user.toAPI(),
        invitation: result.invitation,
      }, "Utilisateur créé avec succès");

    } catch (error) {
      handleCommonErrors(error, 'User creation');
    }
  });

  /**
   * Obtenir un utilisateur par ID
   */
  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      const user = await userService.getUserById(id);
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      sendSuccess(res, user.toAPI());

    } catch (error) {
      handleCommonErrors(error, 'Get user by ID');
    }
  });

  /**
   * Obtenir le profil de l'utilisateur connecté
   */
  static getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;

      const user = await userService.getUserById(userId);
      
      if (!user) {
        throw new NotFoundError('User profile not found');
      }

      const userData = user.toAPI();

      // Remove deprecated intrinsic role field if it exists
      const { role, ...cleanUserData } = userData as any;

      // Add tenant-scoped role information if user has an active tenant
      if (cleanUserData.activeTenantId && cleanUserData.tenantMemberships) {
        const activeMembership = cleanUserData.tenantMemberships.find(
          (membership: any) => membership.tenantId === cleanUserData.activeTenantId
        );
        if (activeMembership) {
          cleanUserData.currentTenantRole = activeMembership.role;
        }
      }

      sendSuccess(res, cleanUserData);

    } catch (error) {
      handleCommonErrors(error, 'Get user profile');
    }
  });

  /**
   * Mettre à jour le profil utilisateur
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.uid;
      const updates = req.body;
      const updatedBy = req.user.uid;

      // Validate email if provided
      if (updates.email) {
        validateEmail(updates.email);
      }

      const user = await userService.updateUser(userId, updates, updatedBy);

      sendSuccess(res, user.toAPI(), "Profil mis à jour avec succès");

    } catch (error) {
      handleCommonErrors(error, 'Update user profile');
    }
  });

  /**
   * Mettre à jour un utilisateur (admin)
   */
  static updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const updates = req.body;
      const updatedBy = req.user.uid;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      // Validate email if provided
      if (updates.email) {
        validateEmail(updates.email);
      }

      const user = await userService.updateUser(id, updates, updatedBy);

      sendSuccess(res, user.toAPI(), "Utilisateur mis à jour avec succès");

    } catch (error) {
      handleCommonErrors(error, 'Update user');
    }
  });

  /**
   * Obtenir la liste des utilisateurs
   */
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { page, limit } = validatePagination(req.query);
      
      const options = {
        page,
        limit,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
        status: req.query.status as UserStatus,
        department: req.query.department as string,
        searchTerm: req.query.search as string,
        includeInactive: req.query.includeInactive === "true",
      };

      const result = await userService.getUsers(options);

      const pagination = createPaginationMeta(page, limit, result.pagination.total);

      sendSuccess(res, result.users, undefined, 200, pagination);

    } catch (error) {
      handleCommonErrors(error, 'Get users list');
    }
  });

  /**
   * Rechercher des utilisateurs
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response) => {
    try {
      const filters = req.body;
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit > 100) {
        throw new ValidationError('Limit cannot exceed 100');
      }

      const users = await userService.searchUsers(filters, limit);

      sendSuccess(res, users);

    } catch (error) {
      handleCommonErrors(error, 'Search users');
    }
  });

  /**
   * Changer le statut d'un utilisateur
   */
  static changeUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { status, reason } = req.body;
      const changedBy = req.user.uid;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      validateRequiredFields({ status }, ['status']);

      const user = await userService.changeUserStatus(id, status, changedBy, reason);

      sendSuccess(res, user.toAPI(), "Statut modifié avec succès");

    } catch (error) {
      handleCommonErrors(error, 'Change user status');
    }
  });

  /**
   * Accepter une invitation
   */
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      validateRequiredFields({ token, password }, ['token', 'password']);

      const user = await userService.acceptInvitation(token, password);

      sendSuccess(res, user.toAPI(), "Invitation acceptée avec succès");

    } catch (error) {
      handleCommonErrors(error, 'Accept invitation');
    }
  });

  /**
   * Finaliser la configuration d'un utilisateur existant
   */
  static completeUserSetup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      const { organizationName, userData } = req.body;
      const requestingUserId = req.user.uid;

      if (!id) {
        throw new ValidationError('User ID is required');
      }

      // Vérifier les permissions : l'utilisateur peut finaliser sa propre configuration
      // ou avoir la permission manage_users pour finaliser celle des autres
      if (id !== requestingUserId) {
        const requestingUser = await userService.getUserById(requestingUserId);
        const hasPermission = await userService.hasPermission(requestingUser, "manage_users");

        if (!hasPermission) {
          throw new ForbiddenError("Vous ne pouvez finaliser que votre propre configuration");
        }
      }

      const result = await userService.completeUserSetup(id, {
        organizationName,
        userData,
      });

      sendSuccess(res, result, "Configuration finalisée avec succès");

    } catch (error) {
      handleCommonErrors(error, 'Complete user setup');
    }
  });
}
