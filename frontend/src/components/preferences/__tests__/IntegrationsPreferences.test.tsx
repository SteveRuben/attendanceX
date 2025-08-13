import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IntegrationsPreferences } from '../IntegrationsPreferences';
import { integrationService } from '@/services/integrationService';
import { IntegrationProvider } from '@attendance-x/shared';

// Mock the integration service
jest.mock('@/services/integrationService', () => ({
  integrationService: {
    getUserIntegrations: jest.fn(),
    initiateOAuthFlow: jest.fn(),
    disconnectIntegration: jest.fn(),
    updateIntegrationSettings: jest.fn(),
    getSyncHistory: jest.fn()
  }
}));

// Mock the hooks
jest.mock('@/hooks/useIntegrations', () => ({
  useIntegrations: () => ({
    integrations: [
      {
        id: 'integration1',
        provider: IntegrationProvider.GOOGLE,
        status: 'connected',
        permissions: ['calendar.read', 'calendar.write'],
        syncSettings: {
          enabled: true,
          syncCalendar: true,
          syncContacts: false,
          syncFrequency: 'hourly'
        },
        connectedAt: new Date('2024-01-01'),
        lastSyncAt: new Date('2024-01-02')
      },
      {
        id: 'integration2',
        provider: IntegrationProvider.MICROSOFT,
        status: 'disconnected',
        permissions: [],
        syncSettings: {
          enabled: false,
          syncCalendar: false,
          syncContacts: false,
          syncFrequency: 'daily'
        },
        connectedAt: null,
        lastSyncAt: null
      }
    ],
    loading: false,
    error: null,
    refreshIntegrations: jest.fn()
  })
}));

const mockIntegrationService = integrationService as jest.Mocked<typeof integrationService>;

describe('IntegrationsPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render integrations list', () => {
    render(<IntegrationsPreferences />);

    expect(screen.getByText('Intégrations')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Microsoft')).toBeInTheDocument();
  });

  it('should show connected status for active integrations', () => {
    render(<IntegrationsPreferences />);

    const googleCard = screen.getByText('Google').closest('.card');
    expect(googleCard).toContainElement(screen.getByText('Connecté'));
  });

  it('should show disconnected status for inactive integrations', () => {
    render(<IntegrationsPreferences />);

    const microsoftCard = screen.getByText('Microsoft').closest('.card');
    expect(microsoftCard).toContainElement(screen.getByText('Déconnecté'));
  });

  it('should handle OAuth connection flow', async () => {
    mockIntegrationService.initiateOAuthFlow.mockResolvedValue({
      authUrl: 'https://oauth.example.com/auth',
      state: 'state123'
    });

    render(<IntegrationsPreferences />);

    const connectButton = screen.getByText('Connecter');
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(mockIntegrationService.initiateOAuthFlow).toHaveBeenCalledWith(
        IntegrationProvider.MICROSOFT
      );
    });
  });

  it('should handle integration disconnection', async () => {
    mockIntegrationService.disconnectIntegration.mockResolvedValue(undefined);

    render(<IntegrationsPreferences />);

    const disconnectButton = screen.getByText('Déconnecter');
    fireEvent.click(disconnectButton);

    // Confirm disconnection
    const confirmButton = screen.getByText('Confirmer');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockIntegrationService.disconnectIntegration).toHaveBeenCalledWith('integration1');
    });
  });

  it('should open sync settings modal', async () => {
    render(<IntegrationsPreferences />);

    const settingsButton = screen.getByText('Paramètres');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Paramètres de synchronisation')).toBeInTheDocument();
    });
  });

  it('should update sync settings', async () => {
    mockIntegrationService.updateIntegrationSettings.mockResolvedValue(undefined);

    render(<IntegrationsPreferences />);

    // Open settings modal
    const settingsButton = screen.getByText('Paramètres');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Paramètres de synchronisation')).toBeInTheDocument();
    });

    // Toggle calendar sync
    const calendarToggle = screen.getByLabelText('Synchroniser le calendrier');
    fireEvent.click(calendarToggle);

    // Save settings
    const saveButton = screen.getByText('Enregistrer');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockIntegrationService.updateIntegrationSettings).toHaveBeenCalledWith(
        'integration1',
        expect.objectContaining({
          syncSettings: expect.objectContaining({
            syncCalendar: false
          })
        })
      );
    });
  });

  it('should show sync history', async () => {
    const mockSyncHistory = [
      {
        id: 'history1',
        integrationId: 'integration1',
        syncType: 'calendar',
        status: 'success',
        timestamp: new Date('2024-01-02'),
        itemsProcessed: 10,
        duration: 1500
      },
      {
        id: 'history2',
        integrationId: 'integration1',
        syncType: 'calendar',
        status: 'error',
        timestamp: new Date('2024-01-01'),
        error: 'Rate limit exceeded',
        duration: 500
      }
    ];

    mockIntegrationService.getSyncHistory.mockResolvedValue(mockSyncHistory);

    render(<IntegrationsPreferences />);

    // Open history modal
    const historyButton = screen.getByText('Historique');
    fireEvent.click(historyButton);

    await waitFor(() => {
      expect(screen.getByText('Historique de synchronisation')).toBeInTheDocument();
      expect(screen.getByText('Réussi')).toBeInTheDocument();
      expect(screen.getByText('Échec')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    // Mock loading state
    jest.doMock('@/hooks/useIntegrations', () => ({
      useIntegrations: () => ({
        integrations: [],
        loading: true,
        error: null,
        refreshIntegrations: jest.fn()
      })
    }));

    render(<IntegrationsPreferences />);

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    // Mock error state
    jest.doMock('@/hooks/useIntegrations', () => ({
      useIntegrations: () => ({
        integrations: [],
        loading: false,
        error: 'Failed to load integrations',
        refreshIntegrations: jest.fn()
      })
    }));

    render(<IntegrationsPreferences />);

    expect(screen.getByText('Erreur lors du chargement des intégrations')).toBeInTheDocument();
  });

  it('should filter integrations by provider', () => {
    render(<IntegrationsPreferences />);

    // Test search/filter functionality
    const searchInput = screen.getByPlaceholderText('Rechercher une intégration...');
    fireEvent.change(searchInput, { target: { value: 'Google' } });

    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.queryByText('Microsoft')).not.toBeInTheDocument();
  });

  it('should show integration permissions', () => {
    render(<IntegrationsPreferences />);

    const googleCard = screen.getByText('Google').closest('.card');
    expect(googleCard).toContainElement(screen.getByText('calendar.read'));
    expect(googleCard).toContainElement(screen.getByText('calendar.write'));
  });

  it('should display last sync information', () => {
    render(<IntegrationsPreferences />);

    expect(screen.getByText(/Dernière sync:/)).toBeInTheDocument();
  });
});