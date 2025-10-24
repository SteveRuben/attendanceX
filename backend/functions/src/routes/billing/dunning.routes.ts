/**
 * Routes pour la gestion des relances de paiement (Dunning Management)
 * API pour créer, gérer et suivre les processus de recouvrement
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantContextMiddleware } from '../../middleware/tenant-context.middleware';
import { requireFeature } from '../../middleware/feature-gating.middleware';
import { dunningManagementService, DunningStatus } from '../../services/billing/dunning-management.service';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// Middleware de base pour toutes les routes de relance
const dunningProtection = [
  authenticate,
  tenantContextMiddleware.injectTenantContext(),
  tenantContextMiddleware.validateTenantAccess(),
  requireFeature('billing') // Nécessite l'accès à la facturation
];

/**
 * Obtenir tous les processus de relance du tenant
 * GET /dunning/processes
 */
router.get('/processes', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { status, limit = 50, offset = 0 } = req.query;

  let processes = await dunningManagementService.getDunningProcessesByTenant(tenantContext.tenantId);

  // Filtrer par statut si spécifié
  if (status && status !== 'all') {
    processes = processes.filter(p => p.status === status);
  }

  // Pagination simple
  const total = processes.length;
  const paginatedProcesses = processes.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    success: true,
    data: {
      processes: paginatedProcesses,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    }
  });
}));

/**
 * Obtenir un processus de relance spécifique
 * GET /dunning/processes/:processId
 */
router.get('/processes/:processId', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { processId } = req.params;

  // Obtenir le processus
  const processDoc = await collections.dunning_processes.doc(processId).get();

  if (!processDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Dunning process not found'
    });
  }

  const process = { id: processDoc.id, ...processDoc.data() } as any;

  // Vérifier l'accès au tenant
  if (process.tenantId !== tenantContext.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  // Obtenir les étapes du processus
  const stepsSnapshot = await collections.dunning_steps
    .where('processId', '==', processId)
    .orderBy('stepNumber')
    .get();

  const steps = stepsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

  // Obtenir les informations de la facture associée
  const invoiceDoc = await collections.invoices.doc(process.invoiceId).get();
  const invoice = invoiceDoc.exists ? { id: invoiceDoc.id, ...invoiceDoc.data() } as any : null;

  return res.json({
    success: true,
    data: {
      process,
      steps,
      invoice
    }
  });
}));

/**
 * Créer un nouveau processus de relance
 * POST /dunning/processes
 */
router.post('/processes', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { invoiceId, templateId, customSteps } = req.body;

  if (!invoiceId) {
    return res.status(400).json({
      success: false,
      error: 'Invoice ID is required'
    });
  }

  const process = await dunningManagementService.createDunningProcess({
    tenantId: tenantContext.tenantId,
    invoiceId,
    templateId,
    customSteps
  });

  return res.status(201).json({
    success: true,
    data: process,
    message: 'Dunning process created successfully'
  });
}));

/**
 * Exécuter la prochaine étape d'un processus de relance
 * POST /dunning/processes/:processId/execute
 */
router.post('/processes/:processId/execute', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { processId } = req.params;

  // Vérifier l'accès au processus
  const processDoc = await collections.dunning_processes.doc(processId).get();

  if (!processDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Dunning process not found'
    });
  }

  const process = processDoc.data() as any;
  if (process.tenantId !== tenantContext.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  const result = await dunningManagementService.executeNextDunningStep(processId);

  return res.json({
    success: true,
    data: result,
    message: result.success ? 'Dunning step executed successfully' : 'Dunning step execution failed'
  });
}));

/**
 * Suspendre un processus de relance
 * POST /dunning/processes/:processId/pause
 */
router.post('/processes/:processId/pause', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { processId } = req.params;
  const { reason } = req.body;

  // Vérifier l'accès au processus
  const processDoc = await collections.dunning_processes.doc(processId).get();

  if (!processDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Dunning process not found'
    });
  }

  const process = processDoc.data() as any;
  if (process.tenantId !== tenantContext.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await dunningManagementService.pauseDunningProcess(processId, reason);

  return res.json({
    success: true,
    message: 'Dunning process paused successfully'
  });
}));

/**
 * Reprendre un processus de relance suspendu
 * POST /dunning/processes/:processId/resume
 */
router.post('/processes/:processId/resume', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { processId } = req.params;

  // Vérifier l'accès au processus
  const processDoc = await collections.dunning_processes.doc(processId).get();

  if (!processDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Dunning process not found'
    });
  }

  const process = processDoc.data() as any;
  if (process.tenantId !== tenantContext.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await dunningManagementService.resumeDunningProcess(processId);

  return res.json({
    success: true,
    message: 'Dunning process resumed successfully'
  });
}));

/**
 * Annuler un processus de relance
 * POST /dunning/processes/:processId/cancel
 */
router.post('/processes/:processId/cancel', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { processId } = req.params;
  const { reason } = req.body;

  // Vérifier l'accès au processus
  const processDoc = await collections.dunning_processes.doc(processId).get();

  if (!processDoc.exists) {
    return res.status(404).json({
      success: false,
      error: 'Dunning process not found'
    });
  }

  const process = processDoc.data() as any;
  if (process.tenantId !== tenantContext.tenantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  await dunningManagementService.cancelDunningProcess(processId, reason);

  return res.json({
    success: true,
    message: 'Dunning process cancelled successfully'
  });
}));

/**
 * Obtenir les templates de relance disponibles
 * GET /dunning/templates
 */
router.get('/templates', ...dunningProtection, asyncHandler(async (req, res) => {
  // Pour l'instant, retourner le template par défaut
  // TODO: Implémenter la gestion des templates personnalisés

  const defaultTemplate = {
    id: 'default',
    name: 'Template par défaut',
    description: 'Processus de relance standard en 5 étapes',
    steps: [
      {
        stepNumber: 1,
        type: 'email_reminder',
        delayDays: 7,
        escalationLevel: 'low',
        template: 'first_reminder',
        description: 'Premier rappel par email (7 jours après échéance)'
      },
      {
        stepNumber: 2,
        type: 'email_reminder',
        delayDays: 14,
        escalationLevel: 'medium',
        template: 'second_reminder',
        description: 'Deuxième rappel par email (14 jours après échéance)'
      },
      {
        stepNumber: 3,
        type: 'final_notice',
        delayDays: 21,
        escalationLevel: 'high',
        template: 'final_notice',
        description: 'Mise en demeure (21 jours après échéance)'
      },
      {
        stepNumber: 4,
        type: 'suspend_service',
        delayDays: 30,
        escalationLevel: 'critical',
        requiresManualApproval: true,
        description: 'Suspension du service (30 jours après échéance)'
      },
      {
        stepNumber: 5,
        type: 'write_off',
        delayDays: 90,
        escalationLevel: 'critical',
        requiresManualApproval: true,
        description: 'Passage en perte (90 jours après échéance)'
      }
    ],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  res.json({
    success: true,
    data: {
      templates: [defaultTemplate]
    }
  });
}));

/**
 * Obtenir les statistiques de relance du tenant
 * GET /dunning/stats
 */
router.get('/stats', ...dunningProtection, asyncHandler(async (req, res) => {
  const { tenantContext } = req as any;
  const { period = '30' } = req.query; // Période en jours

  const periodDays = Number(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Obtenir les processus de la période
  const processesSnapshot = await collections.dunning_processes
    .where('tenantId', '==', tenantContext.tenantId)
    .where('startedAt', '>=', startDate)
    .get();

  const stats = {
    totalProcesses: processesSnapshot.size,
    activeProcesses: 0,
    completedProcesses: 0,
    cancelledProcesses: 0,
    failedProcesses: 0,
    pausedProcesses: 0,
    totalAmount: 0,
    recoveredAmount: 0,
    writtenOffAmount: 0
  };

  for (const processDoc of processesSnapshot.docs) {
    const process = processDoc.data() as any;

    // Compter par statut
    switch (process.status) {
      case DunningStatus.ACTIVE:
        stats.activeProcesses++;
        break;
      case DunningStatus.COMPLETED:
        stats.completedProcesses++;
        break;
      case DunningStatus.CANCELLED:
        stats.cancelledProcesses++;
        break;
      case DunningStatus.FAILED:
        stats.failedProcesses++;
        break;
      case DunningStatus.PAUSED:
        stats.pausedProcesses++;
        break;
    }

    // Calculer les montants
    if (process.metadata?.invoiceAmount) {
      stats.totalAmount += process.metadata.invoiceAmount;

      // Vérifier le statut de la facture pour les montants récupérés/perdus
      try {
        const invoiceDoc = await collections.invoices.doc(process.invoiceId).get();
        if (invoiceDoc.exists) {
          const invoice = invoiceDoc.data() as any;
          if (invoice.status === 'paid') {
            stats.recoveredAmount += invoice.amount;
          } else if (invoice.status === 'uncollectible') {
            stats.writtenOffAmount += invoice.amount;
          }
        }
      } catch (error) {
        console.error(`Error getting invoice ${process.invoiceId}:`, error);
      }
    }
  }

  // Calculer les taux
  const recoveryRate = stats.totalAmount > 0 ? (stats.recoveredAmount / stats.totalAmount) * 100 : 0;
  const writeOffRate = stats.totalAmount > 0 ? (stats.writtenOffAmount / stats.totalAmount) * 100 : 0;

  res.json({
    success: true,
    data: {
      period: {
        days: periodDays,
        startDate,
        endDate: new Date()
      },
      stats: {
        ...stats,
        recoveryRate: Math.round(recoveryRate * 100) / 100,
        writeOffRate: Math.round(writeOffRate * 100) / 100
      }
    }
  });
}));

// Import des collections nécessaires
import { collections } from '../../config/database';

export default router;