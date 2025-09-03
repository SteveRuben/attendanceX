import { Router } from 'express';
import { CampaignRecipientController } from '../controllers/campaign-recipient.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Preview recipients based on criteria
router.post('/preview',
  requirePermission('send_notifications'),
  validateBody(z.object({
    criteria: z.object({
      teams: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      departments: z.array(z.string()).optional(),
      eventParticipants: z.array(z.string()).optional(),
      customFilters: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'in', 'notIn']),
        value: z.any()
      })).optional(),
      excludeUnsubscribed: z.boolean().default(true)
    }),
    limit: z.number().int().min(1).max(500).default(50)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignRecipientController.previewRecipients
);

// Get organization users
router.get('/users',
  validateQuery(z.object({
    search: z.string().optional(),
    team: z.string().optional(),
    role: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignRecipientController.getOrganizationUsers
);

// Get organization teams
router.get('/teams',
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignRecipientController.getOrganizationTeams
);

// Get event participants
router.get('/events/:eventId/participants',
  validateParams(z.object({
    eventId: z.string().min(1)
  })),
  validateQuery(z.object({
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 200,
  }),
  CampaignRecipientController.getEventParticipants
);

// Import external recipients
router.post('/import',
  requirePermission('send_notifications'),
  validateBody(z.object({
    recipients: z.array(z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      personalizations: z.record(z.any()).optional()
    })).min(1).max(1000),
    listName: z.string().min(1).max(255).optional(),
    validateEmails: z.boolean().default(true)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10, // Limited imports per minute
  }),
  CampaignRecipientController.importRecipients
);

// Get unsubscribed recipients
router.get('/unsubscribed',
  validateQuery(z.object({
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0)
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignRecipientController.getUnsubscribedRecipients
);

// Resubscribe a recipient
router.post('/resubscribe/:email',
  requirePermission('send_notifications'),
  validateParams(z.object({
    email: z.string().email()
  })),
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 50,
  }),
  CampaignRecipientController.resubscribeRecipient
);

// Get recipient statistics
router.get('/stats',
  rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 100,
  }),
  CampaignRecipientController.getRecipientStats
);

export default router;