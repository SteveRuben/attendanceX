// tests/frontend/components/SyncHistoryModal.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncHistoryModal } from '../../../frontend/src/components/preferences/SyncHistoryModal';
import { integrationService } from '../../../frontend/src/services/integrationService';
import { IntegrationProvider } from '@attendance-x/shared';

// Mock du service d'intégration
jest.mock('../../../frontend/src/services/integrationService', () => ({
  integrationService: {
    getSyncHistory: jest.fn()
  }
}));

// Mock de date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr.includes('dd/MM/yyyy')) {
      return '15/01/2024 14:30';
    }
    return '15/01/2024 à 14:30';
  })
}));

const mockSyncHistory = [
  {
    id: '1',
    integrationId: 'integration-1',
    syncType: 'calendar',
    status: 'success' as const,
    startedAt: new Date('2024-01-15T14:30:00Z'),
    completedAt: new Date('2024-01-15T14:31:00Z'),
    itemsProcessed: 10,
    itemsCreated: 5,
    itemsUpdated: 3,
    itemsDeleted: 2,
    errors: [],
    duration: 60000
  },
  {
    id: '2',
    integrationId: 'integration-1',
    syncType: 'contacts',
    status: 'error' as const,
    startedAt: new Date('2024-01-15T13:30:00Z'),
    completedAt: new Date('2024-01-15T13:31:00Z'),
    itemsProcessed: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsDeleted: 0,
    errors: ['Connection timeout', 'Invalid credentials'],
    duration: 30000
  }
];

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  integrationId: 'integration-1',
  provider: IntegrationProvider.GOOGLE
};

describe('SyncHistoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (integrationService.getSyncHistory as jest.Mock).mockResolvedValue({
      history: mockSyncHistory,
      total: 2,
      hasMore: false
    });
  });

  it('should render modal when open', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    expect(screen.getByText('Historique de synchronisation - google')).toBeInTheDocument();
    expect(screen.getByText('Historique')).toBeInTheDocument();
    expect(screen.getByText('Statistiques')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(<SyncHistoryModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Historique de synchronisation - google')).not.toBeInTheDocument();
  });

  it('should load sync history on open', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalledWith('integration-1');
    });

    expect(screen.getByText('2 synchronisation(s) enregistrée(s)')).toBeInTheDocument();
  });

  it('should display sync history items', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Calendrier')).toBeInTheDocument();
      expect(screen.getByText('Contacts')).toBeInTheDocument();
    });

    // Vérifier les statuts
    expect(screen.getByText('Réussi')).toBeInTheDocument();
    expect(screen.getByText('Échec')).toBeInTheDocument();

    // Vérifier les détails
    expect(screen.getByText('10')).toBeInTheDocument(); // itemsProcessed
    expect(screen.getByText('5')).toBeInTheDocument(); // itemsCreated
  });

  it('should display error messages', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should switch to statistics tab', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Statistiques'));

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Réussies')).toBeInTheDocument();
    expect(screen.getByText('Échecs')).toBeInTheDocument();
    expect(screen.getByText('Taux de réussite')).toBeInTheDocument();
  });

  it('should calculate statistics correctly', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Statistiques'));

    // Total syncs: 2
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Successful syncs: 1
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Success rate: 50%
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('should refresh history when refresh button is clicked', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByText('Actualiser');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('should export history as CSV', async () => {
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

    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalled();
    });

    const exportButton = screen.getByText('Exporter');
    fireEvent.click(exportButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('should handle loading state', () => {
    (integrationService.getSyncHistory as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<SyncHistoryModal {...defaultProps} />);

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('should handle empty history', async () => {
    (integrationService.getSyncHistory as jest.Mock).mockResolvedValue({
      history: [],
      total: 0,
      hasMore: false
    });

    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Aucune synchronisation enregistrée')).toBeInTheDocument();
    });
  });

  it('should handle service errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (integrationService.getSyncHistory as jest.Mock).mockRejectedValue(
      new Error('Service error')
    );

    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Erreur lors du chargement de l\'historique:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should close modal when close button is clicked', () => {
    const onClose = jest.fn();
    render(<SyncHistoryModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByText('Fermer');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should format duration correctly', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalled();
    });

    // 60000ms should be formatted as "1.0min"
    expect(screen.getByText('1.0min')).toBeInTheDocument();
    // 30000ms should be formatted as "30.0s"
    expect(screen.getByText('30.0s')).toBeInTheDocument();
  });

  it('should display sync type in French', async () => {
    render(<SyncHistoryModal {...defaultProps} />);

    await waitFor(() => {
      expect(integrationService.getSyncHistory).toHaveBeenCalled();
    });

    expect(screen.getByText('Calendrier')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
  });
});