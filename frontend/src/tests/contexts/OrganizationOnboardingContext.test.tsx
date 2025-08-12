import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  OrganizationOnboardingProvider, 
  useOrganizationOnboarding 
} from '../../contexts/OrganizationOnboardingContext';

// Test component to use the context
const TestComponent = () => {
  const {
    needsOrganization,
    organizationSetupRequired,
    showOnboarding,
    organizationInvitations,
    setOnboardingState,
    startOnboarding,
    completeOnboarding,
    skipOnboarding
  } = useOrganizationOnboarding();

  return (
    <div>
      <div data-testid="needs-organization">{needsOrganization.toString()}</div>
      <div data-testid="setup-required">{organizationSetupRequired.toString()}</div>
      <div data-testid="show-onboarding">{showOnboarding.toString()}</div>
      <div data-testid="invitations-count">{organizationInvitations.length}</div>
      
      <button 
        onClick={() => setOnboardingState({
          needsOrganization: true,
          organizationSetupRequired: true,
          organizationInvitations: [
            {
              id: 'inv1',
              organizationName: 'Test Org',
              role: 'member',
              invitedBy: 'Admin',
              expiresAt: new Date()
            }
          ]
        })}
        data-testid="set-onboarding-state"
      >
        Set Onboarding State
      </button>
      
      <button onClick={startOnboarding} data-testid="start-onboarding">
        Start Onboarding
      </button>
      
      <button onClick={completeOnboarding} data-testid="complete-onboarding">
        Complete Onboarding
      </button>
      
      <button onClick={skipOnboarding} data-testid="skip-onboarding">
        Skip Onboarding
      </button>
    </div>
  );
};

describe('OrganizationOnboardingContext', () => {
  const renderWithProvider = () => {
    return render(
      <OrganizationOnboardingProvider>
        <TestComponent />
      </OrganizationOnboardingProvider>
    );
  };

  it('should provide initial state', () => {
    renderWithProvider();

    expect(screen.getByTestId('needs-organization')).toHaveTextContent('false');
    expect(screen.getByTestId('setup-required')).toHaveTextContent('false');
    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('false');
    expect(screen.getByTestId('invitations-count')).toHaveTextContent('0');
  });

  it('should update state when setOnboardingState is called', () => {
    renderWithProvider();

    fireEvent.click(screen.getByTestId('set-onboarding-state'));

    expect(screen.getByTestId('needs-organization')).toHaveTextContent('true');
    expect(screen.getByTestId('setup-required')).toHaveTextContent('true');
    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('true');
    expect(screen.getByTestId('invitations-count')).toHaveTextContent('1');
  });

  it('should show onboarding when startOnboarding is called', () => {
    renderWithProvider();

    fireEvent.click(screen.getByTestId('start-onboarding'));

    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('true');
  });

  it('should reset state when completeOnboarding is called', () => {
    renderWithProvider();

    // First set some state
    fireEvent.click(screen.getByTestId('set-onboarding-state'));
    expect(screen.getByTestId('needs-organization')).toHaveTextContent('true');

    // Then complete onboarding
    fireEvent.click(screen.getByTestId('complete-onboarding'));

    expect(screen.getByTestId('needs-organization')).toHaveTextContent('false');
    expect(screen.getByTestId('setup-required')).toHaveTextContent('false');
    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('false');
    expect(screen.getByTestId('invitations-count')).toHaveTextContent('0');
  });

  it('should hide onboarding when skipOnboarding is called', () => {
    renderWithProvider();

    // First start onboarding
    fireEvent.click(screen.getByTestId('start-onboarding'));
    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('true');

    // Then skip it
    fireEvent.click(screen.getByTestId('skip-onboarding'));

    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('false');
    // needsOrganization should still be false since we didn't set it
    expect(screen.getByTestId('needs-organization')).toHaveTextContent('false');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useOrganizationOnboarding must be used within an OrganizationOnboardingProvider');

    consoleSpy.mockRestore();
  });

  it('should automatically show onboarding when needs organization', () => {
    const TestAutoShow = () => {
      const { setOnboardingState, showOnboarding } = useOrganizationOnboarding();

      React.useEffect(() => {
        setOnboardingState({
          needsOrganization: true,
          organizationSetupRequired: false
        });
      }, [setOnboardingState]);

      return <div data-testid="show-onboarding">{showOnboarding.toString()}</div>;
    };

    render(
      <OrganizationOnboardingProvider>
        <TestAutoShow />
      </OrganizationOnboardingProvider>
    );

    expect(screen.getByTestId('show-onboarding')).toHaveTextContent('true');
  });
});