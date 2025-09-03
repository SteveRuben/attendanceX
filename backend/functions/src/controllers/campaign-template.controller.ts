import { Response } from 'express';
import { 
  CreateCampaignTemplateRequest,
  UpdateCampaignTemplateRequest,
  CampaignTemplate,
  CampaignTemplateCategory,
  CampaignType,
  EmailCampaignErrorCodes,
  TemplatePreviewRequest
} from '@attendance-x/shared';
import { AuthenticatedRequest } from '../types';
import { asyncAuthHandler, createError } from '../middleware/errorHandler';
import { campaignTemplateService } from '../services/campaign-template.service';
import { logger } from 'firebase-functions';

export class CampaignTemplateController {

  /**
   * Get all campaign templates (system, organization, and personal)
   */
  static getTemplates = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { 
      category, 
      type, 
      includeSystem = 'true', 
      includeOrganization = 'true', 
      includePersonal = 'true',
      search,
      limit = '50',
      offset = '0'
    } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      category: category as CampaignTemplateCategory,
      type: type as CampaignType,
      includeSystem: includeSystem === 'true',
      includeOrganization: includeOrganization === 'true',
      includePersonal: includePersonal === 'true',
      search: search as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    // Get different types of templates based on filters
    let allTemplates: CampaignTemplate[] = [];
    
    if (filters.includeSystem) {
      const systemTemplates = await campaignTemplateService.getSystemTemplates({
        category: filters.category,
        type: filters.type,
        search: filters.search
      });
      allTemplates = allTemplates.concat(systemTemplates);
    }
    
    if (filters.includeOrganization) {
      const orgTemplates = await campaignTemplateService.getOrganizationTemplates(
        organizationId,
        {
          category: filters.category,
          type: filters.type,
          search: filters.search
        }
      );
      allTemplates = allTemplates.concat(orgTemplates);
    }
    
    if (filters.includePersonal) {
      const personalTemplates = await campaignTemplateService.getPersonalTemplates(
        organizationId,
        userId,
        {
          category: filters.category,
          type: filters.type,
          search: filters.search
        }
      );
      allTemplates = allTemplates.concat(personalTemplates);
    }
    
    // Apply pagination
    const startIndex = filters.offset;
    const endIndex = startIndex + filters.limit;
    const templates = allTemplates.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: templates,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: allTemplates.length
      }
    });
  });

  /**
   * Get system campaign templates
   */
  static getSystemTemplates = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { category, type, search } = req.query;

    const filters = {
      category: category as CampaignTemplateCategory,
      type: type as CampaignType,
      search: search as string
    };

    const templates = await campaignTemplateService.getSystemTemplates(filters);

    res.json({
      success: true,
      data: templates
    });
  });

  /**
   * Get organization templates
   */
  static getOrganizationTemplates = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const { category, type, search } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      category: category as CampaignTemplateCategory,
      type: type as CampaignType,
      search: search as string
    };

    const templates = await campaignTemplateService.getOrganizationTemplates(
      organizationId, 
      filters
    );

    res.json({
      success: true,
      data: templates
    });
  });

  /**
   * Get personal templates for the current user
   */
  static getPersonalTemplates = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { category, type, search } = req.query;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const filters = {
      category: category as CampaignTemplateCategory,
      type: type as CampaignType,
      search: search as string
    };

    const templates = await campaignTemplateService.getPersonalTemplates(
      organizationId,
      userId,
      filters
    );

    res.json({
      success: true,
      data: templates
    });
  });

  /**
   * Get a specific template by ID
   */
  static getTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const template = await campaignTemplateService.getTemplate(
      templateId, 
      organizationId, 
      userId
    );

    if (!template) {
      throw createError(
        'Template not found',
        404,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }

    res.json({
      success: true,
      data: template
    });
  });

  /**
   * Create a new campaign template
   */
  static createTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const request: CreateCampaignTemplateRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    // Validate required fields
    if (!request.name || !request.category || !request.campaignType) {
      throw createError(
        'Missing required fields: name, category, campaignType',
        400,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }

    const template = await campaignTemplateService.createTemplate(
      organizationId, 
      userId, 
      request
    );

    logger.info(`Campaign template created: ${template.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: template
    });
  });

  /**
   * Update an existing template
   */
  static updateTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;
    const request: UpdateCampaignTemplateRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const template = await campaignTemplateService.updateTemplate(
      templateId,
      organizationId,
      userId,
      request
    );

    logger.info(`Campaign template updated: ${templateId} by user ${userId}`);

    res.json({
      success: true,
      data: template
    });
  });

  /**
   * Duplicate an existing template
   */
  static duplicateTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;
    const { name, description } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!name) {
      throw createError(
        'Name is required for template duplication',
        400,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }

    const duplicatedTemplate = await campaignTemplateService.duplicateTemplate(
      templateId,
      organizationId,
      userId,
      { name, description }
    );

    logger.info(`Campaign template duplicated: ${templateId} -> ${duplicatedTemplate.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: duplicatedTemplate
    });
  });

  /**
   * Delete a template
   */
  static deleteTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    await campaignTemplateService.deleteTemplate(templateId, organizationId);

    logger.info(`Campaign template deleted: ${templateId} by user ${userId}`);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  });

  /**
   * Preview a template with sample data
   */
  static previewTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;
    const request: TemplatePreviewRequest = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const preview = await campaignTemplateService.previewTemplate(
      templateId,
      organizationId,
      userId,
      request
    );

    res.json({
      success: true,
      data: preview
    });
  });

  /**
   * Share a template with organization or make it public
   */
  static shareTemplate = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;
    const { shareLevel, permissions } = req.body;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    if (!shareLevel || !['organization', 'public', 'private'].includes(shareLevel)) {
      throw createError(
        'Invalid share level. Must be: organization, public, or private',
        400,
        EmailCampaignErrorCodes.INVALID_TEMPLATE
      );
    }

    const template = await campaignTemplateService.shareTemplate(
      templateId,
      organizationId,
      userId,
      { shareLevel, permissions }
    );

    logger.info(`Campaign template shared: ${templateId} as ${shareLevel} by user ${userId}`);

    res.json({
      success: true,
      data: template
    });
  });

  /**
   * Get template usage statistics
   */
  static getTemplateUsage = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.organization?.organizationId;
    const userId = req.user.uid;
    const { templateId } = req.params;

    if (!organizationId) {
      throw createError(
        'Organization context required',
        400,
        EmailCampaignErrorCodes.PERMISSION_DENIED
      );
    }

    const usage = await campaignTemplateService.getTemplateUsage(
      templateId,
      organizationId,
      userId
    );

    res.json({
      success: true,
      data: usage
    });
  });

  /**
   * Get template categories and types
   */
  static getTemplateMetadata = asyncAuthHandler(async (req: AuthenticatedRequest, res: Response) => {
    const metadata = {
      categories: Object.values(CampaignTemplateCategory),
      types: Object.values(CampaignType),
      variables: [
        { name: 'user.firstName', description: 'User first name', type: 'text' },
        { name: 'user.lastName', description: 'User last name', type: 'text' },
        { name: 'user.email', description: 'User email address', type: 'text' },
        { name: 'organization.name', description: 'Organization name', type: 'text' },
        { name: 'organization.logo', description: 'Organization logo URL', type: 'image' },
        { name: 'event.name', description: 'Event name', type: 'text' },
        { name: 'event.date', description: 'Event date', type: 'date' },
        { name: 'event.location', description: 'Event location', type: 'text' },
        { name: 'campaign.unsubscribeUrl', description: 'Unsubscribe URL', type: 'url' }
      ]
    };

    res.json({
      success: true,
      data: metadata
    });
  });
}