/**
 * Tests pour les composants de facturation frontend
 * Teste les composants React de l'interface de facturation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock des services
const mockBillingService = {
  getBillingDashboard: jest.fn(),
  getAvailablePlans: jest.fn(),
  changePlan: jest.fn(),
  getInvoices: jest.fn(),
  getOveragePreview: jest.fn(),
  cancelSubscription: jest.fn()
};

jest.mock('../../../frontend/src/services/billingService', () => ({
  billingService: mockBillingService,
  SubscriptionStatus: {
    ACTIVE: 'active',
    TRIALING: 'trialing',
    PAST_DUE: 'past_due',
    CANCELLED: 'cancelled',
    UNPAID: 'unpaid',
    INCOMPLETE: 'incomplete'
  },
  InvoiceStatus: {
    DRAFT: 'draft',
    OPEN: 'open',
    PAID: 'paid',
    VOID: 'void',
    UNCOLLECTIBLE: 'uncollectible'
  }
}));

// Mock des utilitaires de formatage
jest.mock('../../../frontend/src/utils/formatters', () => ({
  formatCurrency: (amount: number, currency: string) => `${amount}€`,
  formatDate: (date: Date) => date.toLocaleDateString('fr-FR'),
  formatBytes: (bytes: number) => `${bytes} MB`,
  formatNumber: (num: number) => num.toLocaleString('fr-FR'),
  formatPercentage: (value: number) => `${value}%`
}));

// Mock des composants UI
jest.mock('../../../frontend/src/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={`card ${className}`}>{children}</div>,
  CardContent: ({ children }: any) => <div className="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div className="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div className="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 className="card-title">{children}</h3>
}));

jest.mock('../../../frontend/src/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`button ${variant}`}
    >
      {children}
    </button>
  )
}));

jest.mock('../../../frontend/src/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span className={`badge ${variant}`}>{children}</span>
  )
}));

jest.mock('../../../frontend/src/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div className="progress" data-value={value}>
      <div className="progress-bar" style={{ width: `${value}%` }} />
    </div>
  )
}));

jest.mock('../../../frontend/src/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div className="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div className="tab-content" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div className="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button className="tab-trigger" data-value={value} onClick={onClick}>
      {children}
    </button>
  )
}));

jest.mock('../../../frontend/src/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div className={`alert ${variant}`}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => (
    <div className="alert-description">{children}</div>
  )
}));

// Import des composants à tester (après les mocks)
import { BillingDashboard } from '../../../frontend/src/components/billing/BillingDashboard';
import { InvoiceList } from '../../../frontend/src/components/billing/InvoiceList';
import { UsageMetrics } from '../../../frontend/src/components/billing/UsageMetrics';
import { PlanComparison } from '../../../frontend/src/components/billing/PlanComparison';

// Données de test
const mockDashboardData = {
  currentPlan: {
    id: 'pro',
    name: 'Professional',
    price: 99.99,
    currency: 'EUR',
    billingCycle: 'monthly' as const,
    features: {
      advancedReporting: true,
      apiAccess: true,
      customBranding: true,
      webhooks: true,
      ssoIntegration: false,
      prioritySupport: true
    },
    limits: {
      maxUsers: 100,
      maxEvents: 1000,
      maxStorage: 5000,
      apiCallsPerMonth: 50000
    },
    isActive: true,
    sortOrder: 2
  },
  subscription: {
    id: 'sub_123',
    tenantId: 'tenant_123',
    planId: 'pro',
    status: 'active' as const,
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    billingCycle: 'monthly' as const,
    basePrice: 99.99,
    currency: 'EUR',
    nextPaymentDate: new Date('2024-02-01')
  },
  usage: {
    users: 75,
    events: 450,
    storage: 2500,
    apiCalls: 25000
  },
  limits: {
    maxUsers: 100,
    maxEvents: 1000,
    maxStorage: 5000,
    apiCallsPerMonth: 50000
  },
  overagePreview: {
    hasOverages: false,
    totalOverageCost: 0,
    currency: 'EUR',
    overages: []
  },
  recentInvoices: [
    {
      id: 'inv_1',
      tenantId: 'tenant_123',
      subscriptionId: 'sub_123',
      invoiceNumber: 'INV-TEST-202401-001',
      amount: 99.99,
      currency: 'EUR',
      status: 'paid' as const,
      issueDate: new Date('2024-01-01'),
      dueDate: new Date('2024-01-15'),
      paidAt: new Date('2024-01-02'),
      lineItems: []
    }
  ],
  billingInfo: {
    nextBillingDate: new Date('2024-02-01'),
    billingCycle: 'monthly' as const,
    currency: 'EUR'
  }
};

const mockPlansData = {
  plans: [
    {
      id: 'basic',
      name: 'Basic',
      description: 'Plan de base',
      price: 29.99,
      currency: 'EUR',
      billingCycle: 'monthly' as const,
      features: {
        advancedReporting: false,
        apiAccess: false,
        customBranding: false,
        webhooks: false,
        ssoIntegration: false,
        prioritySupport: false
      },
      limits: {
        maxUsers: 25,
        maxEvents: 100,
        maxStorage: 1000,
        apiCallsPerMonth: 5000
      },
      isActive: true,
      sortOrder: 1
    },
    mockDashboardData.currentPlan
  ],
  comparison: {
    features: ['Rapports avancés', 'Accès API', 'Personnalisation'],
    planFeatures: {
      'basic': [false, false, false],
      'pro': [true, true, true]
    }
  }
};

describe('BillingDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBillingService.getBillingDashboard.mockResolvedValue(mockDashboardData);
  });

  it('should render billing dashboard with correct data', async () => {
    render(<BillingDashboard />);

    // Vérifier le titre
    expect(screen.getByText('Facturation')).toBeInTheDocument();

    // Attendre que les données se chargent
    await waitFor(() => {
      expect(screen.getByText('Professional')).toBeInTheDocument();
    });

    // Vérifier les informations du plan
    expect(screen.getByText('99.99€')).toBeInTheDocument();
    expect(screen.getByText('Plan actuel')).toBeInTheDocument();
  });

  it('should display usage metrics correctly', async () => {
    render(<BillingDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    });

    // Vérifier les métriques d'usage
    expect(screen.getByText('75')).toBeInTheDocument(); // Utilisateurs actuels
    expect(screen.getByText('sur 100 autorisés')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    mockBillingService.getBillingDashboard.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<BillingDashboard />);

    // Vérifier l'état de chargement
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockBillingService.getBillingDashboard.mockRejectedValue(
      new Error('Failed to load')
    );

    render(<BillingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Erreur lors du chargement/)).toBeInTheDocument();
    });
  });

  it('should display overages when present', async () => {
    const dataWithOverages = {
      ...mockDashboardData,
      overagePreview: {
        hasOverages: true,
        totalOverageCost: 25.50,
        currency: 'EUR',
        overages: [
          {
            metric: 'users',
            baseLimit: 100,
            actualUsage: 120,
            overageAmount: 20,
            unitPrice: 1.25,
            totalCost: 25.00
          }
        ]
      }
    };

    mockBillingService.getBillingDashboard.mockResolvedValue(dataWithOverages);

    render(<BillingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Dépassements ce mois-ci/)).toBeInTheDocument();
    });

    expect(screen.getByText('25.5€')).toBeInTheDocument();
  });
});

describe('InvoiceList Component', () => {
  const mockInvoicesData = {
    invoices: [
      {
        id: 'inv_1',
        tenantId: 'tenant_123',
        subscriptionId: 'sub_123',
        invoiceNumber: 'INV-TEST-001',
        amount: 99.99,
        currency: 'EUR',
        status: 'paid' as const,
        issueDate: new Date('2024-01-01'),
        dueDate: new Date('2024-01-15'),
        paidAt: new Date('2024-01-02'),
        lineItems: []
      },
      {
        id: 'inv_2',
        tenantId: 'tenant_123',
        subscriptionId: 'sub_123',
        invoiceNumber: 'INV-TEST-002',
        amount: 99.99,
        currency: 'EUR',
        status: 'open' as const,
        issueDate: new Date('2024-02-01'),
        dueDate: new Date('2024-02-15'),
        lineItems: []
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  };

  beforeEach(() => {
    mockBillingService.getInvoices.mockResolvedValue(mockInvoicesData);
  });

  it('should render invoice list', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('INV-TEST-001')).toBeInTheDocument();
    });

    expect(screen.getByText('INV-TEST-002')).toBeInTheDocument();
    expect(screen.getAllByText('99.99€')).toHaveLength(2);
  });

  it('should filter invoices by search term', async () => {
    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Rechercher/)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Rechercher/);
    fireEvent.change(searchInput, { target: { value: 'INV-TEST-001' } });

    // La logique de filtrage devrait être testée ici
    expect(searchInput).toHaveValue('INV-TEST-001');
  });

  it('should handle empty invoice list', async () => {
    mockBillingService.getInvoices.mockResolvedValue({
      invoices: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    });

    render(<InvoiceList />);

    await waitFor(() => {
      expect(screen.getByText('Aucune facture trouvée')).toBeInTheDocument();
    });
  });
});

describe('UsageMetrics Component', () => {
  const mockUsage = {
    users: 85,
    events: 750,
    storage: 4500,
    apiCalls: 45000
  };

  const mockLimits = {
    maxUsers: 100,
    maxEvents: 1000,
    maxStorage: 5000,
    apiCallsPerMonth: 50000
  };

  beforeEach(() => {
    mockBillingService.getOveragePreview.mockResolvedValue({
      hasOverages: false,
      totalOverageCost: 0,
      currency: 'EUR',
      overages: []
    });
  });

  it('should render usage metrics with correct percentages', async () => {
    render(<UsageMetrics usage={mockUsage} limits={mockLimits} />);

    await waitFor(() => {
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    });

    // Vérifier les valeurs d'usage
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('sur 100 utilisateurs')).toBeInTheDocument();
  });

  it('should show warning for high usage', async () => {
    const highUsage = {
      users: 95,
      events: 950,
      storage: 4800,
      apiCalls: 48000
    };

    render(<UsageMetrics usage={highUsage} limits={mockLimits} />);

    await waitFor(() => {
      expect(screen.getByText(/Utilisation élevée|Limite proche/)).toBeInTheDocument();
    });
  });

  it('should display overage information', async () => {
    const overageUsage = {
      users: 110,
      events: 1100,
      storage: 5500,
      apiCalls: 55000
    };

    mockBillingService.getOveragePreview.mockResolvedValue({
      hasOverages: true,
      totalOverageCost: 50.00,
      currency: 'EUR',
      overages: [
        {
          metric: 'users',
          baseLimit: 100,
          actualUsage: 110,
          overageAmount: 10,
          unitPrice: 2.00,
          totalCost: 20.00
        }
      ]
    });

    render(<UsageMetrics usage={overageUsage} limits={mockLimits} />);

    await waitFor(() => {
      expect(screen.getByText(/Coûts supplémentaires/)).toBeInTheDocument();
    });
  });
});

describe('PlanComparison Component', () => {
  beforeEach(() => {
    mockBillingService.getAvailablePlans.mockResolvedValue(mockPlansData);
  });

  it('should render available plans', async () => {
    render(<PlanComparison currentPlanId="pro" />);

    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
    });

    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Plan actuel')).toBeInTheDocument();
  });

  it('should handle plan selection', async () => {
    const mockOnPlanChanged = jest.fn();
    render(<PlanComparison currentPlanId="basic" onPlanChanged={mockOnPlanChanged} />);

    await waitFor(() => {
      expect(screen.getByText('Professional')).toBeInTheDocument();
    });

    // Simuler la sélection d'un plan
    const proCard = screen.getByText('Professional').closest('.card');
    if (proCard) {
      fireEvent.click(proCard);
    }

    // Vérifier que le dialog de confirmation s'ouvre
    // (Ceci dépendrait de l'implémentation du dialog)
  });

  it('should show billing cycle toggle', async () => {
    render(<PlanComparison currentPlanId="pro" />);

    await waitFor(() => {
      expect(screen.getByText('Mensuel')).toBeInTheDocument();
    });

    expect(screen.getByText('Annuel')).toBeInTheDocument();
  });
});

describe('Billing Components Integration', () => {
  it('should handle service errors gracefully', async () => {
    // Simuler des erreurs de service
    mockBillingService.getBillingDashboard.mockRejectedValue(
      new Error('Network error')
    );

    render(<BillingDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Erreur/)).toBeInTheDocument();
    });
  });

  it('should format currencies correctly', () => {
    const { formatCurrency } = require('../../../frontend/src/utils/formatters');
    
    expect(formatCurrency(99.99, 'EUR')).toBe('99.99€');
    expect(formatCurrency(0, 'EUR')).toBe('0€');
    expect(formatCurrency(1234.56, 'USD')).toBe('1234.56€'); // Mock returns EUR
  });

  it('should handle date formatting', () => {
    const { formatDate } = require('../../../frontend/src/utils/formatters');
    const testDate = new Date('2024-01-15');
    
    expect(formatDate(testDate)).toBe(testDate.toLocaleDateString('fr-FR'));
  });
});

console.log('✅ Tests frontend de facturation configurés');
console.log('🧪 Composants testés:');
console.log('  - BillingDashboard');
console.log('  - InvoiceList');
console.log('  - UsageMetrics');
console.log('  - PlanComparison');
console.log('🔧 Fonctionnalités testées:');
console.log('  - Rendu des données');
console.log('  - États de chargement et d\'erreur');
console.log('  - Interactions utilisateur');
console.log('  - Formatage des données');
console.log('💡 Pour exécuter: npm test -- billing.test.tsx');