import {
  CampaignTemplate,
  CampaignTemplateCategory,
  CampaignType,
  EmailCampaignErrorCodes,
  CreateCampaignTemplateRequest,
  UpdateCampaignTemplateRequest,
  TemplatePreviewRequest,
  TemplateShareRequest,
  TemplateDuplicationRequest,
  TemplateUsageStats,
  EmailTemplateCategory
} from '@attendance-x/shared';
import { collections, generateId } from '../config/database';
import { logger } from 'firebase-functions';
import { createError } from '../middleware/errorHandler';

export class CampaignTemplateService {

  /**
   * Create a new campaign template
   */
  async createTemplate(
    organizationId: string | null, // null for system templates
    userId: string,
    request: CreateCampaignTemplateRequest
  ): Promise<CampaignTemplate> {
    try {
      const templateId = generateId('tmpl_');

      const template: CampaignTemplate = {
        id: templateId,
        organizationId,
        name: request.name,
        description: request.description || '',
        category: request.category as unknown as EmailTemplateCategory,
        campaignType: request.campaignType,
        subject: request.subject,
        htmlContent: request.htmlContent,
        textContent: request.textContent || '',
        variables: request.variables?.map(v => v.name) || [],
        language: 'fr', // Default to French for Attendance-X
        isActive: true,
        isDefault: false,
        isSystemTemplate: organizationId === null,
        isPublicTemplate: request.isPublicTemplate || false,

        // Campaign-specific fields
        campaignVariables: request.variables || [],
        designMetadata: {
          colorScheme: request.designMetadata?.colorScheme || 'default',
          fontFamily: request.designMetadata?.fontFamily || 'Arial, sans-serif',
          layout: request.designMetadata?.layout || 'single-column',
          responsive: request.designMetadata?.responsive ?? true
        },
        previewImages: [],

        // Usage analytics
        campaignUsage: {
          timesUsed: 0,
          lastUsedInCampaign: undefined,
          avgDeliveryRate: undefined,
          avgOpenRate: undefined,
          avgClickRate: undefined
        },

        // Base fields
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),

        // Template settings
        settings: {
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true,
          customCss: undefined
        },

        // Audit fields
        lastModifiedBy: userId,
        version: 1,
        tags: [],
        usage: {
          timesUsed: 0,
          lastUsed: undefined,
          avgOpenRate: 0,
          avgClickRate: 0
        }
      };

      await collections.email_templates.doc(templateId).set(template);

      logger.info(`Campaign template created: ${templateId} for organization: ${organizationId || 'system'}`);

      return template;
    } catch (error) {
      logger.error('Error creating campaign template:', error);
      throw createError(
        'Failed to create campaign template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(
    templateId: string,
    organizationId?: string
  ): Promise<CampaignTemplate | null> {
    try {
      const doc = await collections.email_templates.doc(templateId).get();

      if (!doc.exists) {
        return null;
      }

      const template = doc.data() as CampaignTemplate;

      // Check access permissions
      if (!this.canAccessTemplate(template, organizationId)) {
        throw createError(
          'Template not found or access denied',
          404,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      return template;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Template not found')) {
        throw error;
      }

      logger.error('Error getting campaign template:', error);
      throw createError(
        'Failed to get campaign template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE,
        { templateId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get templates with filters
   */
  async getTemplates(
    organizationId?: string,
    filters?: {
      category?: CampaignTemplateCategory;
      campaignType?: CampaignType;
      isSystemTemplate?: boolean;
      isPublicTemplate?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ templates: CampaignTemplate[]; total: number }> {
    try {
      let query = collections.email_templates.orderBy('createdAt', 'desc');

      // Build access filter
      if (organizationId) {
        // User can access: system templates, public templates, and their organization's templates
        query = query.where('organizationId', 'in', [null, organizationId]);
      } else {
        // Only system templates if no organization specified
        query = query.where('isSystemTemplate', '==', true);
      }

      // Apply additional filters
      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters?.campaignType) {
        query = query.where('campaignType', '==', filters.campaignType);
      }

      if (filters?.isSystemTemplate !== undefined) {
        query = query.where('isSystemTemplate', '==', filters.isSystemTemplate);
      }

      if (filters?.isPublicTemplate !== undefined) {
        query = query.where('isPublicTemplate', '==', filters.isPublicTemplate);
      }

      // Apply pagination
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      let templates = snapshot.docs.map(doc => doc.data() as CampaignTemplate);

      // Additional filtering for public templates (since Firestore doesn't support complex OR queries)
      if (organizationId) {
        templates = templates.filter(template =>
          this.canAccessTemplate(template, organizationId)
        );
      }

      // Get total count
      const countQuery = collections.email_templates;
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      return { templates, total };
    } catch (error) {
      logger.error('Error getting campaign templates:', error);
      throw createError(
        'Failed to get campaign templates',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE,
        { organizationId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    organizationId: string,
    userId: string,
    request: UpdateCampaignTemplateRequest
  ): Promise<CampaignTemplate> {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      if (!template) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      // Check if user can modify this template
      if (template.isSystemTemplate) {
        throw createError(
          'Cannot modify system templates',
          403,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      if (template.organizationId !== organizationId) {
        throw createError(
          'Cannot modify templates from other organizations',
          403,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      // Add fields from request, handling designMetadata specially
      if (request.name !== undefined) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.category !== undefined) updateData.category = request.category;
      if (request.subject !== undefined) updateData.subject = request.subject;
      if (request.htmlContent !== undefined) updateData.htmlContent = request.htmlContent;
      if (request.textContent !== undefined) updateData.textContent = request.textContent;
      if (request.variables !== undefined) {
        updateData.variables = request.variables?.map(v => v.name) || [];
        updateData.campaignVariables = request.variables || [];
      }
      if (request.isPublicTemplate !== undefined) updateData.isPublicTemplate = request.isPublicTemplate;
      
      // Handle designMetadata with proper defaults
      if (request.designMetadata !== undefined) {
        updateData.designMetadata = {
          colorScheme: request.designMetadata.colorScheme || template.designMetadata?.colorScheme || 'default',
          fontFamily: request.designMetadata.fontFamily || template.designMetadata?.fontFamily || 'Arial, sans-serif',
          layout: request.designMetadata.layout || template.designMetadata?.layout || 'single-column',
          responsive: request.designMetadata.responsive ?? template.designMetadata?.responsive ?? true
        };
      }

      await collections.email_templates.doc(templateId).update(updateData);

      // Get updated template
      const updatedTemplate = await this.getTemplateById(templateId, organizationId);

      logger.info(`Campaign template updated: ${templateId} by user: ${userId}`);

      return updatedTemplate!;
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Template not found') ||
        error.message.includes('Cannot modify')
      )) {
        throw error;
      }

      logger.error('Error updating campaign template:', error);
      throw createError(
        'Failed to update campaign template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE,
        { templateId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, organizationId: string): Promise<void> {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      if (!template) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      // Check if template can be deleted
      if (template.isSystemTemplate) {
        throw createError(
          'Cannot delete system templates',
          403,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      if (template.organizationId !== organizationId) {
        throw createError(
          'Cannot delete templates from other organizations',
          403,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      // Check if template is being used in active campaigns
      const campaignsUsingTemplate = await collections.email_campaigns
        .where('templateId', '==', templateId)
        .where('status', 'in', ['draft', 'scheduled', 'sending'])
        .limit(1)
        .get();

      if (!campaignsUsingTemplate.empty) {
        throw createError(
          'Cannot delete template that is being used in active campaigns',
          400,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      await collections.email_templates.doc(templateId).delete();

      logger.info(`Campaign template deleted: ${templateId}`);
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Template not found') ||
        error.message.includes('Cannot delete')
      )) {
        throw error;
      }

      logger.error('Error deleting campaign template:', error);
      throw createError(
        'Failed to delete campaign template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE,
        { templateId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(
    templateId: string,
    organizationId: string,
    userId: string,
    request: TemplateDuplicationRequest
  ): Promise<CampaignTemplate> {
    try {
      const originalTemplate = await this.getTemplateById(templateId, organizationId);

      if (!originalTemplate) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      const duplicateRequest: CreateCampaignTemplateRequest = {
        name: request.name || `${originalTemplate.name} (Copy)`,
        description: request.description || originalTemplate.description,
        category: originalTemplate.category as unknown as CampaignTemplateCategory,
        campaignType: originalTemplate.campaignType,
        subject: originalTemplate.subject,
        htmlContent: originalTemplate.htmlContent,
        textContent: originalTemplate.textContent,
        variables: originalTemplate.campaignVariables,
        designMetadata: originalTemplate.designMetadata,
        isPublicTemplate: false // Duplicates are always private
      };

      const duplicatedTemplate = await this.createTemplate(organizationId, userId, duplicateRequest);

      logger.info(`Campaign template duplicated: ${templateId} -> ${duplicatedTemplate.id}`);

      return duplicatedTemplate;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Template not found')) {
        throw error;
      }

      logger.error('Error duplicating campaign template:', error);
      throw createError(
        'Failed to duplicate campaign template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE,
        { templateId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Update template usage statistics
   */
  async updateTemplateUsage(
    templateId: string,
    campaignId: string,
    deliveryRate?: number,
    openRate?: number,
    clickRate?: number
  ): Promise<void> {
    try {
      const template = await this.getTemplateById(templateId);

      if (!template) {
        return; // Template not found, skip update
      }

      const currentUsage = template.campaignUsage;
      const newTimesUsed = currentUsage.timesUsed + 1;

      // Calculate new averages
      const newAvgDeliveryRate = deliveryRate !== undefined
        ? this.calculateNewAverage(currentUsage.avgDeliveryRate, deliveryRate, newTimesUsed)
        : currentUsage.avgDeliveryRate;

      const newAvgOpenRate = openRate !== undefined
        ? this.calculateNewAverage(currentUsage.avgOpenRate, openRate, newTimesUsed)
        : currentUsage.avgOpenRate;

      const newAvgClickRate = clickRate !== undefined
        ? this.calculateNewAverage(currentUsage.avgClickRate, clickRate, newTimesUsed)
        : currentUsage.avgClickRate;

      const updatedUsage = {
        timesUsed: newTimesUsed,
        lastUsedInCampaign: campaignId,
        avgDeliveryRate: newAvgDeliveryRate,
        avgOpenRate: newAvgOpenRate,
        avgClickRate: newAvgClickRate
      };

      await collections.email_templates.doc(templateId).update({
        campaignUsage: updatedUsage,
        updatedAt: new Date()
      });

      logger.debug(`Template usage updated: ${templateId}`);
    } catch (error) {
      logger.error('Error updating template usage:', error);
      // Don't throw error for usage updates to avoid breaking campaign flow
    }
  }

  /**
   * Check if user can access template
   */
  private canAccessTemplate(template: CampaignTemplate, organizationId?: string): boolean {
    // System templates are accessible to everyone
    if (template.isSystemTemplate) {
      return true;
    }

    // Public templates are accessible to everyone
    if (template.isPublicTemplate) {
      return true;
    }

    // Organization templates are only accessible to members of that organization
    if (template.organizationId && organizationId) {
      return template.organizationId === organizationId;
    }

    return false;
  }

  /**
   * Calculate new average for metrics
   */
  private calculateNewAverage(
    currentAverage: number | undefined,
    newValue: number,
    totalCount: number
  ): number {
    if (currentAverage === undefined || totalCount === 1) {
      return newValue;
    }

    return ((currentAverage * (totalCount - 1)) + newValue) / totalCount;
  }

  /**
   * Get system templates with filters
   */
  async getSystemTemplates(filters?: {
    category?: CampaignTemplateCategory;
    type?: CampaignType;
    search?: string;
  }): Promise<CampaignTemplate[]> {
    try {
      let query = collections.email_templates
        .where('isSystemTemplate', '==', true)
        .where('isActive', '==', true);

      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters?.type) {
        query = query.where('campaignType', '==', filters.type);
      }

      const snapshot = await query.get();
      let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignTemplate));

      // Apply search filter in memory (Firestore doesn't support full-text search)
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        templates = templates.filter(template =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description?.toLowerCase().includes(searchTerm)
        );
      }

      return templates;
    } catch (error) {
      logger.error('Error getting system templates:', error);
      throw createError(
        'Failed to get system templates',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }

  /**
   * Get organization templates with filters
   */
  async getOrganizationTemplates(
    organizationId: string,
    filters?: {
      category?: CampaignTemplateCategory;
      type?: CampaignType;
      search?: string;
    }
  ): Promise<CampaignTemplate[]> {
    try {
      let query = collections.email_templates
        .where('organizationId', '==', organizationId)
        .where('isSystemTemplate', '==', false)
        .where('isActive', '==', true);

      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters?.type) {
        query = query.where('campaignType', '==', filters.type);
      }

      const snapshot = await query.get();
      let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignTemplate));

      // Apply search filter in memory
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        templates = templates.filter(template =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description?.toLowerCase().includes(searchTerm)
        );
      }

      return templates;
    } catch (error) {
      logger.error('Error getting organization templates:', error);
      throw createError(
        'Failed to get organization templates',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }

  /**
   * Get personal templates for a user
   */
  async getPersonalTemplates(
    organizationId: string,
    userId: string,
    filters?: {
      category?: CampaignTemplateCategory;
      type?: CampaignType;
      search?: string;
    }
  ): Promise<CampaignTemplate[]> {
    try {
      let query = collections.email_templates
        .where('organizationId', '==', organizationId)
        .where('createdBy', '==', userId)
        .where('isSystemTemplate', '==', false)
        .where('isActive', '==', true);

      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters?.type) {
        query = query.where('campaignType', '==', filters.type);
      }

      const snapshot = await query.get();
      let templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignTemplate));

      // Apply search filter in memory
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        templates = templates.filter(template =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description?.toLowerCase().includes(searchTerm)
        );
      }

      return templates;
    } catch (error) {
      logger.error('Error getting personal templates:', error);
      throw createError(
        'Failed to get personal templates',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }

  /**
   * Get template with access control
   */
  async getTemplate(
    templateId: string,
    organizationId: string,
    userId: string
  ): Promise<CampaignTemplate | null> {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      if (!template) {
        return null;
      }

      // Check access permissions
      const hasAccess =
        template.isSystemTemplate || // System templates are public
        template.organizationId === organizationId || // Organization templates
        template.createdBy === userId || // Personal templates
        template.isPublicTemplate; // Public templates

      if (!hasAccess) {
        throw createError(
          'Access denied to template',
          403,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      return template;
    } catch (error) {
      if (error.code) throw error;
      logger.error('Error getting template:', error);
      throw createError(
        'Failed to get template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateId: string,
    organizationId: string,
    userId: string,
    request: TemplatePreviewRequest
  ): Promise<{ subject: string; htmlContent: string; textContent?: string }> {
    try {
      const template = await this.getTemplate(templateId, organizationId, userId);

      if (!template) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      // Merge template data with sample data
      const templateData = {
        ...request.templateData,
        user: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          ...request.sampleRecipient
        },
        organization: {
          name: 'Sample Organization',
          logo: 'https://example.com/logo.png'
        },
        campaign: {
          unsubscribeUrl: 'https://example.com/unsubscribe'
        }
      };

      // Simple template variable replacement
      const renderContent = (content: string): string => {
        return content.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
          const keys = variable.trim().split('.');
          let value = templateData;

          for (const key of keys) {
            value = value?.[key];
            if (value === undefined) break;
          }

          return value !== undefined ? String(value) : match;
        });
      };

      return {
        subject: template.subject ? renderContent(template.subject) : '',
        htmlContent: template.htmlContent ? renderContent(template.htmlContent) : '',
        textContent: template.textContent ? renderContent(template.textContent) : undefined
      };
    } catch (error) {
      if (error.code) throw error;
      logger.error('Error previewing template:', error);
      throw createError(
        'Failed to preview template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }

  /**
   * Share template with organization or make public
   */
  async shareTemplate(
    templateId: string,
    organizationId: string,
    userId: string,
    request: TemplateShareRequest
  ): Promise<CampaignTemplate> {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      if (!template) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      // Check if user owns the template
      if (template.createdBy !== userId && !template.isSystemTemplate) {
        throw createError(
          'Only template owner can share template',
          403,
          EmailCampaignErrorCodes.PERMISSION_DENIED
        );
      }

      const updateData: Partial<CampaignTemplate> = {
        updatedAt: new Date()
      };

      switch (request.shareLevel) {
        case 'organization':
          updateData.isPublicTemplate = false;
          // Template stays in organization
          break;
        case 'public':
          updateData.isPublicTemplate = true;
          break;
        case 'private':
          updateData.isPublicTemplate = false;
          // Only accessible to creator
          break;
      }

      await collections.email_templates.doc(templateId).update(updateData);

      const updatedTemplate = await this.getTemplateById(templateId, organizationId);

      logger.info(`Template ${templateId} shared as ${request.shareLevel} by user ${userId}`);

      return updatedTemplate!;
    } catch (error) {
      if (error.code) throw error;
      logger.error('Error sharing template:', error);
      throw createError(
        'Failed to share template',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(
    templateId: string,
    organizationId: string,
    userId: string
  ): Promise<TemplateUsageStats> {
    try {
      const template = await this.getTemplate(templateId, organizationId, userId);

      if (!template) {
        throw createError(
          'Template not found',
          404,
          EmailCampaignErrorCodes.INVALID_TEMPLATE
        );
      }

      // Get campaigns that used this template
      const campaignsSnapshot = await collections.email_campaigns
        .where('templateId', '==', templateId)
        .where('organizationId', '==', organizationId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const campaignsUsedIn = campaignsSnapshot.docs.map(doc => {
        const campaign = doc.data();
        return {
          campaignId: doc.id,
          campaignName: campaign.name,
          usedAt: campaign.createdAt.toDate(),
          deliveryStats: campaign.deliveryStats ? {
            sent: campaign.deliveryStats.sent || 0,
            delivered: campaign.deliveryStats.delivered || 0,
            opened: campaign.deliveryStats.opened || 0,
            clicked: campaign.deliveryStats.clicked || 0
          } : undefined
        };
      });

      // Calculate averages
      const validStats = campaignsUsedIn.filter(c => c.deliveryStats);
      const avgDeliveryRate = validStats.length > 0
        ? validStats.reduce((sum, c) => sum + (c.deliveryStats!.delivered / Math.max(c.deliveryStats!.sent, 1)), 0) / validStats.length * 100
        : undefined;

      const avgOpenRate = validStats.length > 0
        ? validStats.reduce((sum, c) => sum + (c.deliveryStats!.opened / Math.max(c.deliveryStats!.delivered, 1)), 0) / validStats.length * 100
        : undefined;

      const avgClickRate = validStats.length > 0
        ? validStats.reduce((sum, c) => sum + (c.deliveryStats!.clicked / Math.max(c.deliveryStats!.opened, 1)), 0) / validStats.length * 100
        : undefined;

      return {
        templateId,
        timesUsed: template.campaignUsage?.timesUsed || campaignsUsedIn.length,
        lastUsedInCampaign: template.campaignUsage?.lastUsedInCampaign,
        lastUsedAt: campaignsUsedIn.length > 0 ? campaignsUsedIn[0].usedAt : undefined,
        avgDeliveryRate,
        avgOpenRate,
        avgClickRate,
        campaignsUsedIn
      };
    } catch (error) {
      if (error.code) throw error;
      logger.error('Error getting template usage:', error);
      throw createError(
        'Failed to get template usage',
        500,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }
  }
}

export const campaignTemplateService = new CampaignTemplateService();