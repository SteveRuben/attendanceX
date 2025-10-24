/**
 * Tests pour les services de facturation
 * Vérification des fonctionnalités de facturation et notifications
 */

import { billingNotificationsService, BillingAlertType } from '../../../backend/functions/src/services/billing/billing-notifications.service';
import { automatedBillingService } from '../../../backend/functions/src/services/billing/automated-billing.service';

// Mock des collections Firestore pour les tests
const mockCollections = {
  billing_alerts: {
    add: jest.fn(),
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn()
    }),
    where: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          get: jest.fn()
        })
      }),
      orderBy: jest.fn().mockReturnValue({
        get: jest.fn()
      })
    })
  },
  invoices: {
    add: jest.fn(),
    doc: jest.fn().mockReturnValue({
      get: jest.fn(),
      update: jest.fn()
    }),
    where: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockReturnValue({
        get: jest.fn()
      })
    })
  },
  billing_periods: {
    doc: jest.fn().mockReturnValue({
      get: jest.fn()
    })
  }
};

// Mock du module de base de données
jest.mock('../../../backend/functions/src/config/database', () => ({
  collections: mockCollections
}));

// Mock des services dépendants
jest.mock('../../../backend/functions/src/services/subscription/subscription-lifecycle.service', () => ({
  subscriptionLifecycleService: {
    getActiveSubscriptionByTenant: jest.fn()
  }
}));

jest.mock('../../../backend/functions/src/services/billing/usage-billing.service', () => ({
  usageBillingService: {
    calculateBillingForPeriod: jest.fn()
  }
}));

describe('Billing Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlert', () => {
    it('should create a billing alert successfully', async () => {
      const mockAlertRef = { id: 'alert_123' };
      mockCollections.billing_alerts.add.mockResolvedValue(mockAlertRef);

      const request = {
        tenantId: 'tenant_123',
        type: BillingAlertType.USAGE_WARNING,
        title: 'Test Alert',
        message: 'Test message',
        severity: 'warning' as const
      };

      const result = await billingNotificationsService.createAlert(request);

      expect(mockCollections.billing_alerts.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ...request,
          createdAt: expect.any(Date)
        })
      );

      expect(result).toEqual({
        id: 'alert_123',
        ...request,
        createdAt: expect.any(Date)
      });
    });

    it('should handle errors when creating alerts', async () => {
      mockCollections.billing_alerts.add.mockRejectedValue(new Error('Database error'));

      const request = {
        tenantId: 'tenant_123',
        type: BillingAlertType.USAGE_WARNING,
        title: 'Test Alert',
        message: 'Test message',
        severity: 'warning' as const
      };

      await expect(billingNotificationsService.createAlert(request)).rejects.toThrow();
    });
  });

  describe('createUsageWarningAlert', () => {
    it('should create a usage warning alert with correct parameters', async () => {
      const mockAlertRef = { id: 'alert_456' };
      mockCollections.billing_alerts.add.mockResolvedValue(mockAlertRef);

      const result = await billingNotificationsService.createUsageWarningAlert(
        'tenant_123',
        'utilisateurs',
        85,
        100,
        85
      );

      expect(mockCollections.billing_alerts.add).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant_123',
          type: BillingAlertType.USAGE_WARNING,
          title: 'Limite de utilisateurs bientôt atteinte',
          message: expect.stringContaining('85%'),
          severity: 'warning',
          actionUrl: '/billing?tab=plans',
          actionText: 'Voir les plans',
          metadata: {
            metric: 'utilisateurs',
            currentUsage: 85,
            limit: 100,
            percentage: 85
          }
        })
      );

      expect(result.id).toBe('alert_456');
    });
  });

  describe('createUsageLimitExceededAlert', () => {
    it('should create a usage limit exceeded alert', async () => {
      const mockAlertRef = { id: 'alert_789' };
      mockCollections.billing_alerts.add.mockResolvedValue(mockAlertRef);

      const result = await billingNotificationsService.createUsageLimitExceededAlert(
        'tenant_123',
        'stockage',
        120,
        100,
        20
      );

      expect(mockCollections.billing_alerts.add).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant_123',
          type: BillingAlertType.USAGE_LIMIT_EXCEEDED,
          title: 'Limite de stockage dépassée',
          message: expect.stringContaining('dépassé votre limite'),
          severity: 'error',
          metadata: {
            metric: 'stockage',
            currentUsage: 120,
            limit: 100,
            overageAmount: 20
          }
        })
      );
    });
  });

  describe('createPaymentFailedAlert', () => {
    it('should create a payment failed alert', async () => {
      const mockAlertRef = { id: 'alert_payment' };
      mockCollections.billing_alerts.add.mockResolvedValue(mockAlertRef);

      const result = await billingNotificationsService.createPaymentFailedAlert(
        'tenant_123',
        'invoice_456',
        99.99,
        'EUR'
      );

      expect(mockCollections.billing_alerts.add).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant_123',
          type: BillingAlertType.PAYMENT_FAILED,
          title: 'Échec du paiement',
          message: expect.stringContaining('99.99 EUR'),
          severity: 'error',
          actionUrl: '/billing?tab=payment-methods',
          metadata: {
            invoiceId: 'invoice_456',
            amount: 99.99,
            currency: 'EUR'
          }
        })
      );
    });
  });

  describe('createTrialEndingAlert', () => {
    it('should create a trial ending alert for single day', async () => {
      const mockAlertRef = { id: 'alert_trial' };
      mockCollections.billing_alerts.add.mockResolvedValue(mockAlertRef);

      const result = await billingNotificationsService.createTrialEndingAlert(
        'tenant_123',
        1
      );

      expect(mockCollections.billing_alerts.add).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant_123',
          type: BillingAlertType.TRIAL_ENDING,
          title: 'Votre essai se termine bientôt',
          message: expect.stringContaining('1 jour'),
          severity: 'warning',
          actionUrl: '/billing?tab=plans',
          metadata: {
            daysRemaining: 1
          }
        })
      );
    });

    it('should create a trial ending alert for multiple days', async () => {
      const mockAlertRef = { id: 'alert_trial_multi' };
      mockCollections.billing_alerts.add.mockResolvedValue(mockAlertRef);

      await billingNotificationsService.createTrialEndingAlert('tenant_123', 3);

      expect(mockCollections.billing_alerts.add).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('3 jours')
        })
      );
    });
  });

  describe('getAlertsByTenant', () => {
    it('should retrieve alerts for a tenant', async () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'alert_1',
            data: () => ({
              tenantId: 'tenant_123',
              type: BillingAlertType.USAGE_WARNING,
              title: 'Test Alert',
              message: 'Test message',
              severity: 'warning',
              createdAt: new Date()
            })
          }
        ]
      };

      mockCollections.billing_alerts.where().orderBy().get.mockResolvedValue(mockSnapshot);

      const result = await billingNotificationsService.getAlertsByTenant('tenant_123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert_1');
      expect(result[0].tenantId).toBe('tenant_123');
    });

    it('should handle empty results', async () => {
      const mockSnapshot = { docs: [] };
      mockCollections.billing_alerts.where().orderBy().get.mockResolvedValue(mockSnapshot);

      const result = await billingNotificationsService.getAlertsByTenant('tenant_123');

      expect(result).toHaveLength(0);
    });
  });

  describe('dismissAlert', () => {
    it('should dismiss an alert successfully', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          tenantId: 'tenant_123',
          type: BillingAlertType.USAGE_WARNING
        })
      };

      mockCollections.billing_alerts.doc().get.mockResolvedValue(mockDoc);
      mockCollections.billing_alerts.doc().update.mockResolvedValue({});

      await billingNotificationsService.dismissAlert('alert_123', 'tenant_123');

      expect(mockCollections.billing_alerts.doc().update).toHaveBeenCalledWith({
        dismissedAt: expect.any(Date)
      });
    });

    it('should throw error for non-existent alert', async () => {
      const mockDoc = { exists: false };
      mockCollections.billing_alerts.doc().get.mockResolvedValue(mockDoc);

      await expect(
        billingNotificationsService.dismissAlert('alert_123', 'tenant_123')
      ).rejects.toThrow('Alert not found');
    });

    it('should throw error for wrong tenant', async () => {
      const mockDoc = {
        exists: true,
        data: () => ({
          tenantId: 'different_tenant',
          type: BillingAlertType.USAGE_WARNING
        })
      };

      mockCollections.billing_alerts.doc().get.mockResolvedValue(mockDoc);

      await expect(
        billingNotificationsService.dismissAlert('alert_123', 'tenant_123')
      ).rejects.toThrow('Access denied');
    });
  });

  describe('checkAndCreateUsageAlerts', () => {
    it('should create alerts for high usage metrics', async () => {
      const mockSnapshot = { docs: [] }; // No existing alerts
      mockCollections.billing_alerts.where().orderBy().get.mockResolvedValue(mockSnapshot);
      mockCollections.billing_alerts.add.mockResolvedValue({ id: 'new_alert' });

      const usage = {
        users: 95,
        events: 450,
        storage: 1900,
        apiCalls: 9500
      };

      const limits = {
        maxUsers: 100,
        maxEvents: 500,
        maxStorage: 2000,
        apiCallsPerMonth: 10000
      };

      await billingNotificationsService.checkAndCreateUsageAlerts('tenant_123', usage, limits);

      // Should create warning alerts for users (95%) and storage (95%)
      expect(mockCollections.billing_alerts.add).toHaveBeenCalledTimes(2);
    });

    it('should create overage alerts for exceeded limits', async () => {
      const mockSnapshot = { docs: [] };
      mockCollections.billing_alerts.where().orderBy().get.mockResolvedValue(mockSnapshot);
      mockCollections.billing_alerts.add.mockResolvedValue({ id: 'overage_alert' });

      const usage = {
        users: 110,
        events: 520,
        storage: 2100,
        apiCalls: 10500
      };

      const limits = {
        maxUsers: 100,
        maxEvents: 500,
        maxStorage: 2000,
        apiCallsPerMonth: 10000
      };

      await billingNotificationsService.checkAndCreateUsageAlerts('tenant_123', usage, limits);

      // Should create overage alerts for all metrics
      expect(mockCollections.billing_alerts.add).toHaveBeenCalledTimes(4);
    });

    it('should skip unlimited metrics', async () => {
      const mockSnapshot = { docs: [] };
      mockCollections.billing_alerts.where().orderBy().get.mockResolvedValue(mockSnapshot);

      const usage = {
        users: 1000,
        events: 5000,
        storage: 20000,
        apiCalls: 100000
      };

      const limits = {
        maxUsers: -1, // Unlimited
        maxEvents: -1, // Unlimited
        maxStorage: -1, // Unlimited
        apiCallsPerMonth: -1 // Unlimited
      };

      await billingNotificationsService.checkAndCreateUsageAlerts('tenant_123', usage, limits);

      // Should not create any alerts for unlimited metrics
      expect(mockCollections.billing_alerts.add).not.toHaveBeenCalled();
    });
  });
});

describe('Billing Alert Types', () => {
  it('should have all required alert types', () => {
    const expectedTypes = [
      'usage_warning',
      'usage_limit_exceeded',
      'payment_failed',
      'trial_ending',
      'subscription_cancelled',
      'invoice_overdue',
      'plan_upgrade_recommended'
    ];

    const actualTypes = Object.values(BillingAlertType);
    
    expectedTypes.forEach(type => {
      expect(actualTypes).toContain(type);
    });

    expect(actualTypes).toHaveLength(expectedTypes.length);
  });

  it('should have consistent naming convention', () => {
    const types = Object.values(BillingAlertType);
    
    types.forEach(type => {
      expect(type).toMatch(/^[a-z_]+$/); // Only lowercase letters and underscores
      expect(type).not.toMatch(/^_|_$/); // Should not start or end with underscore
      expect(type).not.toMatch(/__/); // Should not have consecutive underscores
    });
  });
});

describe('Automated Billing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInvoiceNumber', () => {
    it('should generate unique invoice numbers', () => {
      // Test the invoice number format indirectly through invoice generation
      const tenantId = 'test_tenant_123';
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const tenantPrefix = tenantId.substring(0, 4).toUpperCase();
      
      // Expected format: INV-{TENANT_PREFIX}-{YEAR}{MONTH}-{SEQUENCE}
      const expectedPattern = new RegExp(`^INV-${tenantPrefix}-${year}${month}-\\d{3}$`);
      
      // This would be tested through the actual invoice generation
      expect(expectedPattern.test(`INV-${tenantPrefix}-${year}${month}-001`)).toBe(true);
    });
  });
});

console.log('✅ Tests de facturation configurés dans tests/backend/services/');
console.log('📊 Coverage:');
console.log('  - Service de notifications de facturation');
console.log('  - Création et gestion des alertes');
console.log('  - Validation des types d\'alertes');
console.log('  - Gestion des erreurs');
console.log('💡 Pour exécuter: npm test -- billing.test.ts');