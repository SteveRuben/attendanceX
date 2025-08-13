import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface OrganizationOnboardingContextType {
  needsOrganization: boolean;
  organizationSetupRequired: boolean;
  showOnboarding: boolean;
  organizationInvitations: Array<{
    id: string;
    organizationName: string;
    role: string;
    invitedBy: string;
    expiresAt: Date;
  }>;
  setOnboardingState: (state: {
    needsOrganization: boolean;
    organizationSetupRequired?: boolean;
    organizationInvitations?: Array<{
      id: string;
      organizationName: string;
      role: string;
      invitedBy: string;
      expiresAt: Date;
    }>;
  }) => void;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
}

const OrganizationOnboardingContext = createContext<OrganizationOnboardingContextType | undefined>(undefined);

interface OrganizationOnboardingProviderProps {
  children: ReactNode;
}

export const OrganizationOnboardingProvider: React.FC<OrganizationOnboardingProviderProps> = ({ children }) => {
  const [needsOrganization, setNeedsOrganization] = useState(false);
  const [organizationSetupRequired, setOrganizationSetupRequired] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [organizationInvitations, setOrganizationInvitations] = useState<Array<{
    id: string;
    organizationName: string;
    role: string;
    invitedBy: string;
    expiresAt: Date;
  }>>([]);

  // Synchroniser avec les états d'authentification
  useEffect(() => {
    // Écouter les changements d'état d'authentification
    const handleAuthStateChange = (event: CustomEvent) => {
      const { needsOrganization: needsOrg, organizationSetupRequired: setupRequired, organizationInvitations: invitations } = event.detail;
      
      setNeedsOrganization(needsOrg || false);
      setOrganizationSetupRequired(setupRequired || false);
      setOrganizationInvitations(invitations || []);
      
      // Afficher l'onboarding si nécessaire
      if (needsOrg || setupRequired) {
        setShowOnboarding(true);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
    };
  }, []);

  const setOnboardingState = (state: {
    needsOrganization: boolean;
    organizationSetupRequired?: boolean;
    organizationInvitations?: Array<{
      id: string;
      organizationName: string;
      role: string;
      invitedBy: string;
      expiresAt: Date;
    }>;
  }) => {
    setNeedsOrganization(state.needsOrganization);
    setOrganizationSetupRequired(state.organizationSetupRequired || false);
    setOrganizationInvitations(state.organizationInvitations || []);
    
    // Afficher l'onboarding si nécessaire
    if (state.needsOrganization || state.organizationSetupRequired) {
      setShowOnboarding(true);
    }
  };

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    setNeedsOrganization(false);
    setOrganizationSetupRequired(false);
    setShowOnboarding(false);
    setOrganizationInvitations([]);
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
    // Note: on ne remet pas needsOrganization à false car l'utilisateur en aura toujours besoin
  };

  return (
    <OrganizationOnboardingContext.Provider
      value={{
        needsOrganization,
        organizationSetupRequired,
        showOnboarding,
        organizationInvitations,
        setOnboardingState,
        startOnboarding,
        completeOnboarding,
        skipOnboarding,
      }}
    >
      {children}
    </OrganizationOnboardingContext.Provider>
  );
};

export const useOrganizationOnboarding = (): OrganizationOnboardingContextType => {
  const context = useContext(OrganizationOnboardingContext);
  if (context === undefined) {
    throw new Error('useOrganizationOnboarding must be used within an OrganizationOnboardingProvider');
  }
  return context;
};