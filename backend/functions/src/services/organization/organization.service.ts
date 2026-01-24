import { OrganizationModel } from "../../models/organization.model";
import { collections } from "../../config/database";
import { 
  Organization, 
  CreateOrganizationRequest, 
  UpdateOrganizationRequest,
  OrganizationSettings,
  OrganizationBranding,
  DomainCheckResponse
} from "../../types/organization.types";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/common/errors";
import { logger } from "firebase-functions";

export class OrganizationService {
  
  async createOrganization(
    request: CreateOrganizationRequest, 
    tenantId: string, 
    userId: string
  ): Promise<Organization> {
    // Input validation
    if (!request) {
      throw new ValidationError("Organization request is required");
    }
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError("Tenant ID is required");
    }
    if (!userId || userId.trim() === '') {
      throw new ValidationError("User ID is required");
    }
    try {
      // Validation métier
      await this.validateCreateRequest(request, tenantId);
      
      // Créer le modèle
      const organizationModel = OrganizationModel.fromCreateRequest({
        ...request,
        tenantId,
        createdBy: userId
      });
      
      // Valider le modèle
      await organizationModel.validate();
      
      // Sauvegarder
      const orgRef = collections.organizations.doc();
      await orgRef.set(organizationModel.toFirestore());
      
      logger.info(`✅ Organization created: ${orgRef.id}`, {
        organizationId: orgRef.id,
        tenantId,
        userId,
        subdomain: request.subdomain
      });
      
      // Retourner l'entité
      return {
        id: orgRef.id,
        ...organizationModel.toAPI()
      } as Organization;
      
    } catch (error: any) {
      logger.error(`❌ Failed to create organization:`, {
        error: error.message,
        stack: error.stack,
        tenantId,
        userId,
        subdomain: request.subdomain
      });
      
      // Re-throw specific errors
      if (error instanceof ValidationError || 
          error instanceof ConflictError) {
        throw error;
      }
      
      // Wrap generic errors
      throw new Error(`Failed to create organization: ${error.message}`);
    }
  }

  async getOrganization(organizationId: string, tenantId: string): Promise<Organization | null> {
    // Input validation
    if (!organizationId || organizationId.trim() === '') {
      throw new ValidationError("Organization ID is required");
    }
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError("Tenant ID is required");
    }

    try {
      const doc = await collections.organizations.doc(organizationId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const organizationModel = OrganizationModel.fromFirestore(doc);
      if (!organizationModel || organizationModel.getData().tenantId !== tenantId) {
        return null;
      }
      
      return organizationModel.toAPI() as Organization;
    } catch (error: any) {
      logger.error(`❌ Failed to get organization:`, {
        error: error.message,
        organizationId,
        tenantId
      });
      throw new Error(`Failed to get organization: ${error.message}`);
    }
  }

  async getOrganizationByTenant(tenantId: string): Promise<Organization | null> {
    // Input validation
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError("Tenant ID is required");
    }

    try {
      const snapshot = await collections.organizations
        .where('tenantId', '==', tenantId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const organizationModel = OrganizationModel.fromFirestore(snapshot.docs[0]);
      if (!organizationModel) {
        return null;
      }
      
      return organizationModel.toAPI() as Organization;
    } catch (error: any) {
      logger.error(`❌ Failed to get organization by tenant:`, {
        error: error.message,
        tenantId
      });
      throw new Error(`Failed to get organization by tenant: ${error.message}`);
    }
  }

  async updateOrganization(
    organizationId: string, 
    updates: UpdateOrganizationRequest, 
    tenantId: string
  ): Promise<Organization> {
    // Input validation
    if (!organizationId || organizationId.trim() === '') {
      throw new ValidationError("Organization ID is required");
    }
    if (!updates) {
      throw new ValidationError("Updates object is required");
    }
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError("Tenant ID is required");
    }

    try {
      const existing = await this.getOrganization(organizationId, tenantId);
      if (!existing) {
        throw new NotFoundError("Organization not found");
      }
      
      // Validation des mises à jour
      await this.validateUpdateRequest(updates, tenantId, organizationId);
      
      // Appliquer les mises à jour avec merge correct
      const updatedData: Organization = {
        ...existing,
        ...updates,
        // Properly merge settings if provided
        settings: updates.settings ? {
          ...existing.settings,
          ...updates.settings
        } : existing.settings,
        // Properly merge branding if provided
        branding: updates.branding ? {
          ...existing.branding,
          ...updates.branding
        } : existing.branding,
        updatedAt: new Date()
      };
      
      const organizationModel = new OrganizationModel(updatedData);
      await organizationModel.validate();
      
      await collections.organizations.doc(organizationId).update(organizationModel.toFirestore());
      
      logger.info(`✅ Organization updated: ${organizationId}`, {
        organizationId,
        tenantId,
        updates: Object.keys(updates)
      });
      
      return organizationModel.toAPI() as Organization;
    } catch (error: any) {
      logger.error(`❌ Failed to update organization:`, {
        error: error.message,
        organizationId,
        tenantId
      });
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {throw error;}
      throw new Error(`Failed to update organization: ${error.message}`);
    }
  }

  async updateOrganizationSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>,
    tenantId: string
  ): Promise<Organization> {
    try {
      const existing = await this.getOrganization(organizationId, tenantId);
      if (!existing) {
        throw new NotFoundError("Organization not found");
      }

      const updatedSettings = {
        ...existing.settings,
        ...settings
      };

      return await this.updateOrganization(organizationId, { settings: updatedSettings }, tenantId);
    } catch (error: any) {
      logger.error(`❌ Failed to update organization settings:`, {
        error: error.message,
        organizationId,
        tenantId
      });
      throw error;
    }
  }

  async updateOrganizationBranding(
    organizationId: string,
    branding: Partial<OrganizationBranding>,
    tenantId: string
  ): Promise<Organization> {
    try {
      const existing = await this.getOrganization(organizationId, tenantId);
      if (!existing) {
        throw new NotFoundError("Organization not found");
      }

      const updatedBranding = {
        ...existing.branding,
        ...branding
      };

      return await this.updateOrganization(organizationId, { branding: updatedBranding }, tenantId);
    } catch (error: any) {
      logger.error(`❌ Failed to update organization branding:`, {
        error: error.message,
        organizationId,
        tenantId
      });
      throw error;
    }
  }

  async deleteOrganization(organizationId: string, tenantId: string): Promise<void> {
    try {
      const existing = await this.getOrganization(organizationId, tenantId);
      if (!existing) {
        throw new NotFoundError("Organization not found");
      }
      
      await collections.organizations.doc(organizationId).delete();
      
      logger.info(`🗑️ Organization deleted: ${organizationId}`, {
        organizationId,
        tenantId
      });
    } catch (error: any) {
      logger.error(`❌ Failed to delete organization:`, {
        error: error.message,
        organizationId,
        tenantId
      });
      
      if (error instanceof NotFoundError) {throw error;}
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }

  async checkDomainAvailability(domain: string): Promise<DomainCheckResponse> {
    try {
      const existing = await collections.organizations
        .where('domain.subdomain', '==', domain)
        .limit(1)
        .get();

      const available = existing.empty;
      const suggestions = available ? [] : this.generateSubdomainSuggestions(domain);

      return {
        available,
        suggestions,
        conflicts: available ? [] : [domain]
      };
    } catch (error: any) {
      logger.error(`❌ Failed to check domain availability:`, {
        error: error.message,
        domain
      });
      throw new Error(`Failed to check domain availability: ${error.message}`);
    }
  }

  async getOrganizationsByTenant(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    organizations: Organization[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      
      let query = collections.organizations
        .where('tenantId', '==', tenantId)
        .orderBy(sortBy, sortOrder);
      
      // Apply pagination
      if (offset > 0) {
        const offsetQuery = await query.limit(offset).get();
        if (!offsetQuery.empty) {
          const lastDoc = offsetQuery.docs[offsetQuery.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }
      
      const snapshot = await query.limit(limit + 1).get();
      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
      
      const organizations = docs
        .map(doc => OrganizationModel.fromFirestore(doc))
        .filter(model => model !== null)
        .map(model => model!.toAPI() as Organization);
      
      // Get total count (cached or approximate)
      const totalSnapshot = await collections.organizations
        .where('tenantId', '==', tenantId)
        .get();
      
      return {
        organizations,
        total: totalSnapshot.size,
        hasMore
      };
    } catch (error: any) {
      logger.error(`❌ Failed to get organizations by tenant:`, {
        error: error.message,
        tenantId
      });
      throw new Error(`Failed to get organizations by tenant: ${error.message}`);
    }
  }

  async batchUpdateOrganizations(
    updates: Array<{ id: string; data: UpdateOrganizationRequest }>,
    tenantId: string
  ): Promise<Organization[]> {
    try {
      if (!updates || updates.length === 0) {
        throw new ValidationError("Updates array is required and cannot be empty");
      }
      
      if (updates.length > 500) {
        throw new ValidationError("Cannot update more than 500 organizations at once");
      }

      const batch = collections.organizations.firestore.batch();
      const results: Organization[] = [];
      
      // Validate all updates first
      for (const update of updates) {
        const existing = await this.getOrganization(update.id, tenantId);
        if (!existing) {
          throw new NotFoundError(`Organization ${update.id} not found`);
        }
        
        await this.validateUpdateRequest(update.data, tenantId, update.id);
        
        const updatedData: Organization = {
          ...existing,
          ...update.data,
          // Properly merge settings if provided
          settings: update.data.settings ? {
            ...existing.settings,
            ...update.data.settings
          } : existing.settings,
          // Properly merge branding if provided
          branding: update.data.branding ? {
            ...existing.branding,
            ...update.data.branding
          } : existing.branding,
          updatedAt: new Date()
        };
        
        const organizationModel = new OrganizationModel(updatedData);
        await organizationModel.validate();
        
        batch.update(collections.organizations.doc(update.id), organizationModel.toFirestore());
        results.push(organizationModel.toAPI() as Organization);
      }
      
      await batch.commit();
      
      logger.info(`✅ Batch updated ${updates.length} organizations`, {
        tenantId,
        organizationIds: updates.map(u => u.id)
      });
      
      return results;
    } catch (error: any) {
      logger.error(`❌ Failed to batch update organizations:`, {
        error: error.message,
        tenantId,
        updateCount: updates?.length || 0
      });
      
      if (error instanceof ValidationError || 
          error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to batch update organizations: ${error.message}`);
    }
  }

  // Méthodes privées de validation

  private async validateCreateRequest(
    request: CreateOrganizationRequest, 
    tenantId: string
  ): Promise<void> {
    // Vérifier qu'il n'y a pas déjà une organisation pour ce tenant
    const existingByTenant = await this.getOrganizationByTenant(tenantId);
    if (existingByTenant) {
      throw new ConflictError("An organization already exists for this tenant");
    }

    // Vérifier l'unicité du sous-domaine
    await this.validateSubdomainAvailability(request.subdomain);

    // Vérifier l'unicité du domaine personnalisé si fourni
    if (request.customDomain) {
      await this.validateCustomDomainAvailability(request.customDomain);
    }
  }

  private async validateUpdateRequest(
    updates: UpdateOrganizationRequest, 
    _tenantId: string,
    _organizationId: string
  ): Promise<void> {
    // Validation spécifique selon les champs mis à jour
    if (updates.name) {
      // Vérifier l'unicité du nom dans le tenant (si nécessaire)
    }
  }

  private async validateSubdomainAvailability(subdomain: string, excludeId?: string): Promise<void> {
    // Add limit for performance and proper indexing
    const snapshot = await collections.organizations
      .where('domain.subdomain', '==', subdomain)
      .limit(excludeId ? 2 : 1) // Limit results for performance
      .get();
    
    const conflicts = snapshot.docs.filter(doc => doc.id !== excludeId);
    
    if (conflicts.length > 0) {
      throw new ConflictError("Subdomain already exists");
    }
  }

  private async validateCustomDomainAvailability(domain: string, excludeId?: string): Promise<void> {
    // Add limit for performance and proper indexing
    const snapshot = await collections.organizations
      .where('domain.customDomain', '==', domain)
      .limit(excludeId ? 2 : 1) // Limit results for performance
      .get();
    
    const conflicts = snapshot.docs.filter(doc => doc.id !== excludeId);
    
    if (conflicts.length > 0) {
      throw new ConflictError("Custom domain already exists");
    }
  }

  // Méthodes utilitaires

  private generateSubdomainSuggestions(subdomain: string): string[] {
    const suggestions = [];
    for (let i = 1; i <= 3; i++) {
      suggestions.push(`${subdomain}${i}`);
      suggestions.push(`${subdomain}-${i}`);
    }
    return suggestions;
  }
}

export const organizationService = new OrganizationService();