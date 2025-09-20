/**
 * Service de gestion du contexte tenant
 * Gère le chargement, la mise en cache et la validation des contextes tenant
 */

import { 
  TenantContext, 
  Tenant, 
  TenantMembership,
  TenantError,
  TenantErrorCode,
  TenantStatus
} from '../../common/types';
import { collections } from '../../config/database';
import { getPlanById } from '../../config/default-plans';
import { tenantService } from './tenant.service';

// Cache en mémoire pour les contextes tenant
interface CachedContext {
  context: TenantContext;
  expiry: number;
  lastAccessed: number;
}

export class TenantContextService {
  private contextCache = new Map<string, CachedContext>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    // Nettoyer le cache périodiquement
    setInterval(() => this.cleanupCache(), this.CLEANUP_INTERVAL);
  }

  /**
   * Obtenir le contexte tenant complet pour un utilisateur
   */
  async getTenantContext(userId: string, tenantId: string): Promise<TenantContext | null> {
    try {
      // Vérifier le cache d'abord
      const cacheKey = `${userId}:${tenantId}`;
      const cached = this.contextCache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        // Mettre à jour le timestamp d'accès
        cached.lastAccessed = Date.now();
        return cached.context;
      }

      // Charger depuis la base de données
      const context = await this.loadTenantContext(userId, tenantId);
      
      if (context) {
        // Mettre en cache
        this.setCachedContext(cacheKey, context);
      }

      return context;
    } catch (error) {
      console.error('Error getting tenant context:', error);
      return null;
    }
  }

  /**
   * Valider l'accès d'un utilisateur à un tenant
   */
  async validateTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      const context = await this.getTenantContext(userId, tenantId);
      
      if (!context) {
        return false;
      }

      // Vérifier que le membership est actif
      if (!context.membership.isActive) {
        return false;
      }

      // Vérifier le statut du tenant
      if (context.tenant.status === TenantStatus.SUSPENDED || 
          context.tenant.status === TenantStatus.CANCELLED) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating tenant access:', error);
      return false;
    }
  }

  /**
   * Changer le contexte tenant actif pour un utilisateur
   */
  async switchTenantContext(userId: string, newTenantId: string): Promise<TenantContext | null> {
    try {
      // Valider l'accès au nouveau tenant
      const hasAccess = await this.validateTenantAccess(userId, newTenantId);
      if (!hasAccess) {
        throw new TenantError(
          'Access denied to the specified tenant',
          TenantErrorCode.TENANT_ACCESS_DENIED
        );
      }

      // Obtenir le nouveau contexte
      const newContext = await this.getTenantContext(userId, newTenantId);
      if (!newContext) {
        throw new TenantError(
          'Failed to load tenant context',
          TenantErrorCode.TENANT_NOT_FOUND
        );
      }

      // Mettre à jour le tenant actif de l'utilisateur
      await collections.users.doc(userId).update({
        activeTenantId: newTenantId,
        updatedAt: new Date()
      });

      // Invalider les anciens contextes en cache pour cet utilisateur
      this.invalidateUserContexts(userId);

      return newContext;
    } catch (error) {
      console.error('Error switching tenant context:', error);
      if (error instanceof TenantError) {
        throw error;
      }
      throw new TenantError(
        'Failed to switch tenant context',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
  }

  /**
   * Obtenir tous les tenants auxquels un utilisateur a accès
   */
  async getUserTenants(userId: string): Promise<Array<{
    tenant: Tenant;
    membership: TenantMembership;
    isActive: boolean;
  }>> {
    try {
      // Obtenir tous les memberships actifs de l'utilisateur
      const membershipsQuery = await collections.tenant_memberships
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      if (membershipsQuery.empty) {
        return [];
      }

      // Charger les détails de chaque tenant
      const tenantPromises = membershipsQuery.docs.map(async (doc) => {
        const membership = { id: doc.id, ...doc.data() } as TenantMembership;
        const tenant = await tenantService.getTenant(membership.tenantId);
        
        if (!tenant) {
          return null;
        }

        // Vérifier si c'est le tenant actif
        const userDoc = await collections.users.doc(userId).get();
        const userData = userDoc.data();
        const isActive = userData?.activeTenantId === tenant.id;

        return {
          tenant,
          membership,
          isActive
        };
      });

      const results = await Promise.all(tenantPromises);
      return results.filter(result => result !== null) as Array<{
        tenant: Tenant;
        membership: TenantMembership;
        isActive: boolean;
      }>;
    } catch (error) {
      console.error('Error getting user tenants:', error);
      return [];
    }
  }

  /**
   * Invalider le cache pour un contexte spécifique
   */
  invalidateContext(userId: string, tenantId: string): void {
    const cacheKey = `${userId}:${tenantId}`;
    this.contextCache.delete(cacheKey);
  }

  /**
   * Invalider tous les contextes en cache pour un utilisateur
   */
  invalidateUserContexts(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.contextCache) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.contextCache.delete(key));
  }

  /**
   * Invalider tous les contextes en cache pour un tenant
   */
  invalidateTenantContexts(tenantId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.contextCache) {
      if (key.endsWith(`:${tenantId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.contextCache.delete(key));
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const now = Date.now();
    let oldestEntry = now;
    let newestEntry = 0;
    const totalHits = 0;
    const totalRequests = 0;

    for (const [, cached] of this.contextCache) {
      if (cached.lastAccessed < oldestEntry) {
        oldestEntry = cached.lastAccessed;
      }
      if (cached.lastAccessed > newestEntry) {
        newestEntry = cached.lastAccessed;
      }
    }

    return {
      size: this.contextCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      oldestEntry: now - oldestEntry,
      newestEntry: now - newestEntry
    };
  }

  /**
   * Charger le contexte tenant depuis la base de données
   */
  private async loadTenantContext(userId: string, tenantId: string): Promise<TenantContext | null> {
    try {
      // Charger le tenant
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        return null;
      }

      // Charger le membership de l'utilisateur
      const membershipQuery = await collections.tenant_memberships
        .where('tenantId', '==', tenantId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (membershipQuery.empty) {
        return null;
      }

      const membershipDoc = membershipQuery.docs[0];
      const membership = { id: membershipDoc.id, ...membershipDoc.data() } as TenantMembership;

      // Charger le plan d'abonnement
      const plan = getPlanById(tenant.planId);
      if (!plan) {
        console.error(`Plan not found: ${tenant.planId}`);
        return null;
      }

      // Créer le contexte
      const context: TenantContext = {
        tenantId,
        tenant,
        membership,
        permissions: membership.permissions,
        plan
      };

      return context;
    } catch (error) {
      console.error('Error loading tenant context:', error);
      return null;
    }
  }

  /**
   * Mettre un contexte en cache
   */
  private setCachedContext(cacheKey: string, context: TenantContext): void {
    // Vérifier la taille du cache et nettoyer si nécessaire
    if (this.contextCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntries();
    }

    const now = Date.now();
    this.contextCache.set(cacheKey, {
      context,
      expiry: now + this.CACHE_TTL,
      lastAccessed: now
    });
  }

  /**
   * Nettoyer le cache des entrées expirées
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.contextCache) {
      if (cached.expiry <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.contextCache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Évincer les entrées les plus anciennes du cache
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.contextCache.entries());
    
    // Trier par dernier accès (plus ancien en premier)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Supprimer les 10% les plus anciens
    const toEvict = Math.ceil(entries.length * 0.1);
    
    for (let i = 0; i < toEvict; i++) {
      this.contextCache.delete(entries[i][0]);
    }

    console.log(`Evicted ${toEvict} oldest cache entries`);
  }
}

// Instance singleton
export const tenantContextService = new TenantContextService();
export default tenantContextService;