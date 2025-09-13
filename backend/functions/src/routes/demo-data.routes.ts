/**
 * Routes pour la gestion des données de démonstration
 * API pour générer, visualiser et nettoyer les données de démo
 */

import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { demoDataGeneratorService } from '../services/onboarding/demo-data-generator.service';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';


const router = Router();

// Toutes les routes nécessitent une authentification et un contexte tenant
router.use(requireAuth);
router.use(tenantContextMiddleware.injectTenantContext);
router.use(tenantContextMiddleware.validateTenantAccess);

/**
 * Obtenir les templates d'industrie disponibles
 * GET /demo-data/templates
 */
router.get('/templates', asyncHandler(async (req, res) => {
  const templates = demoDataGeneratorService.getAvailableTemplates();
  
  res.json({
    success: true,
    data: {
      templates,
      industries: Object.keys(templates)
    }
  });
}));

/**
 * Obtenir les détails d'un template d'industrie
 * GET /demo-data/templates/:industry
 */
router.get('/templates/:industry', asyncHandler(async (req, res) => {
  const { industry } = req.params;
  
  if (!['education', 'healthcare', 'corporate', 'technology'].includes(industry)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid industry template'
    });
  }
  
  const template = demoDataGeneratorService.getIndustryTemplate(industry);
  
  return res.json({
    success: true,
    data: {
      industry,
      template
    }
  });
}));

/**
 * Générer des données de démonstration
 * POST /demo-data/generate
 */
router.post('/generate',
  [
    body('industry')
      .isString()
      .isIn(['education', 'healthcare', 'corporate', 'technology'])
      .withMessage('Invalid industry'),
    
    body('generateUsers')
      .isBoolean()
      .withMessage('generateUsers must be a boolean'),
    
    body('generateEvents')
      .isBoolean()
      .withMessage('generateEvents must be a boolean'),
    
    body('generateAttendance')
      .isBoolean()
      .withMessage('generateAttendance must be a boolean'),
    
    body('userCount')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('User count must be between 1 and 100'),
    
    body('eventCount')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Event count must be between 1 and 500'),
    
    body('timeRange.startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    
    body('timeRange.endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const tenantId = req.tenantContext!.tenantId;
    const {
      industry,
      generateUsers,
      generateEvents,
      generateAttendance,
      userCount,
      eventCount,
      timeRange
    } = req.body;

    // Valider que au moins un type de données est sélectionné
    if (!generateUsers && !generateEvents && !generateAttendance) {
      return res.status(400).json({
        success: false,
        error: 'At least one data type must be selected'
      });
    }

    // Valider la plage de dates si fournie
    if (timeRange && timeRange.startDate && timeRange.endDate) {
      const startDate = new Date(timeRange.startDate);
      const endDate = new Date(timeRange.endDate);
      
      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date must be before end date'
        });
      }
    }

    try {
      const options = {
        tenantId,
        industry,
        generateUsers,
        generateEvents,
        generateAttendance,
        userCount,
        eventCount,
        timeRange: timeRange ? {
          startDate: new Date(timeRange.startDate),
          endDate: new Date(timeRange.endDate)
        } : undefined
      };

      const result = await demoDataGeneratorService.generateDemoData(options);
      
      return res.json({
        success: true,
        data: result,
        message: 'Demo data generated successfully'
      });

    } catch (error) {
      console.error('Error generating demo data:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to generate demo data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

/**
 * Nettoyer les données de démonstration
 * DELETE /demo-data/cleanup
 */
router.delete('/cleanup', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenantId;
  
  try {
    await demoDataGeneratorService.cleanupDemoData(tenantId);
    
    res.json({
      success: true,
      message: 'Demo data cleaned up successfully'
    });

  } catch (error) {
    console.error('Error cleaning up demo data:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup demo data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * Obtenir le statut des données de démonstration
 * GET /demo-data/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const tenantId = req.tenantContext!.tenantId;
  
  try {
    // Compter les données de démo existantes
    const [demoUsers, demoEvents, demoAttendance] = await Promise.all([
      collections.users
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get(),
      collections.events
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get(),
      collections.attendances
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get()
    ]);

    const status = {
      hasDemoData: demoUsers.size > 0 || demoEvents.size > 0 || demoAttendance.size > 0,
      counts: {
        users: demoUsers.size,
        events: demoEvents.size,
        attendance: demoAttendance.size
      },
      lastGenerated: null as Date | null
    };

    // Obtenir la date de dernière génération
    if (demoUsers.size > 0) {
      const latestUser = demoUsers.docs
        .map(doc => doc.data())
        .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
      
      if (latestUser?.demoData?.generatedAt) {
        status.lastGenerated = latestUser.demoData.generatedAt.toDate();
      }
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting demo data status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get demo data status'
    });
  }
}));

/**
 * Prévisualiser les données qui seraient générées
 * POST /demo-data/preview
 */
router.post('/preview',
  [
    body('industry')
      .isString()
      .isIn(['education', 'healthcare', 'corporate', 'technology'])
      .withMessage('Invalid industry'),
    
    body('userCount')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('User count for preview must be between 1 and 20'),
    
    body('eventCount')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Event count for preview must be between 1 and 10')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { industry, userCount = 5, eventCount = 5 } = req.body;
    
    try {
      const template = demoDataGeneratorService.getIndustryTemplate(industry);
      
      // Générer des exemples de données sans les sauvegarder
      const preview = {
        template,
        examples: {
          users: generateUserExamples(template, userCount),
          events: generateEventExamples(template, eventCount),
          attendanceScenarios: generateAttendanceExamples()
        }
      };

      return res.json({
        success: true,
        data: preview
      });

    } catch (error) {
      console.error('Error generating preview:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to generate preview'
      });
    }
  })
);

/**
 * Obtenir les statistiques des données de démonstration
 * GET /demo-data/statistics
 */
router.get('/statistics', 
  [
    query('period')
      .optional()
      .isIn(['week', 'month', 'quarter', 'year'])
      .withMessage('Invalid period')
  ],
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantContext!.tenantId;
    const period = req.query.period as string || 'month';
    
    try {
      // Calculer la date de début selon la période
      const now = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Obtenir les statistiques des événements de démo
      const demoEvents = await collections.events
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .where('startDate', '>=', startDate)
        .get();

      const eventStats = {
        total: demoEvents.size,
        byType: {} as Record<string, number>,
        byMonth: {} as Record<string, number>
      };

      demoEvents.docs.forEach(doc => {
        const event = doc.data();
        const type = event.type || 'unknown';
        const month = event.startDate.toDate().toISOString().substring(0, 7);
        
        eventStats.byType[type] = (eventStats.byType[type] || 0) + 1;
        eventStats.byMonth[month] = (eventStats.byMonth[month] || 0) + 1;
      });

      // Obtenir les statistiques de présence
      const demoAttendance = await collections.attendances
        .where('tenantId', '==', tenantId)
        .where('isDemo', '==', true)
        .get();

      const attendanceStats = {
        total: demoAttendance.size,
        byStatus: {} as Record<string, number>
      };

      demoAttendance.docs.forEach(doc => {
        const attendance = doc.data();
        const status = attendance.status || 'unknown';
        attendanceStats.byStatus[status] = (attendanceStats.byStatus[status] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          period,
          events: eventStats,
          attendance: attendanceStats,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error getting demo data statistics:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  })
);

// Méthodes utilitaires pour la prévisualisation
function generateUserExamples(template: any, count: number): any[] {
  const firstNames = ['Alice', 'Bob', 'Claire', 'David', 'Emma'];
  const lastNames = ['Martin', 'Dubois', 'Thomas', 'Robert', 'Petit'];
  
  return Array.from({ length: count }, (_, i) => ({
    firstName: firstNames[i % firstNames.length],
    lastName: lastNames[i % lastNames.length],
    role: template.userRoles[i % template.userRoles.length],
    department: template.departments[i % template.departments.length],
    email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@demo.local`
  }));
}

function generateEventExamples(template: any, count: number): any[] {
  return Array.from({ length: count }, (_, i) => ({
    title: template.eventTitles[i % template.eventTitles.length],
    type: template.eventTypes[i % template.eventTypes.length],
    location: template.locations[i % template.locations.length],
    duration: template.defaultEventDuration,
    maxAttendees: 20 + (i * 5)
  }));
}

function generateAttendanceExamples(): any[] {
  return [
    { status: 'present', percentage: 80, description: '80% des participants sont présents' },
    { status: 'late', percentage: 10, description: '10% arrivent en retard' },
    { status: 'absent', percentage: 5, description: '5% sont absents' },
    { status: 'excused', percentage: 5, description: '5% ont une absence justifiée' }
  ];
}

// Import des collections
import { collections } from '../config/database';
import tenantContextMiddleware from '../middleware/tenant-context.middleware';

export default router;