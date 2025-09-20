// backend/functions/src/services/user.service.ts

import { Query } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { logger } from "firebase-functions";
import { UserModel } from "../../models/user.model";
import { collections } from "../../config";
import { SecurityUtils } from "../../config/security.config";
import { authService } from "../auth/auth.service";
import { CreateUserRequest, InvitationStatus, UpdateUserRequest, User, UserInvitation, UserRole, UserStatus } from "../../common/types";
import { ERROR_CODES, USER_STATUSES, VALIDATION_RULES } from "../../common/constants";


// 🔧 INTERFACES ET TYPES
export interface UserListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  searchTerm?: string;
  includeInactive?: boolean;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
  recentSignups: number; // 30 derniers jours
}

export interface BulkUserOperation {
  userIds: string[];
  operation: "activate" | "deactivate" | "delete" | "changeRole";
  data?: any;
}

export interface UserSearchFilters {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  skills?: string[];
  dateRange?: { start: Date; end: Date };
}

// 🏭 CLASSE PRINCIPALE DU SERVICE
export class UserService {


  // 👤 CRÉATION D'UTILISATEURS
  async createUser(
    request: CreateUserRequest,
    createdBy: string
  ): Promise<{ user: UserModel; invitation?: UserInvitation }> {
    try {
      // Validation des données
      await this.validateCreateUserRequest(request);

      // Vérifier les permissions du créateur
      if (!await this.canCreateUser(createdBy, request.role)) {
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }

      // Vérifier l'unicité de l'email
      if (await this.emailExists(request.email)) {
        throw new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS);
      }

      // Vérifier l'unicité du téléphone (si fourni)
      if (request.phone && await this.phoneExists(request.phone)) {
        throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
      }

      const userId = crypto.randomUUID();
      const hashedPassword = await this.hashPassword(request.password);


      // Créer le modèle utilisateur
      const user = UserModel.fromCreateRequest({
        ...request,
        id: userId,
        hashedPassword,
      });

      // Sauvegarder dans Firestore
      await this.saveUser(user);

      // Créer une invitation si demandé
      let invitation: UserInvitation | undefined;
      if (request.sendInvitation) {
        invitation = await this.createInvitation(user, createdBy);
      }

      // Log de l'audit
      await this.logUserAction("user_created", user.id!, createdBy, {
        role: user.getData().role,
        department: user.getData().profile.department,
      });

      return { user, invitation };
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error && Object.values(ERROR_CODES).includes(error.message as any)) {
        throw error;
      }
      throw new Error(ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  // 📧 GESTION DES INVITATIONS
  async createInvitation(user: UserModel, invitedBy: string): Promise<UserInvitation> {
    const invitation: UserInvitation = {
      id: crypto.randomUUID(),
      email: user.getData().email,
      invitedBy,
      role: user.getData().role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      status: InvitationStatus.PENDING,
      invitedAt: new Date(),
    };

    await collections.user_invitations.doc(invitation.id ?? "").set(invitation);

    // Envoyer l'email d'invitation (à implémenter avec NotificationService)
    // await this.notificationService.sendUserInvitation(invitation);

    return invitation;
  }

  async acceptInvitation(invitationId: string, password: string): Promise<UserModel> {
    const invitationDoc = await collections.user_invitations.doc(invitationId).get();

    if (!invitationDoc.exists) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    const invitation = invitationDoc.data() as UserInvitation;

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error(ERROR_CODES.INVALID_TOKEN);
    }

    // Récupérer l'utilisateur
    const user = await this.getUserByEmail(invitation.email);
    const hashedPassword = await this.hashPassword(password);

    // Définir le mot de passe
    user.update({
      hashedPassword,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });

    await this.saveUser(user);

    // Marquer l'invitation comme acceptée
    await collections.user_invitations
      .doc(invitation.id)
      .update({
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      });

    return user;
  }


  // 🔍 RÉCUPÉRATION D'UTILISATEURS
  async getUserById(userId: string): Promise<UserModel> {
    const userDoc = await collections.users.doc(userId).get();

    if (!userDoc.exists) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(userDoc);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<UserModel> {
    if (!VALIDATION_RULES.USER.EMAIL_PATTERN.test(email)) {
      throw new Error(ERROR_CODES.INVALID_EMAIL);
    }

    const usersQuery = await collections.users
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();

    if (usersQuery.empty) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    const user = UserModel.fromFirestore(usersQuery.docs[0]);
    if (!user) {
      throw new Error(ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
  }

  // 📝 MISE À JOUR D'UTILISATEURS
  async updateUser(
    userId: string,
    updates: UpdateUserRequest,
    updatedBy: string
  ): Promise<UserModel> {
    const user = await this.getUserById(userId);

    // Vérifier les permissions
    if (!await this.canUpdateUser(updatedBy, userId, updates)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    // Validation des données
    await this.validateUpdateRequest(updates, user);

    // Sauvegarder les anciennes valeurs pour l'audit
    const oldValues = {
      role: user.getData().role,
      status: user.getData().status,
      email: user.getData().email,
    };

    // Appliquer les mises à jour
    user.updateProfile(updates);

    await this.saveUser(user);

    // Log de l'audit
    await this.logUserAction("user_updated", userId, updatedBy, {
      oldValues,
      newValues: updates,
    });

    return user;
  }

  // 🔄 GESTION DES RÔLES ET STATUTS
  async changeUserRole(
    userId: string,
    newRole: UserRole,
    changedBy: string
  ): Promise<UserModel> {
    const user = await this.getUserById(userId);

    // Vérifier les permissions
    if (!await this.canChangeRole(changedBy, user.getData().role, newRole)) {
      throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }

    user.changeRole(newRole, changedBy);
    await this.saveUser(user);

    return user;
  }

  async changeUserStatus(
    userId: string,
    newStatus: UserStatus,
    changedBy: string,
    reason?: string
  ): Promise<UserModel> {
    if (userId === changedBy && newStatus === UserStatus.SUSPENDED) {
      throw new Error(ERROR_CODES.CANNOT_DELETE_SELF);
    }

    const user = await this.getUserById(userId);
    const oldStatus = user.getData().status;

    user.update({ status: newStatus });


    await this.saveUser(user);

    // Log de l'audit
    await this.logUserAction("status_changed", userId, changedBy, {
      oldStatus,
      newStatus,
      reason,
    });

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    return await SecurityUtils.hashPassword(password);
  }

  // 📋 LISTE ET RECHERCHE
  async getUsers(options: UserListOptions = {}): Promise<UserListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      role,
      status,
      department,
      searchTerm,
      includeInactive = false,
    } = options;

    // Validation de la pagination
    if (page < 1 || limit < 1 || limit > VALIDATION_RULES.PAGINATION.MAX_LIMIT) {
      throw new Error(ERROR_CODES.BAD_REQUEST);
    }

    let query: Query = collections.users;

    // Filtres
    if (role) {
      query = query.where("role", "==", role);
    }

    if (status) {
      query = query.where("status", "==", status);
    } else if (!includeInactive) {
      query = query.where("status", "==", USER_STATUSES.ACTIVE);
    }

    if (department) {
      query = query.where("profile.department", "==", department);
    }

    // Recherche textuelle (limitation Firestore)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      query = query.where("searchTerms", "array-contains", searchLower);
    }

    // Tri
    query = query.orderBy(sortBy, sortOrder);

    // Pagination
    const offset = (page - 1) * limit;
    query = query.offset(offset).limit(limit);

    const snapshot = await query.get();
    const users = snapshot.docs
      .map((doc) => UserModel.fromFirestore(doc))
      .filter((user) => user !== null)
      .map((user) => user!.getData());

    // Compter le total
    const total = await this.countUsers(role, status, department, searchTerm, includeInactive);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async searchUsers(filters: UserSearchFilters, limit = 10): Promise<User[]> {
    let query: Query = collections.users;

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (key === "dateRange") {
          query = query.where("createdAt", ">=", value.start)
            .where("createdAt", "<=", value.end);
        } else if (key === "skills") {
          query = query.where("profile.skills", "array-contains-any", value);
        } else {
          query = query.where(key, "==", value);
        }
      }
    });

    query = query.limit(limit);

    const snapshot = await query.get();
    return snapshot.docs
      .map((doc) => UserModel.fromFirestore(doc))
      .filter((user) => user !== null)
      .map((user) => user!.getData());
  }

  // 📊 STATISTIQUES
  async getUserStats(organizationId?: string): Promise<UserStats> {
    // Créer la requête pour le total des utilisateurs
    let totalUsersQuery: Query = collections.users;
    if (organizationId) {
      totalUsersQuery = totalUsersQuery.where("organizationId", "==", organizationId);
    }

    const [totalUsers, usersByRole, usersByStatus, usersByDept, recentUsers] = await Promise.all([
      totalUsersQuery.get(),
      this.getUsersByRole(organizationId),
      this.getUsersByStatus(organizationId),
      this.getUsersByDepartment(organizationId),
      this.getRecentUsers(30, organizationId),
    ]);

    return {
      total: totalUsers.size,
      active: usersByStatus[UserStatus.ACTIVE] || 0,
      inactive: usersByStatus[UserStatus.INACTIVE] || 0,
      suspended: usersByStatus[UserStatus.SUSPENDED] || 0,
      byRole: usersByRole,
      byDepartment: usersByDept,
      recentSignups: recentUsers,
    };
  }

  // 🔧 MÉTHODES PRIVÉES
  private async validateCreateUserRequest(request: CreateUserRequest): Promise<void> {
    if (!VALIDATION_RULES.USER.EMAIL_PATTERN.test(request.email)) {
      throw new Error(ERROR_CODES.INVALID_EMAIL);
    }

    if (request.phone && !VALIDATION_RULES.USER.PHONE_PATTERN.test(request.phone)) {
      throw new Error(ERROR_CODES.INVALID_PHONE);
    }

    if (!Object.values(UserRole).includes(request.role)) {
      throw new Error(ERROR_CODES.VALIDATION_ERROR);
    }
  }

  private async validateUpdateRequest(updates: UpdateUserRequest, user: UserModel): Promise<void> {
    if (updates.email && updates.email !== user.getData().email) {
      if (!VALIDATION_RULES.USER.EMAIL_PATTERN.test(updates.email)) {
        throw new Error(ERROR_CODES.INVALID_EMAIL);
      }

      if (await this.emailExists(updates.email)) {
        throw new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS);
      }
    }

    if (updates.phone && updates.phone !== user.getData().phone) {
      if (!VALIDATION_RULES.USER.PHONE_PATTERN.test(updates.phone)) {
        throw new Error(ERROR_CODES.INVALID_PHONE);
      }

      if (await this.phoneExists(updates.phone)) {
        throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
      }
    }
  }

  private async emailExists(email: string): Promise<boolean> {
    try {
      await this.getUserByEmail(email);
      return true;
    } catch {
      return false;
    }
  }

  private async phoneExists(phone: string): Promise<boolean> {
    const query = await collections.users
      .where("phoneNumber", "==", phone)
      .limit(1)
      .get();

    return !query.empty;
  }

  private async canCreateUser(creatorId: string, roleToCreate: UserRole): Promise<boolean> {
    logger.debug(creatorId + "-" + roleToCreate);
    // Permettre l'inscription publique pour les utilisateurs normaux
    if (creatorId === "system") {//&& roleToCreate === UserRole.ORGANIZER
      return true;
    }

    // Pour les autres cas, vérifier les permissions
    return await authService.hasPermission(creatorId, "manage_users");
  }

  private async canUpdateUser(updaterId: string, targetUserId: string, updates: UpdateUserRequest): Promise<boolean> {
    if (updaterId === targetUserId) {
      // L'utilisateur peut toujours modifier son propre profil (certains champs)
      return true;
    }

    return await authService.hasPermission(updaterId, "manage_users");
  }

  private async canChangeRole(changerId: string, currentRole: UserRole, newRole: UserRole): Promise<boolean> {
    return await authService.hasPermission(changerId, "manage_roles");
  }


  private async saveUser(user: UserModel): Promise<void> {
    await user.validate();
    await collections.users
      .doc(user.id!)
      .set(user.toFirestore(), { merge: true });
  }

  private async logUserAction(
    action: string,
    userId: string,
    performedBy: string,
    details?: any
  ): Promise<void> {
    // Nettoyer les détails pour éviter les valeurs undefined
    const cleanDetails = details ? UserModel.removeUndefinedFields(details) : {};

    await collections.audit_logs.add({
      action,
      targetType: "user",
      targetId: userId,
      performedBy,
      performedAt: new Date(),
      details: cleanDetails,
    });
  }

  private async countUsers(
    role?: UserRole,
    status?: UserStatus,
    department?: string,
    searchTerm?: string,
    includeInactive = false
  ): Promise<number> {
    let query: Query = collections.users;

    if (role) { query = query.where("role", "==", role); }
    if (status) { query = query.where("status", "==", status); }
    else if (!includeInactive) { query = query.where("status", "==", USER_STATUSES.ACTIVE); }
    if (department) { query = query.where("profile.department", "==", department); }
    if (searchTerm) { query = query.where("searchTerms", "array-contains", searchTerm.toLowerCase()); }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async getUsersByRole(organizationId?: string): Promise<Record<UserRole, number>> {
    const results: Record<UserRole, number> = {} as any;

    await Promise.all(
      Object.values(UserRole).map(async (role) => {
        let query: Query = collections.users
          .where("role", "==", role);

        if (organizationId) {
          query = query.where("organizationId", "==", organizationId);
        }

        const snapshot = await query.get();
        results[role] = snapshot.size;
      })
    );

    return results;
  }

  private async getUsersByStatus(organizationId?: string): Promise<Record<UserStatus, number>> {
    const results: Record<UserStatus, number> = {} as any;

    await Promise.all(
      Object.values(UserStatus).map(async (status) => {
        let query: Query = collections.users
          .where("status", "==", status);

        if (organizationId) {
          query = query.where("organizationId", "==", organizationId);
        }

        const snapshot = await query.get();
        results[status] = snapshot.size;
      })
    );

    return results;
  }

  private async getUsersByDepartment(organizationId?: string): Promise<Record<string, number>> {
    // Implémentation simplifiée - en production, utiliser une requête d'agrégation
    let query: Query = collections.users;
    if (organizationId) {
      query = query.where("organizationId", "==", organizationId);
    }
    const snapshot = await query.get();
    const deptCounts: Record<string, number> = {};

    snapshot.docs.forEach((doc) => {
      const user = UserModel.fromFirestore(doc);
      if (user) {
        const dept = user.getData().profile.department || "Non défini";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      }
    });

    return deptCounts;
  }

  private async getRecentUsers(days: number, organizationId?: string): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let query: Query = collections.users
      .where("createdAt", ">=", cutoffDate);

    if (organizationId) {
      query = query.where("organizationId", "==", organizationId);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  /**
   * Obtenir les organisations auxquelles un utilisateur appartient
   */
  async getUserOrganizations(userId: string): Promise<Array<{
    organizationId: string;
    organizationName: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    permissions: string[];
  }>> {
    try {
      // Récupérer l'utilisateur
      const user = await this.getUserById(userId);
      const userData = user.getData();

      // Si l'utilisateur n'a pas d'organisation, retourner une liste vide
      if (!userData.organizationId) {
        return [];
      }

      // Récupérer les informations de l'organisation
      const orgDoc = await collections.organizations.doc(userData.organizationId).get();

      if (!orgDoc.exists) {
        logger.warn(`Organisation ${userData.organizationId} non trouvée pour l'utilisateur ${userId}`);
        return [];
      }

      const orgData = orgDoc.data();
      if (!orgData) {
        return [];
      }

      // Récupérer les permissions de l'utilisateur
      const permissions = await this.getUserPermissions(user);

      return [{
        organizationId: userData.organizationId,
        organizationName: orgData.name || orgData.displayName || "Organisation sans nom",
        role: userData.role,
        isActive: userData.status === UserStatus.ACTIVE,
        joinedAt: userData.createdAt,
        permissions: permissions,
      }];

    } catch (error) {
      logger.error("Erreur lors de la récupération des organisations de l'utilisateur:", error);
      throw new Error("Impossible de récupérer les organisations de l'utilisateur");
    }
  }

  /**
   * Obtenir les détails d'appartenance d'un utilisateur à une organisation spécifique
   */
  async getUserOrganizationMembership(userId: string, organizationId: string): Promise<{
    organizationId: string;
    organizationName: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    permissions: string[];
  } | null> {
    try {
      console.log(`=== getUserOrganizationMembership Debug ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Organization ID: ${organizationId}`);
      
      // Récupérer l'utilisateur
      const user = await this.getUserById(userId);
      const userData = user.getData();
      
      console.log(`User organization ID: ${userData.organizationId}`);
      console.log(`User role: ${userData.role}`);
      console.log(`User status: ${userData.status}`);

      // Vérifier si l'utilisateur appartient à cette organisation
      if (userData.organizationId !== organizationId) {
        console.log(`User does not belong to organization ${organizationId}`);
        return null;
      }

      // Récupérer les informations de l'organisation
      const orgDoc = await collections.organizations.doc(organizationId).get();

      if (!orgDoc.exists) {
        logger.warn(`Organisation ${organizationId} non trouvée`);
        return null;
      }

      const orgData = orgDoc.data();
      if (!orgData) {
        return null;
      }

      // Récupérer les permissions de l'utilisateur
      const permissions = await this.getUserPermissions(user);

      return {
        organizationId: organizationId,
        organizationName: orgData.name || orgData.displayName || "Organisation sans nom",
        role: userData.role,
        isActive: userData.status === UserStatus.ACTIVE,
        joinedAt: userData.createdAt,
        permissions: permissions,
      };

    } catch (error) {
      logger.error("Erreur lors de la récupération de l'appartenance à l'organisation:", error);
      throw new Error("Impossible de récupérer les détails d'appartenance à l'organisation");
    }
  }

  /**
   * Obtenir les permissions d'un utilisateur
   */
  private async getUserPermissions(user: UserModel): Promise<string[]> {
    try {
      const userData = user.getData();

      // Utiliser SecurityUtils pour obtenir les permissions basées sur le rôle
      const rolePermissions = SecurityUtils.getRolePermissions(userData.role);

      return rolePermissions;
    } catch (error) {
      logger.error("Erreur lors de la récupération des permissions:", error);
      return [];
    }
  }

  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  async hasPermission(user: UserModel, permission: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(user);
      return permissions.includes(permission);
    } catch (error) {
      logger.error("Erreur lors de la vérification des permissions:", error);
      return false;
    }
  }

  /**
   * Finaliser la configuration d'un utilisateur existant
   */
  async completeUserSetup(userId: string, setupData: {
    organizationName?: string;
    userData?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  }): Promise<{
    user: any;
    organization?: {
      id: string;
      name: string;
      role: string;
    };
  }> {
    try {
      // Récupérer l'utilisateur
      const user = await this.getUserById(userId);
      const userData = user.getData();

      // Préparer les mises à jour utilisateur
      const userUpdates: any = {};

      if (setupData.userData) {
        if (setupData.userData.firstName && !userData.firstName) {
          userUpdates.firstName = setupData.userData.firstName;
        }
        if (setupData.userData.lastName && !userData.lastName) {
          userUpdates.lastName = setupData.userData.lastName;
        }
        if (setupData.userData.phone && !userData.phone) {
          userUpdates['phone'] = setupData.userData.phone;
        }
      }

      // Marquer la configuration comme complète
      userUpdates.setupComplete = true;
      userUpdates.setupCompletedAt = new Date();
      userUpdates.updatedAt = new Date();

      // Mettre à jour l'utilisateur si nécessaire
      if (Object.keys(userUpdates).length > 0) {
        await collections.users.doc(userId).update(userUpdates);
        logger.info(`Configuration utilisateur finalisée pour ${userId}`, { updates: userUpdates });
      }

      // Récupérer les informations d'organisation
      let organizationInfo = null;
      if (userData.organizationId) {
        const orgDoc = await collections.organizations.doc(userData.organizationId).get();
        if (orgDoc.exists) {
          const orgData = orgDoc.data();
          organizationInfo = {
            id: userData.organizationId,
            name: orgData?.name || orgData?.displayName || "Organisation",
            role: userData.role,
          };
        }
      }

      // Récupérer l'utilisateur mis à jour
      const updatedUser = await this.getUserById(userId);

      return {
        user: updatedUser.toAPI(),
        organization: organizationInfo,
      };

    } catch (error) {
      logger.error("Erreur lors de la finalisation de la configuration utilisateur:", error);
      throw new Error("Impossible de finaliser la configuration utilisateur");
    }
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const userService = new UserService();
