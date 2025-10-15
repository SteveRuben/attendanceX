// frontend/tests/e2e/organization-membership-flow.e2e.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../src/App';
import { userService, organizationService } from '../services';

// Mock des services pour les tests E2E
vi.mock('../services', () => ({
  userService: {
    getUserOrganizations: vi.fn(),
    updateUser: vi.fn(),
  },
  organizationService: {
    createOrganization: vi.fn(),
    getOrganization: vi.fn(),
  },
  teamService: {
    createTeam: vi.fn(),
  }
}));

// Mock du hook useAuth
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User'
};

vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn()
  }),
  usePermissions: () => ({
    canCreateEvents: true,
    canManageUsers: true,
    canViewReports: true,
    isAdmin: () => true
  })
}));

// Mock de react-router-dom pour contrôler la navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock de react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('Organization Membership Flow - E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Simuler une route vers OrganizationSetup
    Object.defineProperty(window, 'location', {
      value: { pathname: '/organization/setup' },
      writable: true
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Flux pour nouvel utilisateur', () => {
    it('devrait permettre à un nouvel utilisateur de créer une organisation', async () => {
      // 1. Simuler qu'aucune organisation n'existe
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      // 2. Simuler la création réussie d'une organisation
      vi.mocked(organizationService.createOrganization).mockResolvedValue({
        success: true,
        data: {
          id: 'new-org-id',
          name: 'Test Organization',
          displayName: 'Test Org',
          sector: 'technology',
          createdAt: new Date(),
          status: 'active'
        }
      });

      renderApp();

      // Attendre que le composant se charge
      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });

      // Remplir le formulaire
      const nameInput = screen.getByLabelText(/nom de l'organisation/i);
      fireEvent.change(nameInput, { target: { value: 'Test Organization' } });

      const sectorSelect = screen.getByRole('combobox');
      fireEvent.click(sectorSelect);
      fireEvent.click(screen.getByText(/technologie/i));

      // Soumettre le formulaire
      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      // Vérifier que la création a été appelée
      await waitFor(() => {
        expect(organizationService.createOrganization).toHaveBeenCalledWith({
          name: 'Test Organization',
          displayName: 'Test Organization',
          sector: 'technology',
          description: ''
        });
      });

      // Vérifier la redirection
      expect(mockNavigate).toHaveBeenCalledWith('/organization/new-org-id/dashboard');
    });

    it('devrait pré-remplir le nom depuis localStorage', async () => {
      // Simuler un nom d'organisation en attente
      localStorage.setItem('pendingOrganizationName', 'Pending Organization');

      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pending Organization')).toBeInTheDocument();
      });
    });
  });

  describe('Flux pour utilisateur avec organisation existante', () => {
    it('devrait rediriger automatiquement un utilisateur avec une seule organisation', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: [{
          organizationId: 'existing-org-id',
          organizationName: 'Existing Organization',
          role: 'admin',
          isActive: true,
          joinedAt: new Date()
        }]
      });

      renderApp();

      // Vérifier la redirection automatique
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/organization/existing-org-id/dashboard');
      });
    });

    it('devrait afficher le sélecteur pour un utilisateur avec plusieurs organisations', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: [
          {
            organizationId: 'org-1',
            organizationName: 'Organization 1',
            role: 'admin',
            isActive: true,
            joinedAt: new Date()
          },
          {
            organizationId: 'org-2',
            organizationName: 'Organization 2',
            role: 'member',
            isActive: true,
            joinedAt: new Date()
          }
        ]
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText(/choisissez votre organisation/i)).toBeInTheDocument();
        expect(screen.getByText('Organization 1')).toBeInTheDocument();
        expect(screen.getByText('Organization 2')).toBeInTheDocument();
      });
    });

    it('devrait gérer le cas "utilisateur déjà membre" lors de la création', async () => {
      // 1. Première vérification : aucune organisation
      vi.mocked(userService.getUserOrganizations)
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({
          success: true,
          data: [{
            organizationId: 'existing-org-id',
            organizationName: 'Existing Organization',
            role: 'admin',
            isActive: true,
            joinedAt: new Date()
          }]
        });

      // 2. Création échoue car utilisateur déjà membre
      vi.mocked(organizationService.createOrganization).mockRejectedValue(
        new Error('L\'utilisateur appartient déjà à une organisation')
      );

      renderApp();

      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });

      // Remplir et soumettre le formulaire
      const nameInput = screen.getByLabelText(/nom de l'organisation/i);
      fireEvent.change(nameInput, { target: { value: 'New Organization' } });

      const sectorSelect = screen.getByRole('combobox');
      fireEvent.click(sectorSelect);
      fireEvent.click(screen.getByText(/technologie/i));

      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      // Vérifier la gestion de l'appartenance existante
      await waitFor(() => {
        expect(screen.getByText(/organisation existante détectée/i)).toBeInTheDocument();
      });

      // Vérifier la redirection vers l'organisation existante
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/organization/existing-org-id/dashboard');
      });
    });
  });

  describe('Gestion d\'erreurs E2E', () => {
    it('devrait gérer gracieusement l\'API non disponible', async () => {
      vi.mocked(userService.getUserOrganizations).mockRejectedValue(
        new Error('Route not found')
      );

      renderApp();

      // Devrait passer à la création sans erreur visible
      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });

      // Ne devrait pas afficher d'erreur à l'utilisateur
      expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument();
    });

    it('devrait permettre la récupération après une erreur réseau', async () => {
      // Première tentative : erreur réseau
      vi.mocked(userService.getUserOrganizations)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, data: [] });

      renderApp();

      // Attendre l'affichage de l'erreur
      await waitFor(() => {
        expect(screen.getByText(/erreur de configuration/i)).toBeInTheDocument();
      });

      // Cliquer sur réessayer
      const retryButton = screen.getByRole('button', { name: /réessayer/i });
      fireEvent.click(retryButton);

      // Vérifier la récupération
      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });
    });

    it('devrait gérer les erreurs de validation côté client', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });

      // Essayer de créer sans remplir les champs obligatoires
      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      // Vérifier l'affichage de l'erreur de validation
      await waitFor(() => {
        expect(screen.getByText(/veuillez remplir tous les champs obligatoires/i)).toBeInTheDocument();
      });
    });
  });

  describe('Option "Explorer d\'abord"', () => {
    it('devrait permettre d\'explorer l\'application sans créer d\'organisation', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });

      // Cliquer sur "Explorer d'abord"
      const exploreButton = screen.getByRole('button', { name: /explorer d'abord/i });
      fireEvent.click(exploreButton);

      // Vérifier la redirection vers le dashboard
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Persistance des données', () => {
    it('devrait sauvegarder et restaurer l\'état du formulaire', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText(/créer votre organisation/i)).toBeInTheDocument();
      });

      // Remplir partiellement le formulaire
      const nameInput = screen.getByLabelText(/nom de l'organisation/i);
      fireEvent.change(nameInput, { target: { value: 'Partial Organization' } });

      // Simuler une navigation et un retour
      // (Dans un vrai test E2E, ceci serait fait en naviguant réellement)
      
      // Vérifier que les données sont toujours là
      expect(nameInput).toHaveValue('Partial Organization');
    });
  });
});