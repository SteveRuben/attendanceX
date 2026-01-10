/**
 * Service User tenant-aware
 * Remplace progressivement le service User existant avec l'isolation tenant
 */

import { TenantAwareService, ValidateTenant } from '../base/tenant-aware.service';
import { CreateUserRequest, TenantError, TenantErrorCode, UpdateUserRequest, User, UserStatus } from '../../common/types';


export interface TenantUserListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: UserStatus;
  searchTerm?: string;
  includeInactive?: boolean;
}

export interface TenantUserListResponse {
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

export class TenantUserService extends TenantAwareService<User> {
  constructor() {
    super('users');
  }

  /**
   * Obtenir tous les utilisateurs d'un tenant
   */
  @ValidateTenant
  async getUsersByTenant(
    tenantId: string,
    options: TenantUserListOptions = {}
  ): Promise<TenantUserListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      searchTerm,
      includeInactive = false
    } = options;

    // Construire les filtres
    const filters: Array<{ field: string; operator: any; value: any }> = [];

    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    } else if (!includeInactive) {
      filters.push({ field: 'isActive', operator: '==', value: true });
    }

    // Calculer l'offset
    const offset = (page - 1) * limit;

    // Obtenir les données
    const result = await this.getAllByTenant(tenantId, {
      limit,
      offset,
      orderBy: sortBy,
      orderDirection: sortOrder,
      filters
    });

    // Filtrer par terme de recherche si fourni (côté client car Firestore a des limitations)
    let users = result.data;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(user =>
        user.firstName?.toLowerCase().includes(term) ||
        user.lastName?.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    return {
      users,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: result.hasMore,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Obtenir un utilisateur par ID avec validation tenant
   */
  @ValidateTenant
  async getUserById(userId: string, tenantId: string): Promise<User | null> {
    return await this.getByIdAndTenant(userId, tenantId);
  }

  /**
   * Obtenir un utilisateur par email dans un tenant
   */
  @ValidateTenant
  async getUserByEmail(tenantId: string, email: string): Promise<User | null> {
    const query = this.addTenantFilter(this.collection, tenantId)
      .where('email', '==', email.toLowerCase())
      .limit(1);

    const snapshot = await query.get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  /**
   * Créer un nouvel utilisateur dans un tenant
   */
  @ValidateTenant
  async createUser(tenantId: string, userData: CreateUserRequest): Promise<User> {
    // Vérifier que l'email n'existe pas déjà dans ce tenant
    const existingUser = await this.getUserByEmail(tenantId, userData.email);
    if (existingUser) {
      throw new TenantError(
        'User with this email already exists in this tenant',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    // Préparer les données utilisateur
    const userToCreate: Partial<User> = {
      email: userData.email.toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`,
      displayName: `${userData.firstName} ${userData.lastName}`,
      status: UserStatus.ACTIVE,

      // Multi-tenant fields
      tenantMemberships: [], // Sera rempli par le service de membership
      activeTenantId: tenantId,

      // Profile par défaut
      profile: {
        bio: '',
        skills: [],
        timezone: 'Europe/Paris'
      },
      preferences: {
        language: 'fr',
        notifications: {
          email: true,
          push: true,
          sms: false,
          digest: 'weekly' as const
        },
        privacy: {
          showProfile: true,
          showActivity: true,
          allowDirectMessages: true
        }
      },

      // Statuts
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      twoFactorEnabled: false,

      // Métadonnées
      metadata: {
        source: 'tenant_creation'
      }
    };

    // Créer l'utilisateur avec tenantId
    const createdUser = await this.createWithTenant(userToCreate, tenantId);

    // Si un mot de passe est fourni, créer le compte Firebase Auth
    if (userData.password) {
      try {
        // Note: Cette méthode doit être implémentée dans authService
        console.log('TODO: Implement createUserWithEmailAndPassword in authService');
      } catch (error) {
        // Si la création Firebase échoue, supprimer l'utilisateur Firestore
        await this.deleteWithTenant(createdUser.id, tenantId);
        throw error;
      }
    }

    return createdUser;
  }

  /**
   * Mettre à jour un utilisateur
   */
  @ValidateTenant
  async updateUser(tenantId: string, userId: string, updates: UpdateUserRequest): Promise<User> {
    // Vérifier si l'email change et s'il n'existe pas déjà
    if (updates.email) {
      const existingUser = await this.getUserByEmail(tenantId, updates.email);
      if (existingUser && existingUser.id !== userId) {
        throw new TenantError(
          'User with this email already exists in this tenant',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }
    }

    // Préparer les données de mise à jour
    const updateData: Partial<User> = {
      ...updates,
      name: updates.firstName && updates.lastName
        ? `${updates.firstName} ${updates.lastName}`
        : undefined,
      displayName: updates.firstName && updates.lastName
        ? `${updates.firstName} ${updates.lastName}`
        : undefined
    };

    // Nettoyer les valeurs undefined
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof User] === undefined) {
        delete updateData[key as keyof User];
      }
    });

    return await this.updateWithTenant(userId, updateData, tenantId);
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  @ValidateTenant
  async deleteUser(tenantId: string, userId: string): Promise<boolean> {
    // Soft delete - marquer comme inactif
    await this.updateWithTenant(userId, {
      isActive: false,
      status: UserStatus.INACTIVE,
      updatedAt: new Date()
    }, tenantId);

    return true;
  }

  /**
   * Supprimer définitivement un utilisateur
   */
  @ValidateTenant
  async permanentlyDeleteUser(tenantId: string, userId: string): Promise<boolean> {
    return await this.deleteWithTenant(userId, tenantId);
  }

  /**
   * Rechercher des utilisateurs dans un tenant
   */
  @ValidateTenant
  async searchUsers(
    tenantId: string,
    searchTerm: string,
    options: { limit?: number } = {}
  ): Promise<User[]> {
    // Recherche par email (Firestore supporte les requêtes de préfixe)
    const emailResults = await this.searchByTenant(
      tenantId,
      'email',
      searchTerm.toLowerCase(),
      { limit: options.limit }
    );

    // Recherche par nom (limitation de Firestore - recherche côté client)
    const allUsers = await this.getAllByTenant(tenantId, {
      limit: 100, // Limiter pour éviter de charger trop de données
      filters: [] // Remove role filtering since users don't have intrinsic roles
    });

    const nameResults = allUsers.data.filter(user => {
      const term = searchTerm.toLowerCase();
      return user.firstName?.toLowerCase().includes(term) ||
        user.lastName?.toLowerCase().includes(term) ||
        user.name?.toLowerCase().includes(term);
    });

    // Combiner et dédupliquer les résultats
    const combinedResults = [...emailResults, ...nameResults];
    const uniqueResults = combinedResults.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );

    return options.limit ? uniqueResults.slice(0, options.limit) : uniqueResults;
  }

  /**
   * Obtenir les statistiques des utilisateurs pour un tenant
   */
  @ValidateTenant
  async getUserStats(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    const baseStats = await this.getStatsForTenant(tenantId);

    const [activeCount, inactiveCount] = await Promise.all([
      this.countByTenant(tenantId, [{ field: 'isActive', operator: '==', value: true }]),
      this.countByTenant(tenantId, [{ field: 'isActive', operator: '==', value: false }])
    ]);

    return {
      total: baseStats.total,
      active: activeCount,
      inactive: inactiveCount,
      createdToday: baseStats.createdToday,
      createdThisWeek: baseStats.createdThisWeek,
      createdThisMonth: baseStats.createdThisMonth
    };
  }

}

// Instance singleton
export const tenantUserService = new TenantUserService();
export default tenantUserService;