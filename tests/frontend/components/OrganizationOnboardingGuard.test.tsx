import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OrganizationOnboardingGuard } from '../../../frontend/src/components/organization/OrganizationOnboardingGuard';
import { useAuth } from '../../../frontend/src/hooks/use-auth';

// Mock the auth hook
jest.mock('../../../frontend/src/hooks/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the OrganizationOnboardingFlow component
jest.mock('../../../frontend/src/components/organization/OrganizationOnboardingFlow', () => ({
  OrganizationOnboardingFlow: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="onboarding-flow">
      <button onClick={onComplete}>Complete Onboarding</button>
    </div>
  )
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' })
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('OrganizationOnboardingGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when user does not need organization', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsOrganization: false,
      organizationSetupRequired: false,
      organizationInvitations: [],
      user: { id: 'user123', name: 'Test User' }
    } as any);

    renderWithRouter(
      <OrganizationOnboardingGuard>
        <div data-testid="protected-content">Protected Content</div>
      </OrganizationOnboardingGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should show alert when user needs organization', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsOrganization: true,
      organizationSetupRequired: false,
      organizationInvitations: [],
      user: { id: 'user123', name: 'Test User' }
    } as any);

    renderWithRouter(
      <OrganizationOnboardingGuard>
        <div data-testid="protected-content">Protected Content</div>
      </OrganizationOnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText(/Configurez votre organisation/)).toBeDefined();
    });

    expect(screen.getByTestId('protected-content')).toBeDefined();
    expect(screen.getByText('Configurer')).toBeDefined();
    expect(screen.getByText('Plus tard')).toBeDefined();
  });

  it('should show alert with invitation info when user has invitations', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsOrganization: true,
      organizationSetupRequired: false,
      organizationInvitations: [
        {
          id: 'inv1',
          organizationName: 'Test Org',
          role: 'member',
          invitedBy: 'Admin',
          expiresAt: new Date()
        }
      ],
      user: { id: 'user123', name: 'Test User' }
    } as any);

    renderWithRouter(
      <OrganizationOnboardingGuard>
        <div data-testid="protected-content">Protected Content</div>
      </OrganizationOnboardingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText(/Vous avez 1 invitation/)).toBeDefined();
    });
  });

  it('should show onboarding flow when setup is required', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsOrganization: true,
      organizationSetupRequired: true,
      organizationInvitations: [],
      user: { id: 'user123', name: 'Test User' }
    } as any);

    renderWithRouter(
      <OrganizationOnboardingGuard>
        <div data-testid="protected-content">Protected Content</div>
      </OrganizationOnboardingGuard>
    );

    // Should show alert initially
    await waitFor(() => {
      expect(screen.getByText(/Configuration d'organisation requise/)).toBeDefined();
    });

    // After 3 seconds, should show onboarding flow
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-flow')).toBeDefined();
    }, { timeout: 4000 });

    expect(screen.queryByTestId('protected-content')).toBeNull();
  });

  it('should not show anything when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      needsOrganization: false,
      organizationSetupRequired: false,
      organizationInvitations: [],
      user: null
    } as any);

    renderWithRouter(
      <OrganizationOnboardingGuard>
        <div data-testid="protected-content">Protected Content</div>
      </OrganizationOnboardingGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should not show alert on onboarding page', () => {
    // Mock location to be on onboarding page
    jest.mocked(require('react-router-dom').useLocation).mockReturnValue({
      pathname: '/organization/onboarding'
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      needsOrganization: true,
      organizationSetupRequired: false,
      organizationInvitations: [],
      user: { id: 'user123', name: 'Test User' }
    } as any);

    renderWithRouter(
      <OrganizationOnboardingGuard>
        <div data-testid="protected-content">Protected Content</div>
      </OrganizationOnboardingGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});