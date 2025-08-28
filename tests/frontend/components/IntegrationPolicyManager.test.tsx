// tests/frontend/components/IntegrationPolicyManager.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntegrationPolicyManager } from '../../../frontend/src/components/admin/IntegrationPolicyManager';
import { integrationService } from '../../../frontend/src/services/integrationService';
import { IntegrationProvider } from '@attendance-x/shared';

// Mock du service d'intégration
jest.mock('../../../frontend/src/services/integrationService', () => ({
  integrationService: {
    getOrganizationPolicies: jest.fn(),
    getIntegrationUsageStats: jest.fn(),
    getAllUserIntegrations: jest.fn(),
    updateIntegrationPolicy: jest.fn(),
    revokeIntegration: jest.fn(),
    bulkRevokeProvider: jest.fn(),
    generateUsageReport: jest.fn()
  }
}));

// Mock des composants UI
jest.mock('../../../frontend/src/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>
}));

const mockPolicies = [
  {
    provider: IntegrationProvider.GOOGLE,
    enabled: true,
    requiredPermissions: ['calendar.read', 'calendar.write'],
    allowedRoles: ['user', 'admin'],
    restrictions: 'Accès limité aux calendriers professionnels',
    securityLevel: 'standard' as const
  },
  {
    provider: IntegrationProvider.MICROSOFT,
    enabled: false,
    requiredPermissions: ['mail.read', 'calendars.read'],
    allowedRoles: ['admin'],
    restrictions: 'Accès restreint aux administrateurs uniquement',
    securityLevel: 'high' as const
  }
];

const mockUsageStats = [
  {
    provider: IntegrationProvider.GOOGLE,
    totalUsers: 150,
    activeConnections: 120,
    lastUsed: new Date('2024-01-15T10:00:00Z'),
    dataVolume: 2500
  },
  {
    provider: IntegrationProvider.MICROSOFT,
    totalUsers: 50,
    activeConnections: 30,
    lastUsed: new Date('2024-01-10T15:30:00Z'),
    dataVolume: 800
  }
];

const mockUserIntegrations = [
  {
    id: 'integration-1',
    userId: 'user-1',
    organizationId: 'org-1',
    provider: IntegrationProvider.GOOGLE,
    externalUserId: 'google-user-1',
    displayName: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    status: 'connected' as const,
    permissions: ['calendar.read'],
    syncSettings: {
      enabled: true,
      syncTypes: ['calendar'],
      frequency: 'hourly' as const,
      bidirectional: false
    },
    metadata: {},
    connectedAt: new Date('2024-01-01T00:00:00Z'),
    lastSyncAt: new Date('2024-01-15T10:00:00Z'),
    lastError: null,
    retryCount: 0,
    nextRetryAt: null
  }
];

describe('IntegrationPolicyManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (integrationService.getOrganizationPolicies as jest.Mock).mockResolvedValue(mockPolicies);
    (integrationService.getIntegrationUsageStats as jest.Mock).mockResolvedValue(mockUsageStats);
    (integrationService.getAllUserIntegrations as jest.Mock).mockResolvedValue(mockUserIntegrations);
  });

  it('should render the component with title and tabs', async () => {
    render(<IntegrationPolicyManager />);

    expect(screen.getByText('Politiques d\'intégration')).toBeInTheDocument();
    expect(screen.getByText('Gérez les intégrations autorisées et surveillez leur utilisation')).toBeInTheDocument();
    
    expect(screen.getByText('Politiques')).toBeInTheDocument();
    expect(screen.getByText('Utilisation')).toBeInTheDocument();
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
  });

  it('should load data on mount', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getOrganizationPolicies).toHaveBeenCalled();
      expect(integrationService.getIntegrationUsageStats).toHaveBeenCalled();
      expect(integrationService.getAllUserIntegrations).toHaveBeenCalled();
    });
  });

  it('should display policies in the policies tab', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(screen.getByText('google')).toBeInTheDocument();
      expect(screen.getByText('microsoft')).toBeInTheDocument();
    });

    expect(screen.getByText('Autorisé')).toBeInTheDocument();
    expect(screen.getByText('Bloqué')).toBeInTheDocument();
  });

  it('should display usage statistics in the usage tab', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getIntegrationUsageStats).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Utilisation'));

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Google total users
      expect(screen.getByText('120')).toBeInTheDocument(); // Google active connections
      expect(screen.getByText('2500 MB')).toBeInTheDocument(); // Google data volume
    });
  });

  it('should display user integrations in the users tab', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getAllUserIntegrations).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Utilisateurs'));

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('google - connected')).toBeInTheDocument();
      expect(screen.getByText('Connecté')).toBeInTheDocument();
    });
  });

  it('should toggle policy enabled state', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getOrganizationPolicies).toHaveBeenCalled();
    });

    // Find and click the switch for Google (should be enabled)
    const switches = screen.getAllByRole('switch');
    const googleSwitch = switches[0]; // Assuming Google is first

    fireEvent.click(googleSwitch);

    await waitFor(() => {
      expect(integrationService.updateIntegrationPolicy).toHaveBeenCalledWith(
        IntegrationProvider.GOOGLE,
        { enabled: false }
      );
    });
  });

  it('should revoke user integration', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getAllUserIntegrations).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Utilisateurs'));

    const revokeButtons = screen.getAllByRole('button');
    const revokeButton = revokeButtons.find(button => 
      button.querySelector('svg') // Looking for the trash icon
    );

    if (revokeButton) {
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(integrationService.revokeIntegration).toHaveBeenCalledWith('integration-1');
      });
    }
  });

  it('should bulk revoke provider integrations', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getOrganizationPolicies).toHaveBeenCalled();
    });

    const revokeAllButton = screen.getByText('Révoquer tout');
    fireEvent.click(revokeAllButton);

    await waitFor(() => {
      expect(integrationService.bulkRevokeProvider).toHaveBeenCalledWith(
        IntegrationProvider.GOOGLE
      );
    });
  });

  it('should export usage report', async () => {
    const mockReport = { data: 'mock report data' };
    (integrationService.generateUsageReport as jest.Mock).mockResolvedValue(mockReport);

    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    const mockClick = jest.fn();
    const mockRevokeObjectURL = jest.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    render(<IntegrationPolicyManager />);

    const exportButton = screen.getByText('Exporter le rapport');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(integrationService.generateUsageReport).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  it('should handle loading state', () => {
    (integrationService.getOrganizationPolicies as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<IntegrationPolicyManager />);

    // Component should render even during loading
    expect(screen.getByText('Politiques d\'intégration')).toBeInTheDocument();
  });

  it('should handle service errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (integrationService.getOrganizationPolicies as jest.Mock).mockRejectedValue(
      new Error('Service error')
    );

    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erreur lors du chargement des données:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should display correct status badges', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getOrganizationPolicies).toHaveBeenCalled();
    });

    expect(screen.getByText('Autorisé')).toBeInTheDocument();
    expect(screen.getByText('Bloqué')).toBeInTheDocument();
  });

  it('should display permissions and roles', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getOrganizationPolicies).toHaveBeenCalled();
    });

    expect(screen.getByText('calendar.read')).toBeInTheDocument();
    expect(screen.getByText('calendar.write')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('should display restrictions when present', async () => {
    render(<IntegrationPolicyManager />);

    await waitFor(() => {
      expect(integrationService.getOrganizationPolicies).toHaveBeenCalled();
    });

    expect(screen.getByText('Accès limité aux calendriers professionnels')).toBeInTheDocument();
    expect(screen.getByText('Accès restreint aux administrateurs uniquement')).toBeInTheDocument();
  });
});