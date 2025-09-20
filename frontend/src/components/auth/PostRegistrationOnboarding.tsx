// Composant d'onboarding post-inscription
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';
import { OrganizationSetup } from './steps/OrganizationSetup';
import { PlanSelection } from './steps/PlanSelection';
import { OnboardingComplete } from './steps/OnboardingComplete';

export interface PostRegistrationOnboardingData {
  // Organization info
  organizationName: string;
  organizationSlug: string;
  industry: string;
  size: string;

  // Plan selection
  planId: string;

  // Terms (admin account info is already from registration)
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

const INITIAL_DATA: PostRegistrationOnboardingData = {
  organizationName: '',
  organizationSlug: '',
  industry: '',
  size: '',
  planId: 'basic',
  acceptTerms: false,
  acceptPrivacy: false
};

export const PostRegistrationOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { createTenant, isLoading, user } = useMultiTenantAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<PostRegistrationOnboardingData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (updates: Partial<PostRegistrationOnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    const updatedFields = Object.keys(updates);
    setErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleComplete = async () => {
    if (!user) {
      setErrors({ general: 'User not authenticated. Please login again.' });
      return;
    }

    try {
      const tenantData = {
        name: onboardingData.organizationName,
        slug: onboardingData.organizationSlug,
        industry: onboardingData.industry,
        size: onboardingData.size,
        planId: onboardingData.planId,
        settings: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: 'en',
          currency: 'USD'
        }
      };

      await createTenant(tenantData);
      setCurrentStep(3); // Show completion step
    } catch (error: any) {
      setErrors({ general: error.message || 'Organization creation failed. Please try again.' });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <OrganizationSetup
            data={{
              ...onboardingData,
              // Dummy values for compatibility with existing component
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
              email: user?.email || '',
              password: '',
            }}
            errors={errors}
            onUpdate={(updates) => {
              // Filter out user-related updates since user is already registered
              const { firstName, lastName, email, password, ...orgUpdates } = updates;
              updateData(orgUpdates as Partial<PostRegistrationOnboardingData>);
            }}
            onNext={nextStep}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <PlanSelection
            data={{
              ...onboardingData,
              // Dummy values for compatibility
              firstName: user?.firstName || '',
              lastName: user?.lastName || '',
              email: user?.email || '',
              password: '',
            }}
            onUpdate={(updates) => {
              const { firstName, lastName, email, password, ...orgUpdates } = updates;
              updateData(orgUpdates as Partial<PostRegistrationOnboardingData>);
            }}
            onNext={handleComplete} // Skip admin account setup, go directly to completion
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <OnboardingComplete
            organizationName={onboardingData.organizationName}
            onContinue={() => navigate('/dashboard')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderStep()}
    </div>
  );
};