import { UserRole, UserStatus } from "@attendance-x/shared";
import { AuthenticatedRequest } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {userService} from "../services/user.service";
import { Request, Response } from "express";

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
        user: result.user.getData(),
        invitation: result.invitation,
      },
    });
  });

  /**
   * Obtenir un utilisateur par ID
   */
  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const user = await userService.getUserById(id);

    res.json({
      success: true,
      data: user.getData(),
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
      data: user.getData(),
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
      data: user.getData(),
    });
  });

  /**
   * Mettre à jour un utilisateur (admin)
   */
  static updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const updates = req.body;
    const updatedBy = req.user.uid;

    const user = await userService.updateUser(id, updates, updatedBy);

    res.json({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      data: user.getData(),
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
    const {id} = req.params;
    const {role} = req.body;
    const changedBy = req.user.uid;

    const user = await userService.changeUserRole(id, role, changedBy);

    res.json({
      success: true,
      message: "Rôle modifié avec succès",
      data: user.getData(),
    });
  });

  /**
   * Changer le statut d'un utilisateur
   */
  static changeUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {id} = req.params;
    const {status, reason} = req.body;
    const changedBy = req.user.uid;

    const user = await userService.changeUserStatus(id, status, changedBy, reason);

    res.json({
      success: true,
      message: "Statut modifié avec succès",
      data: user.getData(),
    });
  });

  /**
   * Accepter une invitation
   */
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const {token, password} = req.body;

    const user = await userService.acceptInvitation(token, password);

    res.json({
      success: true,
      message: "Invitation acceptée avec succès",
      data: user.getData(),
    });
  });

  /**
   * Obtenir les statistiques des utilisateurs
   */
  static getUserStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await userService.getUserStats();

    res.json({
      success: true,
      data: stats,
    });
  });
}
