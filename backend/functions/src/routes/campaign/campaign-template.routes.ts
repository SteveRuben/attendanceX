import { Router } from 'express';
import { authenticate, requireTenantPermission } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { z } from 'zod';
import { CampaignTemplateController } from '../../controllers/notification/campaign-template.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Template metadata
router.get('/metadata', 
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignTemplateController.getTemplateMetadata
);

// Get all templates
router.get('/',
  validateQuery(z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    includeSystem: z.string().optional(),
    includeOrganization: z.string().optional(),
    includePersonal: z.string().optional(),
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignTemplateController.getTemplates
);

// Get system templates
router.get('/system',
  validateQuery(z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignTemplateController.getSystemTemplates
);

// Get organization templates
router.get('/organization',
  validateQuery(z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignTemplateController.getOrganizationTemplates
);

// Get personal templates
router.get('/personal',
  validateQuery(z.object({
    category: z.string().optional(),
    type: z.string().optional(),
    search: z.string().optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignTemplateController.getPersonalTemplates
);

// Get specific template
router.get('/:templateId',
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 300,
  }),
  CampaignTemplateController.getTemplate
);

// Create template
router.post('/',
  requireTenantPermission('send_notifications'),
  validateBody(z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    category: z.string(),
    campaignType: z.string(),
    subject: z.string().max(500).optional(),
    htmlContent: z.string().optional(),
    textContent: z.string().optional(),
    variables: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
      defaultValue: z.string().optional(),
      description: z.string().optional()
    })).optional(),
    isPublicTemplate: z.boolean().optional(),
    designMetadata: z.object({
      colorScheme: z.string().optional(),
      fontFamily: z.string().optional(),
      layout: z.string().optional(),
      responsive: z.boolean().optional()
    }).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  CampaignTemplateController.createTemplate
);

// Update template
router.put('/:templateId',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  validateBody(z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    category: z.string().optional(),
    subject: z.string().max(500).optional(),
    htmlContent: z.string().optional(),
    textContent: z.string().optional(),
    variables: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
      defaultValue: z.string().optional(),
      description: z.string().optional()
    })).optional(),
    isPublicTemplate: z.boolean().optional(),
    designMetadata: z.object({
      colorScheme: z.string().optional(),
      fontFamily: z.string().optional(),
      layout: z.string().optional(),
      responsive: z.boolean().optional()
    }).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignTemplateController.updateTemplate
);

// Duplicate template
router.post('/:templateId/duplicate',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  validateBody(z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 30,
  }),
  CampaignTemplateController.duplicateTemplate
);

// Delete template
router.delete('/:templateId',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  CampaignTemplateController.deleteTemplate
);

// Preview template
router.post('/:templateId/preview',
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  validateBody(z.object({
    templateData: z.record(z.any()).optional(),
    sampleRecipient: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional()
    }).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignTemplateController.previewTemplate
);

// Share template
router.post('/:templateId/share',
  requireTenantPermission('send_notifications'),
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  validateBody(z.object({
    shareLevel: z.enum(['organization', 'public', 'private']),
    permissions: z.object({
      canEdit: z.boolean().optional(),
      canDuplicate: z.boolean().optional()
    }).optional()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  CampaignTemplateController.shareTemplate
);

// Get template usage
router.get('/:templateId/usage',
  validateParams(z.object({
    templateId: z.string().min(1)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignTemplateController.getTemplateUsage
);

export default router;