// backend/functions/src/services/user.service.ts

import { Query } from "firebase-admin/firestore";
import * as crypto from "crypto";
import { logger } from "firebase-functions";
import { UserModel } from "../../models/user.model";
import { collections } from "../../config";
import { SecurityUtils } from "../../config/security.config";
import { authService } from "../auth/auth.service";
import { CreateUserRequest, InvitationStatus, UpdateUserRequest, User, UserInvitation, UserStatus } from "../../common/types";
import { ERROR_CODES, USER_STATUSES, VALIDATION_RULES } from "../../common/constants";


// 🔧 INTERFACES ET TYPES
export interface UserListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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
  byDepartment: Record<string, number>;
  recentSignups: number; // 30 derniers jours
}

export interface BulkUserOperation {
  userIds: string[];
  operation: "activate" | "deactivate" | "delete";
  data?: any;
}

export interface UserSearchFilters {
  email?: string;
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
    const startTime = Date.now();
    
    logger.info('👤 UserService.createUser - START', {
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      createdBy
    });

    try {
      // Validation des données
      logger.info('✅ Step 1: Validating user request');
      await this.validateCreateUserRequest(request);
      logger.info('✅ Validation passed');

      // Vérifier les permissions du créateur
      logger.info('🔐 Step 2: Checking creator permissions', { createdBy });
      if (!await this.canCreateUser(createdBy)) {
        logger.error('❌ Insufficient permissions', { createdBy });
        throw new Error(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      }
      logger.info('✅ Creator has permissions');

      // Vérifier l'unicité de l'email
      logger.info('📧 Step 3: Checking email uniqueness', { email: request.email });
      if (await this.emailExists(request.email)) {
        logger.error('❌ Email already exists', { email: request.email });
        throw new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS);
      }
      logger.info('✅ Email is unique');

      // Vérifier l'unicité du téléphone (si fourni)
      if (request.phone) {
        logger.info('📱 Step 4: Checking phone uniqueness', { phone: request.phone });
        if (await this.phoneExists(request.phone)) {
          logger.error('❌ Phone already exists', { phone: request.phone });
          throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
        }
        logger.info('✅ Phone is unique');
      }

      logger.info('🔑 Step 5: Generating user ID and hashing password');
      const userId = crypto.randomUUID();
      const hashedPassword = await this.hashPassword(request.password);
      logger.info('✅ User ID and password hash generated', { userId });

      // Créer le modèle utilisateur
      logger.info('🏗️ Step 6: Creating user model');
      const user = UserModel.fromCreateRequest({
        ...request,
        id: userId,
        hashedPassword,
      });
      logger.info('✅ User model created', {
        userId: user.id,
        email: user.getData().email,
        status: user.getData().status
      });

      // Sauvegarder dans Firestore
      logger.info('💾 Step 7: Saving user to Firestore', { userId });
      await this.saveUser(user);
      logger.info('✅ User saved to Firestore successfully');

      // Créer une invitation si demandé
      let invitation: UserInvitation | undefined;
      if (request.sendInvitation) {
        logger.info('📨 Step 8: Creating invitation', { userId });
        invitation = await this.createInvitation(user, createdBy);
        logger.info('✅ Invitation created');
      }

      // Log de l'audit
      logger.info('📝 Step 9: Logging audit action', { userId });
      await this.logUserAction("user_created", user.id!, createdBy, {
        department: user.getData().profile.department,
      });

      const duration = Date.now() - startTime;
      logger.info('🎉 UserService.createUser - SUCCESS', {
        userId: user.id,
        email: user.getData().email,
        duration: `${duration}ms`
      });

      return { user, invitation };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ UserService.createUser - ERROR', {
        email: request.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`
      });
      
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

  // 🔄 GESTION DES STATUTS
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
    const total = await this.countUsers(status, department, searchTerm, includeInactive);

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
  async getUserStats(tenantId?: string): Promise<UserStats> {
    // Créer la requête pour le total des utilisateurs
    let totalUsersQuery: Query = collections.users;
    if (tenantId) {
      totalUsersQuery = totalUsersQuery.where("tenantId", "==", tenantId);
    }

    const [totalUsers, usersByStatus, usersByDept, recentUsers] = await Promise.all([
      totalUsersQuery.get(),
      this.getUsersByStatus(tenantId),
      this.getUsersByDepartment(tenantId),
      this.getRecentUsers(30, tenantId),
    ]);

    return {
      total: totalUsers.size,
      active: usersByStatus[UserStatus.ACTIVE] || 0,
      inactive: usersByStatus[UserStatus.INACTIVE] || 0,
      suspended: usersByStatus[UserStatus.SUSPENDED] || 0,
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

  private async canCreateUser(creatorId: string): Promise<boolean> {
    // Permettre l'inscription publique pour les utilisateurs normaux
    if (creatorId === "system") {
      return true;
    }

    // Pour les autres cas, vérifier les permissions
    return await authService.hasPermission(creatorId, "manage_users");
  }

  private async canUpdateUser(updaterId: string, targetUserId: string, _updates: UpdateUserRequest): Promise<boolean> {
    if (updaterId === targetUserId) {
      // L'utilisateur peut toujours modifier son propre profil (certains champs)
      return true;
    }

    return await authService.hasPermission(updaterId, "manage_users");
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
    status?: UserStatus,
    department?: string,
    searchTerm?: string,
    includeInactive = false
  ): Promise<number> {
    let query: Query = collections.users;

    if (status) { query = query.where("status", "==", status); }
    else if (!includeInactive) { query = query.where("status", "==", USER_STATUSES.ACTIVE); }
    if (department) { query = query.where("profile.department", "==", department); }
    if (searchTerm) { query = query.where("searchTerms", "array-contains", searchTerm.toLowerCase()); }

    const snapshot = await query.get();
    return snapshot.size;
  }

  private async getUsersByStatus(tenantId?: string): Promise<Record<UserStatus, number>> {
    const results: Record<UserStatus, number> = {} as any;

    await Promise.all(
      Object.values(UserStatus).map(async (status) => {
        let query: Query = collections.users
          .where("status", "==", status);

        if (tenantId) {
          query = query.where("tenantId", "==", tenantId);
        }

        const snapshot = await query.get();
        results[status] = snapshot.size;
      })
    );

    return results;
  }

  private async getUsersByDepartment(tenantId?: string): Promise<Record<string, number>> {
    // Implémentation simplifiée - en production, utiliser une requête d'agrégation
    let query: Query = collections.users;
    if (tenantId) {
      query = query.where("tenantId", "==", tenantId);
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

  private async getRecentUsers(days: number, tenantId?: string): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let query: Query = collections.users
      .where("createdAt", ">=", cutoffDate);

    if (tenantId) {
      query = query.where("tenantId", "==", tenantId);
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  /**
   * Obtenir les tenants auxquels un utilisateur appartient
   */
  async getUserTenants(userId: string): Promise<Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    permissions: string[];
  }>> {
    try {
      // Récupérer l'utilisateur
      const user = await this.getUserById(userId);
      const userData = user.getData();

      // Si l'utilisateur n'a pas de tenant, retourner une liste vide
      if (!userData.tenantId) {
        return [];
      }

      // Récupérer les informations du tenant
      const tenantDoc = await collections.tenants.doc(userData.tenantId).get();

      if (!tenantDoc.exists) {
        logger.warn(`Tenant ${userData.tenantId} non trouvé pour l'utilisateur ${userId}`);
        return [];
      }

      const tenantData = tenantDoc.data();
      if (!tenantData) {
        return [];
      }

      // Récupérer les permissions de l'utilisateur
      const permissions = await this.getUserPermissions(user);

      return [{
        tenantId: userData.tenantId,
        tenantName: tenantData.name || "Tenant sans nom",
        role: "MEMBER", // Default role since users don't have intrinsic roles
        isActive: userData.status === UserStatus.ACTIVE,
        joinedAt: userData.createdAt,
        permissions: permissions,
      }];

    } catch (error) {
      logger.error("Erreur lors de la récupération des tenants de l'utilisateur:", error);
      throw new Error("Impossible de récupérer les tenants de l'utilisateur");
    }
  }

  /**
   * Obtenir les détails d'appartenance d'un utilisateur à un tenant spécifique
   */
  async getUserTenantMembership(userId: string, tenantId: string): Promise<{
    tenantId: string;
    tenantName: string;
    role: string;
    isActive: boolean;
    joinedAt: Date;
    permissions: string[];
  } | null> {
    try {
      console.log(`=== getUserTenantMembership Debug ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Tenant ID: ${tenantId}`);
      
      // Récupérer l'utilisateur
      const user = await this.getUserById(userId);
      const userData = user.getData();
      
      console.log(`User tenant ID: ${userData.tenantId}`);
      console.log(`User status: ${userData.status}`);

      // Vérifier si l'utilisateur appartient à ce tenant
      if (userData.tenantId !== tenantId) {
        console.log(`User does not belong to tenant ${tenantId}`);
        return null;
      }

      // Récupérer les informations du tenant
      const tenantDoc = await collections.tenants.doc(tenantId).get();

      if (!tenantDoc.exists) {
        logger.warn(`Tenant ${tenantId} non trouvé`);
        return null;
      }

      const tenantData = tenantDoc.data();
      if (!tenantData) {
        return null;
      }

      // Récupérer les permissions de l'utilisateur
      const permissions = await this.getUserPermissions(user);

      return {
        tenantId: tenantId,
        tenantName: tenantData.name || "Tenant sans nom",
        role: "MEMBER", // Default role since users don't have intrinsic roles
        isActive: userData.status === UserStatus.ACTIVE,
        joinedAt: userData.createdAt,
        permissions: permissions,
      };

    } catch (error) {
      logger.error("Erreur lors de la récupération de l'appartenance au tenant:", error);
      throw new Error("Impossible de récupérer les détails d'appartenance au tenant");
    }
  }

  /**
   * Obtenir les permissions d'un utilisateur
   */
  private async getUserPermissions(user: UserModel): Promise<string[]> {
    try {
      const userData = user.getData();

      // TODO: Implement proper tenant-based permission checking
      // For now, return basic permissions based on user status
      if (userData.status === UserStatus.ACTIVE) {
        return ["view_events", "record_attendance", "view_own_profile"];
      }

      return [];
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
    tenant?: {
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

      // Récupérer les informations de tenant
      let tenantInfo = null;
      if (userData.tenantId) {
        const tenantDoc = await collections.tenants.doc(userData.tenantId).get();
        if (tenantDoc.exists) {
          const tenantData = tenantDoc.data();
          tenantInfo = {
            id: userData.tenantId,
            name: tenantData?.name || "Tenant",
            role: "MEMBER", // Default role since users don't have intrinsic roles
          };
        }
      }

      // Récupérer l'utilisateur mis à jour
      const updatedUser = await this.getUserById(userId);

      return {
        user: updatedUser.toAPI(),
        tenant: tenantInfo,
      };

    } catch (error) {
      logger.error("Erreur lors de la finalisation de la configuration utilisateur:", error);
      throw new Error("Impossible de finaliser la configuration utilisateur");
    }
  }
}

// 🏭 EXPORT DE L'INSTANCE SINGLETON
export const userService = new UserService();
