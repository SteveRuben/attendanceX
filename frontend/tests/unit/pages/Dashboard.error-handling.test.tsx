// frontend/tests/unit/pages/Dashboard.error-handling.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from '../../../src/pages/Dashboard/Dashboard';
import { eventService, attendanceService, userService, notificationService } from '@/services';

// Mock des services
vi.mock('@/services', () => ({
  eventService: {
    getEventStats: vi.fn(),
    getUpcomingEvents: vi.fn(),
  },
  attendanceService: {
    getAttendanceStats: vi.fn(),
    getMyAttendances: vi.fn(),
  },
  userService: {
    getUserStats: vi.fn(),
  },
  notificationService: {
    getMyNotifications: vi.fn(),
  }
}));

// Mock du hook useAuth
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { 
      uid: 'test-user-id', 
      email: 'test@example.com',
      organizationId: 'test-org-id'
    }
  }),
  usePermissions: () => ({
    canCreateEvents: true,
    canManageUsers: true,
    canViewReports: true,
    isAdmin: () => true
  })
}));

// Mock de react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard - Gestion d\'erreurs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Erreurs de chargement des données', () => {
    it('devrait afficher le fallback en cas d\'erreur de service', async () => {
      // Simuler des erreurs pour tous les services
      vi.mocked(eventService.getEventStats).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(eventService.getUpcomingEvents).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(attendanceService.getAttendanceStats).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(userService.getUserStats).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(attendanceService.getMyAttendances).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(notificationService.getMyNotifications).mockRejectedValue(new Error('Service indisponible'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/mode dégradé/i)).toBeInTheDocument();
      });

      // Vérifier que les éléments du fallback sont présents
      expect(screen.getByText(/fonctionnalités limitées/i)).toBeInTheDocument();
      expect(screen.getByText(/données non disponibles/i)).toBeInTheDocument();
    });

    it('devrait afficher le fallback pour les services non implémentés (404)', async () => {
      // Simuler des erreurs 404
      const error404 = new Error('Route not found');
      vi.mocked(eventService.getEventStats).mockRejectedValue(error404);
      vi.mocked(eventService.getUpcomingEvents).mockRejectedValue(error404);
      vi.mocked(attendanceService.getAttendanceStats).mockRejectedValue(error404);
      vi.mocked(userService.getUserStats).mockRejectedValue(error404);
      vi.mocked(attendanceService.getMyAttendances).mockRejectedValue(error404);
      vi.mocked(notificationService.getMyNotifications).mockRejectedValue(error404);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/services en développement/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/en développement/i)).toBeInTheDocument();
    });

    it('devrait permettre de réessayer après une erreur', async () => {
      // Première tentative : erreur
      vi.mocked(eventService.getEventStats).mockRejectedValueOnce(new Error('Erreur temporaire'));
      vi.mocked(eventService.getUpcomingEvents).mockRejectedValueOnce(new Error('Erreur temporaire'));
      vi.mocked(attendanceService.getAttendanceStats).mockRejectedValueOnce(new Error('Erreur temporaire'));
      vi.mocked(userService.getUserStats).mockRejectedValueOnce(new Error('Erreur temporaire'));
      vi.mocked(attendanceService.getMyAttendances).mockRejectedValueOnce(new Error('Erreur temporaire'));
      vi.mocked(notificationService.getMyNotifications).mockRejectedValueOnce(new Error('Erreur temporaire'));

      // Deuxième tentative : succès
      vi.mocked(eventService.getEventStats).mockResolvedValue({ data: { total: 5, upcoming: 2 } });
      vi.mocked(eventService.getUpcomingEvents).mockResolvedValue({ data: [] });
      vi.mocked(attendanceService.getAttendanceStats).mockResolvedValue({ data: { attendanceRate: 85, total: 100 } });
      vi.mocked(userService.getUserStats).mockResolvedValue({ data: { total: 10, active: 8 } });
      vi.mocked(attendanceService.getMyAttendances).mockResolvedValue({ data: [] });
      vi.mocked(notificationService.getMyNotifications).mockResolvedValue({ data: null });

      renderDashboard();

      // Attendre l'affichage de l'erreur
      await waitFor(() => {
        expect(screen.getByText(/mode dégradé/i)).toBeInTheDocument();
      });

      // Cliquer sur réessayer
      const retryButton = screen.getByRole('button', { name: /réessayer/i });
      fireEvent.click(retryButton);

      // Attendre le chargement réussi
      await waitFor(() => {
        expect(screen.getByText(/tableau de bord/i)).toBeInTheDocument();
        expect(screen.queryByText(/mode dégradé/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Gestion des erreurs partielles', () => {
    it('devrait gérer le cas où seuls certains services échouent', async () => {
      // Certains services réussissent, d'autres échouent
      vi.mocked(eventService.getEventStats).mockResolvedValue({ data: { total: 5, upcoming: 2 } });
      vi.mocked(eventService.getUpcomingEvents).mockResolvedValue({ data: [] });
      vi.mocked(attendanceService.getAttendanceStats).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(userService.getUserStats).mockResolvedValue({ data: { total: 10, active: 8 } });
      vi.mocked(attendanceService.getMyAttendances).mockRejectedValue(new Error('Service indisponible'));
      vi.mocked(notificationService.getMyNotifications).mockResolvedValue({ data: null });

      renderDashboard();

      await waitFor(() => {
        // Le dashboard devrait se charger avec les données disponibles
        expect(screen.getByText(/tableau de bord/i)).toBeInTheDocument();
      });

      // Les stats disponibles devraient être affichées
      expect(screen.getByText('5')).toBeInTheDocument(); // Total events
      expect(screen.getByText('10')).toBeInTheDocument(); // Total users
    });
  });

  describe('États de chargement', () => {
    it('devrait afficher un indicateur de chargement initial', () => {
      // Mock des services qui ne se résolvent pas immédiatement
      vi.mocked(eventService.getEventStats).mockImplementation(() => new Promise(() => {}));
      vi.mocked(eventService.getUpcomingEvents).mockImplementation(() => new Promise(() => {}));
      vi.mocked(attendanceService.getAttendanceStats).mockImplementation(() => new Promise(() => {}));
      vi.mocked(userService.getUserStats).mockImplementation(() => new Promise(() => {}));
      vi.mocked(attendanceService.getMyAttendances).mockImplementation(() => new Promise(() => {}));
      vi.mocked(notificationService.getMyNotifications).mockImplementation(() => new Promise(() => {}));

      renderDashboard();

      // Vérifier la présence d'indicateurs de chargement
      expect(screen.getByTestId('loading-skeleton') || screen.getByText(/chargement/i)).toBeInTheDocument();
    });
  });

  describe('Utilisateur sans organisation', () => {
    it('devrait afficher le fallback approprié pour un utilisateur sans organisation', async () => {
      // Mock useAuth pour retourner un utilisateur sans organisation
      vi.doMock('@/hooks/use-auth', () => ({
        useAuth: () => ({
          user: { 
            uid: 'test-user-id', 
            email: 'test@example.com',
            organizationId: null // Pas d'organisation
          }
        }),
        usePermissions: () => ({
          canCreateEvents: false,
          canManageUsers: false,
          canViewReports: false,
          isAdmin: () => false
        })
      }));

      // Simuler une erreur de service
      vi.mocked(eventService.getEventStats).mockRejectedValue(new Error('Service indisponible'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/mode dégradé/i)).toBeInTheDocument();
      });

      // Vérifier que les actions pour utilisateur sans organisation sont présentes
      expect(screen.getByText(/configurer l'organisation/i)).toBeInTheDocument();
    });
  });

  describe('Gestion des timeouts', () => {
    it('devrait gérer les timeouts de service', async () => {
      // Simuler un timeout
      const timeoutError = new Error('Request timeout');
      vi.mocked(eventService.getEventStats).mockRejectedValue(timeoutError);
      vi.mocked(eventService.getUpcomingEvents).mockRejectedValue(timeoutError);
      vi.mocked(attendanceService.getAttendanceStats).mockRejectedValue(timeoutError);
      vi.mocked(userService.getUserStats).mockRejectedValue(timeoutError);
      vi.mocked(attendanceService.getMyAttendances).mockRejectedValue(timeoutError);
      vi.mocked(notificationService.getMyNotifications).mockRejectedValue(timeoutError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/mode dégradé/i)).toBeInTheDocument();
      });

      // Vérifier que l'erreur de timeout est gérée gracieusement
      expect(screen.getByText(/problème de connexion/i)).toBeInTheDocument();
    });
  });
});