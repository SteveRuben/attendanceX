/**
 * Tests d'intégration pour les workflows de présence
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PresenceTracker } from '../../../frontend/src/components/presence/PresenceTracker';
import { MobilePresenceTracker } from '../../../frontend/src/components/mobile/MobilePresenceTracker';
import { presenceIntegrationApi } from '../../../frontend/src/services/api/presence-integration.api';
import { PresenceEntry } from '@attendance-x/shared';

// Mock des services
vi.mock('../../../frontend/src/services/api/presence-integration.api');
vi.mock('../../../frontend/src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', employeeId: 'emp-1', name: 'John Doe' }
  })
}));

vi.mock('../../../frontend/src/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    location: { latitude: 48.8566, longitude: 2.3522, accuracy: 10 },
    loading: false,
    error: null,
    requestLocation: vi.fn()
  })
}));

// Wrapper pour les tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Presence Workflow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Complete Clock In/Out Workflow', () => {
    it('should complete full day workflow: clock in -> break -> resume -> clock out', async () => {
      // Mock des réponses API séquentielles
      const mockPresenceStates = {
        initial: null,
        clockedIn: {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'present',
          onBreak: false
        },
        onBreak: {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'on_break',
          onBreak: true
        },
        backFromBreak: {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'present',
          onBreak: false
        },
        clockedOut: {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          clockOutTime: new Date(),
          status: 'absent',
          onBreak: false
        }
      };

      // Configuration des mocks
      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(mockPresenceStates.initial)
        .mockResolvedValueOnce(mockPresenceStates.clockedIn)
        .mockResolvedValueOnce(mockPresenceStates.onBreak)
        .mockResolvedValueOnce(mockPresenceStates.backFromBreak)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      (presenceIntegrationApi.clockIn as Mock)
        .mockResolvedValueOnce(mockPresenceStates.clockedIn);

      (presenceIntegrationApi.startBreak as Mock)
        .mockResolvedValueOnce(mockPresenceStates.onBreak);

      (presenceIntegrationApi.endBreak as Mock)
        .mockResolvedValueOnce(mockPresenceStates.backFromBreak);

      (presenceIntegrationApi.clockOut as Mock)
        .mockResolvedValueOnce(mockPresenceStates.clockedOut);

      render(
        <TestWrapper>
          <PresenceTracker />
        </TestWrapper>
      );

      // 1. État initial - employé absent
      await waitFor(() => {
        expect(screen.getByText(/pointer l'arrivée/i)).toBeInTheDocument();
      });

      // 2. Clock In
      const clockInButton = screen.getByText(/pointer l'arrivée/i);
      await user.click(clockInButton);

      await waitFor(() => {
        expect(presenceIntegrationApi.clockIn).toHaveBeenCalledWith('emp-1', {
          latitude: 48.8566,
          longitude: 2.3522
        });
      });

      // 3. Vérifier l'état présent
      await waitFor(() => {
        expect(screen.getByText(/commencer une pause/i)).toBeInTheDocument();
        expect(screen.getByText(/pointer le départ/i)).toBeInTheDocument();
      });

      // 4. Commencer une pause
      const startBreakButton = screen.getByText(/commencer une pause/i);
      await user.click(startBreakButton);

      await waitFor(() => {
        expect(presenceIntegrationApi.startBreak).toHaveBeenCalledWith('emp-1');
      });

      // 5. Vérifier l'état en pause
      await waitFor(() => {
        expect(screen.getByText(/reprendre le travail/i)).toBeInTheDocument();
      });

      // 6. Reprendre le travail
      const endBreakButton = screen.getByText(/reprendre le travail/i);
      await user.click(endBreakButton);

      await waitFor(() => {
        expect(presenceIntegrationApi.endBreak).toHaveBeenCalledWith('emp-1');
      });

      // 7. Vérifier le retour au travail
      await waitFor(() => {
        expect(screen.getByText(/commencer une pause/i)).toBeInTheDocument();
      });

      // 8. Clock Out
      const clockOutButton = screen.getByText(/pointer le départ/i);
      await user.click(clockOutButton);

      await waitFor(() => {
        expect(presenceIntegrationApi.clockOut).toHaveBeenCalledWith('emp-1', {
          latitude: 48.8566,
          longitude: 2.3522
        });
      });

      // 9. Vérifier l'état final
      await waitFor(() => {
        expect(screen.getByText(/pointer l'arrivée/i)).toBeInTheDocument();
      });
    });

    it('should handle errors gracefully during workflow', async () => {
      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      (presenceIntegrationApi.clockIn as Mock)
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <PresenceTracker />
        </TestWrapper>
      );

      // Attendre le chargement initial
      await waitFor(() => {
        expect(screen.getByText(/pointer l'arrivée/i)).toBeInTheDocument();
      });

      // Tenter de pointer
      const clockInButton = screen.getByText(/pointer l'arrivée/i);
      await user.click(clockInButton);

      // Vérifier l'affichage de l'erreur
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });

      // Le bouton devrait toujours être disponible pour retry
      expect(screen.getByText(/pointer l'arrivée/i)).toBeInTheDocument();
    });
  });

  describe('Mobile Presence Workflow', () => {
    it('should handle mobile-specific features', async () => {
      const mockPresence = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(),
        status: 'present'
      };

      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockPresence);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      (presenceIntegrationApi.clockIn as Mock)
        .mockResolvedValueOnce(mockPresence);

      render(
        <TestWrapper>
          <MobilePresenceTracker />
        </TestWrapper>
      );

      // Vérifier l'affichage mobile
      await waitFor(() => {
        expect(screen.getByText(/pointer l'arrivée/i)).toBeInTheDocument();
      });

      // Vérifier l'affichage de l'heure
      expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();

      // Vérifier l'affichage de la géolocalisation
      expect(screen.getByText(/position:/i)).toBeInTheDocument();

      // Clock in avec confirmation
      const clockInButton = screen.getByText(/pointer l'arrivée/i);
      await user.click(clockInButton);

      // Vérifier l'ouverture du dialog de confirmation
      await waitFor(() => {
        expect(screen.getByText(/confirmer l'arrivée/i)).toBeInTheDocument();
      });

      // Confirmer
      const confirmButton = screen.getByText(/confirmer/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(presenceIntegrationApi.clockIn).toHaveBeenCalled();
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time presence updates', async () => {
      let realTimeCallback: (update: any) => void;

      (presenceIntegrationApi.connectRealTime as Mock)
        .mockImplementationOnce((employeeId, callback) => {
          realTimeCallback = callback;
        });

      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      render(
        <TestWrapper>
          <PresenceTracker />
        </TestWrapper>
      );

      // Attendre la connexion temps réel
      await waitFor(() => {
        expect(presenceIntegrationApi.connectRealTime).toHaveBeenCalled();
      });

      // Simuler une mise à jour temps réel
      const realTimeUpdate = {
        type: 'presence_update',
        data: {
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'present'
        },
        timestamp: Date.now(),
        employeeId: 'emp-1'
      };

      act(() => {
        realTimeCallback!(realTimeUpdate);
      });

      // Vérifier que l'interface se met à jour
      await waitFor(() => {
        expect(screen.getByText(/commencer une pause/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline mode gracefully', async () => {
      // Simuler le mode hors ligne
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      render(
        <TestWrapper>
          <MobilePresenceTracker />
        </TestWrapper>
      );

      // Vérifier l'affichage du mode hors ligne
      await waitFor(() => {
        expect(screen.getByText(/hors ligne/i)).toBeInTheDocument();
      });

      // Tenter de pointer en mode hors ligne
      const clockInButton = screen.getByText(/pointer l'arrivée/i);
      await user.click(clockInButton);

      // Vérifier que l'action est mise en queue
      await waitFor(() => {
        expect(screen.getByText(/données seront synchronisées/i)).toBeInTheDocument();
      });
    });

    it('should sync when coming back online', async () => {
      // Commencer hors ligne
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      const { rerender } = render(
        <TestWrapper>
          <MobilePresenceTracker />
        </TestWrapper>
      );

      // Simuler le retour en ligne
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Déclencher l'événement online
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      rerender(
        <TestWrapper>
          <MobilePresenceTracker />
        </TestWrapper>
      );

      // Vérifier que le statut en ligne est affiché
      await waitFor(() => {
        expect(screen.getByText(/en ligne/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from temporary API failures', async () => {
      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      // Premier appel échoue, deuxième réussit
      (presenceIntegrationApi.clockIn as Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'present'
        });

      render(
        <TestWrapper>
          <PresenceTracker />
        </TestWrapper>
      );

      // Premier essai
      const clockInButton = screen.getByText(/pointer l'arrivée/i);
      await user.click(clockInButton);

      // Vérifier l'erreur
      await waitFor(() => {
        expect(screen.getByText(/temporary failure/i)).toBeInTheDocument();
      });

      // Retry
      await user.click(clockInButton);

      // Vérifier le succès
      await waitFor(() => {
        expect(screen.getByText(/commencer une pause/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states during operations', async () => {
      let resolveClockIn: (value: any) => void;
      const clockInPromise = new Promise(resolve => {
        resolveClockIn = resolve;
      });

      (presenceIntegrationApi.getCurrentPresence as Mock)
        .mockResolvedValueOnce(null);

      (presenceIntegrationApi.getPresenceHistory as Mock)
        .mockResolvedValue([]);

      (presenceIntegrationApi.clockIn as Mock)
        .mockReturnValueOnce(clockInPromise);

      render(
        <TestWrapper>
          <PresenceTracker />
        </TestWrapper>
      );

      // Déclencher l'opération
      const clockInButton = screen.getByText(/pointer l'arrivée/i);
      await user.click(clockInButton);

      // Vérifier l'état de chargement
      expect(screen.getByText(/chargement/i) || screen.getByRole('button', { disabled: true }))
        .toBeInTheDocument();

      // Résoudre la promesse
      act(() => {
        resolveClockIn!({
          id: 'presence-1',
          employeeId: 'emp-1',
          clockInTime: new Date(),
          status: 'present'
        });
      });

      // Vérifier que le chargement disparaît
      await waitFor(() => {
        expect(screen.getByText(/commencer une pause/i)).toBeInTheDocument();
      });
    });
  });
});