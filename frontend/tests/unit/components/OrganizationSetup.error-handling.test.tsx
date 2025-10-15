// frontend/tests/unit/components/OrganizationSetup.error-handling.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import OrganizationSetup from '../../../src/components/organization/OrganizationSetup';
import { userService, organizationService } from '../services';

// Mock des services
vi.mock('../services', () => ({
  userService: {
    getUserOrganizations: vi.fn(),
  },
  organizationService: {
    createOrganization: vi.fn(),
  },
  teamService: {
    createTeam: vi.fn(),
  }
}));

// Mock du hook useAuth
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-id', email: 'test@example.com' }
  })
}));

// Mock du hook useToast
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock de react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderOrganizationSetup = (props = {}) => {
  const defaultProps = {
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    ...props
  };

  return render(
    <BrowserRouter>
      <OrganizationSetup {...defaultProps} />
    </BrowserRouter>
  );
};

describe('OrganizationSetup - Gestion d\'erreurs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Erreurs API getUserOrganizations', () => {
    it('devrait gérer l\'erreur 404 (API non implémentée) gracieusement', async () => {
      const error404 = new Error('Route not found');
      vi.mocked(userService.getUserOrganizations).mockRejectedValue(error404);

      renderOrganizationSetup();

      await waitFor(() => {
        // Devrait passer à l'étape de création sans afficher d'erreur
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });

      // Ne devrait pas afficher d'erreur à l'utilisateur
      expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument();
    });

    it('devrait gérer les erreurs réseau avec un fallback approprié', async () => {
      const networkError = new Error('Network error');
      vi.mocked(userService.getUserOrganizations).mockRejectedValue(networkError);

      renderOrganizationSetup();

      await waitFor(() => {
        // Devrait passer à l'étape de création
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });
    });

    it('devrait gérer les réponses vides correctement', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      renderOrganizationSetup();

      await waitFor(() => {
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });
    });
  });

  describe('Erreurs createOrganization', () => {
    beforeEach(() => {
      // Mock getUserOrganizations pour retourner aucune organisation
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });
    });

    it('devrait afficher une erreur de validation pour les champs manquants', async () => {
      renderOrganizationSetup();

      await waitFor(() => {
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });

      // Essayer de créer sans remplir les champs
      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/veuillez remplir tous les champs obligatoires/i)).toBeInTheDocument();
      });
    });

    it('devrait gérer l\'erreur "utilisateur déjà membre"', async () => {
      const membershipError = new Error('L\'utilisateur appartient déjà à une organisation');
      vi.mocked(organizationService.createOrganization).mockRejectedValue(membershipError);
      
      // Mock pour la récupération des organisations existantes
      vi.mocked(userService.getUserOrganizations).mockResolvedValueOnce({
        success: true,
        data: []
      }).mockResolvedValueOnce({
        success: true,
        data: [{
          organizationId: 'existing-org-id',
          organizationName: 'Organisation Existante',
          role: 'admin',
          isActive: true,
          joinedAt: new Date()
        }]
      });

      renderOrganizationSetup();

      await waitFor(() => {
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });

      // Remplir le formulaire
      const nameInput = screen.getByLabelText(/nom de l'organisation/i);
      const sectorSelect = screen.getByRole('combobox');
      
      fireEvent.change(nameInput, { target: { value: 'Test Org' } });
      fireEvent.click(sectorSelect);
      fireEvent.click(screen.getByText(/Éducation/i));

      // Créer l'organisation
      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/organisation existante détectée/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher une erreur générique pour les autres erreurs', async () => {
      const genericError = new Error('Erreur serveur interne');
      vi.mocked(organizationService.createOrganization).mockRejectedValue(genericError);

      renderOrganizationSetup();

      await waitFor(() => {
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });

      // Remplir le formulaire
      const nameInput = screen.getByLabelText(/nom de l'organisation/i);
      const sectorSelect = screen.getByRole('combobox');
      
      fireEvent.change(nameInput, { target: { value: 'Test Org' } });
      fireEvent.click(sectorSelect);
      fireEvent.click(screen.getByText(/Éducation/i));

      // Créer l'organisation
      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/erreur serveur interne/i)).toBeInTheDocument();
      });
    });
  });

  describe('Gestion des états de chargement', () => {
    it('devrait afficher un indicateur de chargement pendant la vérification des organisations', () => {
      // Mock une promesse qui ne se résout pas immédiatement
      vi.mocked(userService.getUserOrganizations).mockImplementation(
        () => new Promise(() => {}) // Promesse qui ne se résout jamais
      );

      renderOrganizationSetup();

      expect(screen.getByText(/vérification en cours/i)).toBeInTheDocument();
    });

    it('devrait afficher un indicateur de chargement pendant la création', async () => {
      vi.mocked(userService.getUserOrganizations).mockResolvedValue({
        success: true,
        data: []
      });

      // Mock une création qui prend du temps
      vi.mocked(organizationService.createOrganization).mockImplementation(
        () => new Promise(() => {}) // Promesse qui ne se résout jamais
      );

      renderOrganizationSetup();

      await waitFor(() => {
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });

      // Remplir et soumettre le formulaire
      const nameInput = screen.getByLabelText(/nom de l'organisation/i);
      const sectorSelect = screen.getByRole('combobox');
      
      fireEvent.change(nameInput, { target: { value: 'Test Org' } });
      fireEvent.click(sectorSelect);
      fireEvent.click(screen.getByText(/Éducation/i));

      const createButton = screen.getByRole('button', { name: /créer l'organisation/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/création en cours/i)).toBeInTheDocument();
      });
    });
  });

  describe('Récupération d\'erreurs', () => {
    it('devrait permettre de réessayer après une erreur', async () => {
      const error = new Error('Erreur temporaire');
      vi.mocked(userService.getUserOrganizations)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true, data: [] });

      renderOrganizationSetup();

      // Attendre que l'erreur soit affichée
      await waitFor(() => {
        expect(screen.getByText(/erreur de configuration/i)).toBeInTheDocument();
      });

      // Cliquer sur réessayer
      const retryButton = screen.getByRole('button', { name: /réessayer/i });
      fireEvent.click(retryButton);

      // Devrait maintenant afficher le formulaire de création
      await waitFor(() => {
        expect(screen.getByText(/Créer votre organisation/i)).toBeInTheDocument();
      });
    });
  });
});