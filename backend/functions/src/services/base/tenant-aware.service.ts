/**
 * Service de base pour tous les services tenant-aware
 * Fournit les méthodes communes pour l'isolation des données par tenant
 */

import { CollectionReference, Query, DocumentData } from 'firebase-admin/firestore';
import { collections } from '../../config/database';
import { TenantScopedEntity, TenantError, TenantErrorCode } from '../../shared/types/tenant.types';

export abstract class TenantAwareService<T extends TenantScopedEntity> {
  protected collection: CollectionReference<DocumentData>;

  constructor(collectionName: string) {
    this.collection = collections[collectionName as keyof typeof collections] as CollectionReference<DocumentData>;
  }

  /**
   * Ajouter automatiquement le filtre tenant à une requête
   */
  protected addTenantFilter(query: Query<DocumentData>, tenantId: string): Query<DocumentData> {
    return query.where('tenantId', '==', tenantId);
  }

  /**
   * Valider que les données appartiennent au bon tenant
   */
  protected validateTenantOwnership(data: Partial<T>, tenantId: string): void {
    if (data.tenantId && data.tenantId !== tenantId) {
      throw new TenantError(
        'Data does not belong to the specified tenant',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }
  }

  /**
   * Ajouter automatiquement le tenantId aux données lors de la création
   */
  protected addTenantId(data: Partial<T>, tenantId: string): T {
    const now = new Date();
    return {
      ...data,
      tenantId,
      createdAt: data.createdAt || now,
      updatedAt: now
    } as T;
  }

  /**
   * Obtenir tous les documents d'un tenant avec pagination
   */
  protected async getAllByTenant(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      filters?: Array<{ field: string; operator: any; value: any }>;
    } = {}
  ): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    let query: Query<DocumentData> = this.addTenantFilter(this.collection, tenantId);

    // Appliquer les filtres additionnels
    if (options.filters) {
      for (const filter of options.filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }
    }

    // Appliquer le tri
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    }

    // Compter le total (sans pagination)
    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    // Appliquer la pagination
    if (options.offset) {
      query = query.offset(options.offset);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));

    return {
      data,
      total,
      hasMore: options.limit ? (options.offset || 0) + data.length < total : false
    };
  }

  /**
   * Obtenir un document par ID avec validation tenant
   */
  protected async getByIdAndTenant(id: string, tenantId: string): Promise<T | null> {
    const doc = await this.collection.doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const data = { id: doc.id, ...doc.data() } as unknown as T;

    // Valider que le document appartient au bon tenant
    if (data.tenantId !== tenantId) {
      throw new TenantError(
        'Document does not belong to the specified tenant',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    return data;
  }

  /**
   * Créer un document avec tenantId automatique
   */
  protected async createWithTenant(data: Partial<T>, tenantId: string): Promise<T> {
    const documentData = this.addTenantId(data, tenantId);
    const docRef = await this.collection.add(documentData);

    return {
      id: docRef.id,
      ...documentData
    } as T;
  }

  /**
   * Mettre à jour un document avec validation tenant
   */
  protected async updateWithTenant(id: string, data: Partial<T>, tenantId: string): Promise<T> {
    // Vérifier que le document existe et appartient au tenant
    const existing = await this.getByIdAndTenant(id, tenantId);
    if (!existing) {
      throw new TenantError(
        'Document not found or access denied',
        TenantErrorCode.TENANT_ACCESS_DENIED
      );
    }

    // Valider les nouvelles données
    this.validateTenantOwnership(data, tenantId);

    const updateData = {
      ...data,
      tenantId, // S'assurer que le tenantId ne change pas
      updatedAt: new Date()
    };

    await this.collection.doc(id).update(updateData);

    return {
      ...existing,
      ...updateData
    } as T;
  }

  /**
   * Supprimer un document avec validation tenant
   */
  protected async deleteWithTenant(id: string, tenantId: string): Promise<boolean> {
    // Vérifier que le document existe et appartient au tenant
    const existing = await this.getByIdAndTenant(id, tenantId);
    if (!existing) {
      return false;
    }

    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Compter les documents d'un tenant
   */
  protected async countByTenant(
    tenantId: string,
    filters?: Array<{ field: string; operator: any; value: any }>
  ): Promise<number> {
    let query: Query<DocumentData> = this.addTenantFilter(this.collection, tenantId);

    if (filters) {
      for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }
    }

    const snapshot = await query.get();
    return snapshot.size;
  }

  /**
   * Recherche avec texte libre (si supporté par Firestore)
   */
  protected async searchByTenant(
    tenantId: string,
    searchField: string,
    searchTerm: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<T[]> {
    let query: Query<DocumentData> = this.addTenantFilter(this.collection, tenantId);

    // Recherche par préfixe (limitation de Firestore)
    query = query
      .where(searchField, '>=', searchTerm)
      .where(searchField, '<=', searchTerm + '\uf8ff');

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
  }

  /**
   * Obtenir des statistiques de base pour un tenant
   */
  protected async getStatsForTenant(tenantId: string): Promise<{
    total: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, createdToday, createdThisWeek, createdThisMonth] = await Promise.all([
      this.countByTenant(tenantId),
      this.countByTenant(tenantId, [{ field: 'createdAt', operator: '>=', value: today }]),
      this.countByTenant(tenantId, [{ field: 'createdAt', operator: '>=', value: thisWeek }]),
      this.countByTenant(tenantId, [{ field: 'createdAt', operator: '>=', value: thisMonth }])
    ]);

    return {
      total,
      createdToday,
      createdThisWeek,
      createdThisMonth
    };
  }
}

/**
 * Décorateur pour valider automatiquement le tenantId dans les méthodes de service
 */
export function ValidateTenant(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

  if (typeof originalMethod !== 'function') {
    throw new Error(`@ValidateTenant can only be applied to methods, but ${propertyName} is not a function`);
  }

  descriptor.value = function (...args: any[]) {
    const tenantId = args[0];
    if (!tenantId || typeof tenantId !== 'string') {
      throw new TenantError(
        'Valid tenant ID is required',
        TenantErrorCode.TENANT_NOT_FOUND
      );
    }
    return originalMethod.apply(this, args);
  };

  return descriptor;
}

export default TenantAwareService;