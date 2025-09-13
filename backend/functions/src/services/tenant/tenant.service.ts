/**
 * Service principal pour la gestion des tenants
 * Gère le cycle de vie complet des tenants (CRUD, configuration, etc.)
 */

import {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  TenantStatus,
  TenantSettings,
  TenantUsage,
  TenantError,
  TenantErrorCode
} from '../../shared/types/tenant.types';
import { collections } from '../../config/database';
import { getFreePlan, getPlanById } from '../../config/default-plans';

export interface TenantListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: TenantStatus;
  planId?: string;
  searchTerm?: string;
}

export interface TenantListResponse {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class TenantService {

  /**
   * Créer un nouveau tenant
   */
  async createTenant(request: CreateTenantRequest): Promise<Tenant> {
    try {
      // Générer un slug unique si non fourni
      const slug = request.slug || await this.generateUniqueSlug(request.name);

      // Valider que le slug n'existe pas déjà
      if (await this.isSlugTaken(slug)) {
        throw new TenantError(
          'Tenant slug already exists',
          TenantErrorCode.TENANT_SLUG_EXISTS
        );
      }

      // Obtenir le plan (par défaut: gratuit)
      const plan = getPlanById(request.planId) || getFreePlan();

      // Préparer les données du tenant
      const now = new Date();
      const tenantData: Tenant = {
        id: '', // Sera défini par Firestore
        name: request.name.trim(),
        slug: slug,
        planId: plan.id,
        status: TenantStatus.TRIAL, // Commencer en mode trial

        settings: { ...this.getDefaultSettings(), ...request.settings },
        usage: this.getInitialUsage(),

        createdAt: now,
        updatedAt: now,
        createdBy: request.createdBy
      };

      // Créer le tenant dans Firestore
      const tenantRef = await collections.tenants.add(tenantData);
      const createdTenant = {
        ...tenantData,
        id: tenantRef.id
      };

      // Initialiser les données de démonstration si nécessaire
      await this.initializeTenantData(createdTenant.id);

      return createdTenant;
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error creating tenant:', error);
      throw new TenantError(
        'Failed to create tenant',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir un tenant par ID
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const doc = await collections.tenants.doc(tenantId).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as Tenant;
    } catch (error) {
      console.error('Error getting tenant:', error);
      return null;
    }
  }

  /**
   * Obtenir un tenant par slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const query = await collections.tenants
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (query.empty) {
        return null;
      }

      const doc = query.docs[0];
      return { id: doc.id, ...doc.data() } as Tenant;
    } catch (error) {
      console.error('Error getting tenant by slug:', error);
      return null;
    }
  }

  /**
   * Mettre à jour un tenant
   */
  async updateTenant(tenantId: string, updates: UpdateTenantRequest): Promise<Tenant> {
    try {
      // Vérifier que le tenant existe
      const existingTenant = await this.getTenant(tenantId);
      if (!existingTenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Valider le nouveau slug s'il est fourni
      if (updates.slug && updates.slug !== existingTenant.slug) {
        if (await this.isSlugTaken(updates.slug)) {
          throw new TenantError(
            'Tenant slug already exists',
            TenantErrorCode.TENANT_SLUG_EXISTS
          );
        }
      }

      // Valider le nouveau plan s'il est fourni
      if (updates.planId && updates.planId !== existingTenant.planId) {
        const plan = getPlanById(updates.planId);
        if (!plan) {
          throw new TenantError(
            'Invalid plan ID',
            TenantErrorCode.TENANT_NOT_FOUND
          );
        }
      }

      // Préparer les données de mise à jour
      const updateData = {
        ...updates,
        // Fusionner les paramètres existants avec les nouveaux si fournis
        ...(updates.settings && {
          settings: { ...existingTenant.settings, ...updates.settings }
        }),
        updatedAt: new Date()
      };

      // Mettre à jour dans Firestore
      await collections.tenants.doc(tenantId).update(updateData);

      // Retourner le tenant mis à jour
      return {
        ...existingTenant,
        ...updateData
      };
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      console.error('Error updating tenant:', error);
      throw new TenantError(
        'Failed to update tenant',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Supprimer un tenant (soft delete)
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      await this.updateTenant(tenantId, {
        status: TenantStatus.CANCELLED
      });
      return true;
    } catch (error) {
      console.error('Error deleting tenant:', error);
      return false;
    }
  }

  /**
   * Suspendre un tenant
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<Tenant> {
    return await this.updateTenant(tenantId, {
      status: TenantStatus.SUSPENDED,
      metadata: { suspensionReason: reason }
    });
  }

  /**
   * Réactiver un tenant
   */
  async reactivateTenant(tenantId: string): Promise<Tenant> {
    return await this.updateTenant(tenantId, {
      status: TenantStatus.ACTIVE,
      metadata: { reactivatedAt: new Date() }
    });
  }

  /**
   * Lister les tenants avec pagination
   */
  async listTenants(options: TenantListOptions = {}): Promise<TenantListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        status,
        planId,
        searchTerm
      } = options;

      let query = collections.tenants.orderBy(sortBy, sortOrder);

      // Appliquer les filtres
      if (status) {
        query = query.where('status', '==', status) as any;
      }

      if (planId) {
        query = query.where('planId', '==', planId) as any;
      }

      // Compter le total
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Appliquer la pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query.offset(offset).limit(limit);
      const snapshot = await paginatedQuery.get();

      let tenants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));

      // Filtrer par terme de recherche (côté client)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        tenants = tenants.filter(tenant =>
          tenant.name.toLowerCase().includes(term) ||
          tenant.slug.toLowerCase().includes(term)
        );
      }

      return {
        tenants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + tenants.length < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error listing tenants:', error);
      throw new TenantError(
        'Failed to list tenants',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Mettre à jour l'usage d'un tenant
   */
  async updateTenantUsage(
    tenantId: string,
    usageType: keyof TenantUsage,
    increment: number = 1
  ): Promise<void> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const currentUsage = tenant.usage[usageType] || 0;
      const newUsage = Math.max(0, currentUsage + increment);

      await collections.tenants.doc(tenantId).update({
        [`usage.${usageType}`]: newUsage,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating tenant usage:', error);
      throw error;
    }
  }

  /**
   * Vérifier si un tenant a atteint ses limites
   */
  async checkTenantLimits(tenantId: string, limitType: string): Promise<{
    withinLimits: boolean;
    currentUsage: number;
    limit: number;
    percentage: number;
  }> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (!tenant) {
        throw new TenantError(
          'Tenant not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const plan = getPlanById(tenant.planId);
      if (!plan) {
        throw new TenantError(
          'Plan not found',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      const currentUsage = tenant.usage[limitType as keyof TenantUsage] || 0;
      const limit = plan.limits[limitType as keyof typeof plan.limits];

      // -1 signifie illimité
      if (limit === -1) {
        return {
          withinLimits: true,
          currentUsage,
          limit: -1,
          percentage: 0
        };
      }

      const percentage = (currentUsage / limit) * 100;
      const withinLimits = currentUsage < limit;

      return {
        withinLimits,
        currentUsage,
        limit,
        percentage
      };
    } catch (error) {
      console.error('Error checking tenant limits:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques globales des tenants
   */
  async getTenantStats(): Promise<{
    total: number;
    active: number;
    trial: number;
    suspended: number;
    cancelled: number;
    byPlan: Record<string, number>;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalSnapshot,
        activeSnapshot,
        trialSnapshot,
        suspendedSnapshot,
        cancelledSnapshot,
        createdTodaySnapshot,
        createdThisWeekSnapshot,
        createdThisMonthSnapshot
      ] = await Promise.all([
        collections.tenants.get(),
        collections.tenants.where('status', '==', TenantStatus.ACTIVE).get(),
        collections.tenants.where('status', '==', TenantStatus.TRIAL).get(),
        collections.tenants.where('status', '==', TenantStatus.SUSPENDED).get(),
        collections.tenants.where('status', '==', TenantStatus.CANCELLED).get(),
        collections.tenants.where('createdAt', '>=', today).get(),
        collections.tenants.where('createdAt', '>=', thisWeek).get(),
        collections.tenants.where('createdAt', '>=', thisMonth).get()
      ]);

      // Compter par plan
      const byPlan: Record<string, number> = {};
      totalSnapshot.docs.forEach(doc => {
        const tenant = doc.data() as Tenant;
        byPlan[tenant.planId] = (byPlan[tenant.planId] || 0) + 1;
      });

      return {
        total: totalSnapshot.size,
        active: activeSnapshot.size,
        trial: trialSnapshot.size,
        suspended: suspendedSnapshot.size,
        cancelled: cancelledSnapshot.size,
        byPlan,
        createdToday: createdTodaySnapshot.size,
        createdThisWeek: createdThisWeekSnapshot.size,
        createdThisMonth: createdThisMonthSnapshot.size
      };
    } catch (error) {
      console.error('Error getting tenant stats:', error);
      throw new TenantError(
        'Failed to get tenant stats',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Générer un slug unique basé sur le nom
   */
  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.isSlugTaken(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Vérifier si un slug est déjà pris
   */
  private async isSlugTaken(slug: string): Promise<boolean> {
    const query = await collections.tenants
      .where('slug', '==', slug)
      .limit(1)
      .get();

    return !query.empty;
  }

  /**
   * Obtenir les paramètres par défaut pour un nouveau tenant
   */
  private getDefaultSettings(): TenantSettings {
    return {
      timezone: 'Europe/Paris',
      locale: 'fr-FR',
      currency: 'EUR'
    };
  }

  /**
   * Obtenir l'usage initial pour un nouveau tenant
   */
  private getInitialUsage(): TenantUsage {
    return {
      users: 0,
      events: 0,
      storage: 0,
      apiCalls: 0
    };
  }

  /**
   * Initialiser les données de base pour un nouveau tenant
   */
  private async initializeTenantData(tenantId: string): Promise<void> {
    try {
      // Ici, on pourrait créer des données de démonstration
      // ou des configurations par défaut
      console.log(`Initializing data for tenant: ${tenantId}`);

      // TODO: Créer des données de démonstration
      // TODO: Configurer les templates de notification
      // TODO: Créer les rôles par défaut

    } catch (error) {
      console.error('Error initializing tenant data:', error);
      // Ne pas faire échouer la création du tenant pour ça
    }
  }
}

// Instance singleton
export const tenantService = new TenantService();
export default tenantService;