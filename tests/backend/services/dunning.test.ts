/**
 * Tests pour le service de gestion des relances (Dunning Management)
 * Vérification des fonctionnalités de recouvrement et processus de relance
 */

import { dunningManagementService, DunningStatus, DunningActionType } from '../../../backend/functions/src/services/billing/dunning-management.service';
import { DunningProcessingJobs } from '../../../backend/functions/src/jobs/dunning-processing.jobs';

// Mock des collections Firestore pour les tests
const mockCollections = {
  dunning_processes: {
    add: jest.fn(),
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn()
    }),
    where: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          get: jest.fn()
        }),
        limit: jest.fn().mockReturnValue({
          get: jest.fn()
        }),
        get: jest.fn()
      }),
      orderBy: jest.fn().mockReturnValue({
        get: jest.fn()
      }),
      get: jest.fn()
    })
  },
  dunning_steps: {
    add: jest.fn(),
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn()
    }),
    where: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn()
        }),
        get: jest.fn()
      }),
      get: jest.fn()
    })
  },
  dunning_templates: {
    doc: jest.fn().mockReturnValue({
      get: jest.fn()
    })
  },
  invoices: {
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn()
    }),
    where: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn()
      }),
      get: jest.fn()
    })
  },
  dunning_reports: {
    add: jest.fn()
  }
};

// Mock du module de base de données
jest.mock('../../../backend/functions/src/config/database', () => ({
  collections: mockCollections
}));

// Mock des services dépendants
jest.mock('../../../backend/functions/src/services/billing/billing-notifications.service', () => ({
  billingNotificationsService: {
    createAlert: jest.fn()
  }
}));

jest.mock('../../../backend/functions/src/services/tenant/tenant.service', () => ({
  tenantService: {
    updateTenant: jest.fn()
  }
}));

describe('Dunning Management Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDunningProcess', () => {
    it('should create a dunning process successfully', async () => {
      const mockInvoice = {
        id: 'inv_123',
        tenantId: 'tenant_123',
        status: 'open',
        amount: 99.99,
        invoiceNumber: 'INV-001'
      };

      const mockProcessRef = { id: 'process_123' };

      // Mock invoice retrieval
      mockCollections.invoices.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockInvoice
      });

      // Mock existing process check
      mockCollections.dunning_processes.where().where().limit().get.mockResolvedValue({
        empty: true
      });

      // Mock process creation
      mockCollections.dunning_processes.add.mockResolvedValue(mockProcessRef);
      mockCollections.dunning_steps.add.mockResolvedValue({ id: 'step_123' });

      const request = {
        tenantId: 'tenant_123',
        invoiceId: 'inv_123'
      };

      const result = await dunningManagementService.createDunningProcess(request);

      expect(mockCollections.dunning_processes.add).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant_123',
          invoiceId: 'inv_123',
          status: DunningStatus.ACTIVE,
          currentStep: 0,
          totalSteps: 5 // Default template has 5 steps
        })
      );

      expect(result.id).toBe('process_123');
      expect(result.status).toBe(DunningStatus.ACTIVE);
    });

    it('should throw error for non-existent invoice', async () => {
      mockCollections.invoices.doc().get.mockResolvedValue({
        exists: false
      });

      const request = {
        tenantId: 'tenant_123',
        invoiceId: 'inv_nonexistent'
      };

      await expect(dunningManagementService.createDunningProcess(request)).rejects.toThrow('Invoice not found');
    });

    it('should throw error for wrong tenant access', async () => {
      const mockInvoice = {
        id: 'inv_123',
        tenantId: 'different_tenant',
        status: 'open'
      };

      mockCollections.invoices.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockInvoice
      });

      const request = {
        tenantId: 'tenant_123',
        invoiceId: 'inv_123'
      };

      await expect(dunningManagementService.createDunningProcess(request)).rejects.toThrow('Access denied');
    });

    it('should throw error for non-open invoice', async () => {
      const mockInvoice = {
        id: 'inv_123',
        tenantId: 'tenant_123',
        status: 'paid'
      };

      mockCollections.invoices.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockInvoice
      });

      const request = {
        tenantId: 'tenant_123',
        invoiceId: 'inv_123'
      };

      await expect(dunningManagementService.createDunningProcess(request)).rejects.toThrow('Invoice is not open for dunning');
    });
  });

  describe('executeNextDunningStep', () => {
    it('should execute next step successfully', async () => {
      const mockProcess = {
        id: 'process_123',
        tenantId: 'tenant_123',
        status: DunningStatus.ACTIVE,
        currentStep: 0,
        totalSteps: 5
      };

      const mockStep = {
        id: 'step_123',
        processId: 'process_123',
        stepNumber: 1,
        type: DunningActionType.EMAIL_REMINDER,
        status: 'pending',
        config: {
          delayDays: 7,
          escalationLevel: 'low',
          requiresManualApproval: false
        }
      };

      mockCollections.dunning_processes.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockProcess
      });

      mockCollections.dunning_steps.where().orderBy().limit().get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'step_123', data: () => mockStep }]
      });

      mockCollections.dunning_steps.doc().update.mockResolvedValue({});
      mockCollections.dunning_processes.doc().update.mockResolvedValue({});

      const result = await dunningManagementService.executeNextDunningStep('process_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(mockCollections.dunning_steps.doc().update).toHaveBeenCalled();
      expect(mockCollections.dunning_processes.doc().update).toHaveBeenCalled();
    });

    it('should complete process when no more steps', async () => {
      const mockProcess = {
        id: 'process_123',
        tenantId: 'tenant_123',
        status: DunningStatus.ACTIVE,
        currentStep: 5,
        totalSteps: 5
      };

      mockCollections.dunning_processes.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockProcess
      });

      mockCollections.dunning_steps.where().orderBy().limit().get.mockResolvedValue({
        empty: true
      });

      const result = await dunningManagementService.executeNextDunningStep('process_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('completed');
    });

    it('should handle manual approval requirement', async () => {
      const mockProcess = {
        id: 'process_123',
        tenantId: 'tenant_123',
        status: DunningStatus.ACTIVE
      };

      const mockStep = {
        id: 'step_123',
        processId: 'process_123',
        stepNumber: 4,
        type: DunningActionType.SUSPEND_SERVICE,
        status: 'pending',
        config: {
          delayDays: 30,
          escalationLevel: 'critical',
          requiresManualApproval: true
        }
      };

      mockCollections.dunning_processes.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockProcess
      });

      mockCollections.dunning_steps.where().orderBy().limit().get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'step_123', data: () => mockStep }]
      });

      const result = await dunningManagementService.executeNextDunningStep('process_123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Manual approval requested');
    });
  });

  describe('pauseDunningProcess', () => {
    it('should pause process successfully', async () => {
      mockCollections.dunning_processes.doc().update.mockResolvedValue({});

      await dunningManagementService.pauseDunningProcess('process_123', 'Manual pause');

      expect(mockCollections.dunning_processes.doc().update).toHaveBeenCalledWith({
        status: DunningStatus.PAUSED,
        lastActionAt: expect.any(Date),
        metadata: {
          pauseReason: 'Manual pause',
          pausedAt: expect.any(Date)
        }
      });
    });
  });

  describe('resumeDunningProcess', () => {
    it('should resume process successfully', async () => {
      const mockNextStep = {
        id: 'step_123',
        scheduledAt: new Date()
      };

      mockCollections.dunning_steps.where().orderBy().limit().get.mockResolvedValue({
        empty: false,
        docs: [{ id: 'step_123', data: () => mockNextStep }]
      });

      mockCollections.dunning_processes.doc().update.mockResolvedValue({});

      await dunningManagementService.resumeDunningProcess('process_123');

      expect(mockCollections.dunning_processes.doc().update).toHaveBeenCalledWith({
        status: DunningStatus.ACTIVE,
        lastActionAt: expect.any(Date),
        nextActionAt: mockNextStep.scheduledAt
      });
    });
  });

  describe('cancelDunningProcess', () => {
    it('should cancel process and skip pending steps', async () => {
      const mockPendingSteps = [
        { id: 'step_1', data: () => ({ status: 'pending' }) },
        { id: 'step_2', data: () => ({ status: 'pending' }) }
      ];

      mockCollections.dunning_processes.doc().update.mockResolvedValue({});
      mockCollections.dunning_steps.where().get.mockResolvedValue({
        docs: mockPendingSteps
      });
      mockCollections.dunning_steps.doc().update.mockResolvedValue({});

      await dunningManagementService.cancelDunningProcess('process_123', 'Manual cancellation');

      expect(mockCollections.dunning_processes.doc().update).toHaveBeenCalledWith({
        status: DunningStatus.CANCELLED,
        completedAt: expect.any(Date),
        metadata: {
          cancelReason: 'Manual cancellation',
          cancelledAt: expect.any(Date)
        }
      });

      expect(mockCollections.dunning_steps.doc().update).toHaveBeenCalledTimes(2);
    });
  });

  describe('getActiveDunningProcesses', () => {
    it('should return active processes due for action', async () => {
      const mockProcesses = [
        {
          id: 'process_1',
          data: () => ({
            status: DunningStatus.ACTIVE,
            nextActionAt: new Date(Date.now() - 1000) // Past due
          })
        },
        {
          id: 'process_2',
          data: () => ({
            status: DunningStatus.ACTIVE,
            nextActionAt: new Date(Date.now() - 2000) // Past due
          })
        }
      ];

      mockCollections.dunning_processes.where().where().get.mockResolvedValue({
        docs: mockProcesses
      });

      const result = await dunningManagementService.getActiveDunningProcesses();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('process_1');
      expect(result[1].id).toBe('process_2');
    });
  });
});

describe('Dunning Processing Jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processDueDunningActions', () => {
    it('should process all due dunning actions', async () => {
      // Mock active processes
      const mockActiveProcesses = [
        {
          id: 'process_1',
          tenantId: 'tenant_1',
          status: DunningStatus.ACTIVE,
          nextActionAt: new Date(Date.now() - 1000)
        }
      ];

      // Mock dunning service methods
      jest.spyOn(dunningManagementService, 'getActiveDunningProcesses')
        .mockResolvedValue(mockActiveProcesses);
      jest.spyOn(dunningManagementService, 'executeNextDunningStep')
        .mockResolvedValue({
          success: true,
          message: 'Step executed successfully',
          executedAt: new Date()
        });

      await DunningProcessingJobs.processDueDunningActions();

      expect(dunningManagementService.getActiveDunningProcesses).toHaveBeenCalled();
      expect(dunningManagementService.executeNextDunningStep).toHaveBeenCalledWith('process_1');
    });

    it('should handle errors in individual processes', async () => {
      const mockActiveProcesses = [
        {
          id: 'process_1',
          tenantId: 'tenant_1',
          status: DunningStatus.ACTIVE
        }
      ];

      jest.spyOn(dunningManagementService, 'getActiveDunningProcesses')
        .mockResolvedValue(mockActiveProcesses);
      jest.spyOn(dunningManagementService, 'executeNextDunningStep')
        .mockRejectedValue(new Error('Step execution failed'));

      mockCollections.dunning_processes.doc().update.mockResolvedValue({});

      // Should not throw error, but handle it gracefully
      await expect(DunningProcessingJobs.processDueDunningActions()).resolves.not.toThrow();

      expect(mockCollections.dunning_processes.doc().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DunningStatus.FAILED
        })
      );
    });
  });

  describe('createDunningForOverdueInvoices', () => {
    it('should create dunning processes for overdue invoices', async () => {
      const mockOverdueInvoices = [
        {
          id: 'inv_1',
          data: () => ({
            id: 'inv_1',
            tenantId: 'tenant_1',
            status: 'open',
            dueDate: new Date(Date.now() - 86400000) // 1 day overdue
          })
        }
      ];

      mockCollections.invoices.where().where().get.mockResolvedValue({
        size: 1,
        docs: mockOverdueInvoices
      });

      mockCollections.dunning_processes.where().where().limit().get.mockResolvedValue({
        empty: true // No existing process
      });

      jest.spyOn(dunningManagementService, 'createDunningProcess')
        .mockResolvedValue({
          id: 'process_1',
          tenantId: 'tenant_1',
          invoiceId: 'inv_1',
          status: DunningStatus.ACTIVE,
          currentStep: 0,
          totalSteps: 5,
          startedAt: new Date(),
          lastActionAt: new Date(),
          metadata: {}
        });

      await DunningProcessingJobs.createDunningForOverdueInvoices();

      expect(dunningManagementService.createDunningProcess).toHaveBeenCalledWith({
        tenantId: 'tenant_1',
        invoiceId: 'inv_1'
      });
    });

    it('should skip invoices with existing processes', async () => {
      const mockOverdueInvoices = [
        {
          id: 'inv_1',
          data: () => ({
            id: 'inv_1',
            tenantId: 'tenant_1',
            status: 'open'
          })
        }
      ];

      mockCollections.invoices.where().where().get.mockResolvedValue({
        size: 1,
        docs: mockOverdueInvoices
      });

      mockCollections.dunning_processes.where().where().limit().get.mockResolvedValue({
        empty: false // Existing process found
      });

      jest.spyOn(dunningManagementService, 'createDunningProcess');

      await DunningProcessingJobs.createDunningForOverdueInvoices();

      expect(dunningManagementService.createDunningProcess).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldDunningProcesses', () => {
    it('should cleanup old completed processes', async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const mockOldProcesses = [
        {
          id: 'old_process_1',
          ref: { delete: jest.fn() },
          data: () => ({ status: 'completed' })
        }
      ];

      const mockOldSteps = [
        { ref: { delete: jest.fn() } }
      ];

      mockCollections.dunning_processes.where().where().get.mockResolvedValue({
        size: 1,
        docs: mockOldProcesses
      });

      mockCollections.dunning_steps.where().get.mockResolvedValue({
        docs: mockOldSteps
      });

      await DunningProcessingJobs.cleanupOldDunningProcesses();

      expect(mockOldSteps[0].ref.delete).toHaveBeenCalled();
      expect(mockOldProcesses[0].ref.delete).toHaveBeenCalled();
    });
  });

  describe('generateDunningReports', () => {
    it('should generate monthly dunning reports', async () => {
      const mockProcesses = [
        {
          data: () => ({
            status: 'completed',
            invoiceId: 'inv_1',
            metadata: { invoiceAmount: 100 }
          })
        },
        {
          data: () => ({
            status: 'active',
            invoiceId: 'inv_2',
            metadata: { invoiceAmount: 200 }
          })
        }
      ];

      mockCollections.dunning_processes.where().where().get.mockResolvedValue({
        size: 2,
        docs: mockProcesses
      });

      mockCollections.invoices.doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ status: 'paid', amount: 100 })
      });

      mockCollections.dunning_reports.add.mockResolvedValue({ id: 'report_1' });

      await DunningProcessingJobs.generateDunningReports();

      expect(mockCollections.dunning_reports.add).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({
            totalProcesses: 2,
            completedProcesses: 1,
            activeProcesses: 1
          })
        })
      );
    });
  });
});

describe('Dunning Action Types', () => {
  it('should have all required action types', () => {
    const expectedTypes = [
      'email_reminder',
      'sms_reminder',
      'phone_call',
      'final_notice',
      'suspend_service',
      'collection_agency',
      'write_off'
    ];

    const actualTypes = Object.values(DunningActionType);
    
    expectedTypes.forEach(type => {
      expect(actualTypes).toContain(type);
    });

    expect(actualTypes).toHaveLength(expectedTypes.length);
  });
});

describe('Dunning Status Types', () => {
  it('should have all required status types', () => {
    const expectedStatuses = [
      'active',
      'paused',
      'completed',
      'cancelled',
      'failed'
    ];

    const actualStatuses = Object.values(DunningStatus);
    
    expectedStatuses.forEach(status => {
      expect(actualStatuses).toContain(status);
    });

    expect(actualStatuses).toHaveLength(expectedStatuses.length);
  });
});

console.log('✅ Tests de gestion des relances configurés');
console.log('🔄 Coverage:');
console.log('  - Service de gestion des relances');
console.log('  - Jobs de traitement automatique');
console.log('  - Création et exécution des processus');
console.log('  - Gestion des étapes et escalades');
console.log('  - Nettoyage et rapports');
console.log('💡 Pour exécuter: npm run test:billing:backend');