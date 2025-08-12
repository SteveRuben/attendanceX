import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { OrganizationOnboardingFlow } from './OrganizationOnboardingFlow';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Building2, Users, Clock, X } from 'lucide-react';

interface OrganizationOnboardingGuardProps {
  children: React.ReactNode;
}

export const OrganizationOnboardingGuard: React.FC<OrganizationOnboardingGuardProps> = ({ children }) => {
  const { 
    isAuthenticated, 
    needsOrganization, 
    organizationSetupRequired, 
    organizationInvitations,
    user 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    // Ne rien faire si l'utilisateur n'est pas authentifié
    if (!isAuthenticated || !user) {
      return;
    }

    // Vérifier si l'utilisateur a besoin d'une organisation
    const needsSetup = needsOrganization || organizationSetupRequired;
    
    if (needsSetup) {
      // Si on est déjà sur la page d'onboarding, ne pas rediriger
      if (location.pathname === '/organization/onboarding') {
        return;
      }

      // Afficher l'alerte si elle n'a pas été fermée
      if (!alertDismissed) {
        setShowAlert(true);
      }

      // Si c'est obligatoire, rediriger automatiquement après un délai
      if (organizationSetupRequired) {
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 3000); // 3 secondes pour laisser le temps à l'utilisateur de voir l'alerte

        return () => clearTimeout(timer);
      }
    } else {
      // Réinitialiser les états si l'utilisateur n'a plus besoin d'organisation
      setShowAlert(false);
      setShowOnboarding(false);
      setAlertDismissed(false);
    }
  }, [isAuthenticated, needsOrganization, organizationSetupRequired, location.pathname, alertDismissed, user]);

  const handleStartOnboarding = () => {
    setShowAlert(false);
    setShowOnboarding(true);
  };

  const handleSkipOnboarding = () => {
    setShowAlert(false);
    setAlertDismissed(true);
    // Note: on ne peut pas vraiment "skip" si c'est obligatoire
    if (!organizationSetupRequired) {
      // Rediriger vers le dashboard ou une page appropriée
      navigate('/dashboard');
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowAlert(false);
    setAlertDismissed(false);
    // Rediriger vers le dashboard après completion
    navigate('/dashboard');
  };

  const handleDismissAlert = () => {
    setShowAlert(false);
    setAlertDismissed(true);
  };

  // Si l'onboarding est en cours, afficher le composant d'onboarding
  if (showOnboarding && isAuthenticated) {
    return (
      <OrganizationOnboardingFlow 
        onComplete={handleOnboardingComplete}
        organizationInvitations={organizationInvitations}
      />
    );
  }

  // Afficher l'alerte si nécessaire
  const shouldShowAlert = showAlert && isAuthenticated && (needsOrganization || organizationSetupRequired);

  return (
    <>
      {shouldShowAlert && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert className="border-orange-200 bg-orange-50">
            <Building2 className="h-4 w-4 text-orange-600" />
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <AlertDescription className="text-orange-800">
                  <div className="font-medium mb-2">
                    {organizationSetupRequired 
                      ? "Configuration d'organisation requise" 
                      : "Configurez votre organisation"}
                  </div>
                  <div className="text-sm mb-3">
                    {organizationInvitations.length > 0 
                      ? `Vous avez ${organizationInvitations.length} invitation(s) en attente ou vous pouvez créer votre propre organisation.`
                      : "Pour accéder à toutes les fonctionnalités, vous devez configurer votre organisation."}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleStartOnboarding}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Building2 className="h-3 w-3 mr-1" />
                      Configurer
                    </Button>
                    {!organizationSetupRequired && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleSkipOnboarding}
                        className="text-orange-700 border-orange-300"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Plus tard
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissAlert}
                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Alert>
        </div>
      )}
      {children}
    </>
  );
};