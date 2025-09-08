import React, { useState, useCallback } from 'react';
import { type User, type Organization, OrganizationSector } from '../../shared';
import { OrganizationCreationForm } from './OrganizationCreationForm';
import { SectorTemplateSelector } from './SectorTemplateSelector';
import { organizationService } from '../../services/organizationService';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';

interface OrganizationOnboardingFlowProps {
  user: User;
  onComplete: (organization: Organization) => void;
  onSkip?: () => void;
}

interface OrganizationFormData {
  name: string;
  description?: string;
  sector: OrganizationSector;
  contactInfo: {
    email?: string; // Reste optionnel car on utilisera l'email de l'utilisateur comme fallback
    phone?: string;
    website?: string;
  };
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

export const OrganizationOnboardingFlow: React.FC<OrganizationOnboardingFlowProps> = ({
  user,
  onComplete,
  onSkip
}) => {
  // Protection contre user undefined
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Chargement...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Préparation de votre espace de travail.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const [currentStep, setCurrentStep] = useState<'form' | 'template' | 'creating'>('form');
  const [formData, setFormData] = useState<OrganizationFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = useCallback(async (data: OrganizationFormData) => {
    setFormData(data);
    setCurrentStep('template');
  }, []);

  const handleTemplateSelect = useCallback(async (template: any) => {
    if (!formData) return;

    // Validation des données requises
    if (!formData.contactInfo.email && !user?.email) {
      setError('Une adresse email est requise pour créer l\'organisation');
      return;
    }

    setCurrentStep('creating');
    setLoading(true);
    setError(null);

    try {
      // Validation et transformation des données pour correspondre à CreateOrganizationRequest
      const organizationData = {
        name: formData.name,
        displayName: formData.name, // ou un autre champ si disponible
        description: formData.description,
        sector: formData.sector,
        contactInfo: {
          email: formData.contactInfo.email || user?.email || '', // Utiliser l'email de l'utilisateur comme fallback
          phone: formData.contactInfo.phone,
          website: formData.contactInfo.website
        },
        address: formData.address,
        settings: template.settings || {
          features: {
            appointments: true,
            attendance: true,
            sales: false,
            clients: true,
            products: false,
            events: true
          },
          branding: {
            primaryColor: '#3B82F6',
            secondaryColor: '#EF4444'
          },
          notifications: {
            emailEnabled: true,
            smsEnabled: false
          },
          security: {
            twoFactorRequired: false,
            passwordPolicy: {
              minLength: 8,
              requireSpecialChars: false,
              requireNumbers: true
            }
          }
        }
      };

      const organization = await organizationService.createOrganization(organizationData);

      toast.success('Organisation créée avec succès !');
      onComplete(organization);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de l\'organisation';
      setError(errorMessage);
      toast.error(errorMessage);
      setCurrentStep('form');
    } finally {
      setLoading(false);
    }
  }, [formData, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep === 'template') {
      setCurrentStep('form');
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  if (currentStep === 'creating') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Création de votre organisation...
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Veuillez patienter pendant que nous configurons votre espace de travail.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Bienvenue, {user?.firstName || user?.email || 'Utilisateur'} !
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Créons votre organisation pour commencer
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'form' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <div className={`flex-1 h-1 mx-2 ${currentStep === 'template' ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                <span className="text-sm font-medium">2</span>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">Informations</span>
              <span className="text-xs text-gray-500">Configuration</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'form' && (
            <OrganizationCreationForm
              onSubmit={handleFormSubmit}
              loading={loading}
            />
          )}

          {currentStep === 'template' && formData && (
            <SectorTemplateSelector
              sector={formData.sector}
              onTemplateSelect={handleTemplateSelect}
              onBack={handleBack}
            />
          )}

          {/* Skip option */}
          {onSkip && currentStep === 'form' && (
            <div className="mt-6 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSkip}
              >
                Ignorer pour le moment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};