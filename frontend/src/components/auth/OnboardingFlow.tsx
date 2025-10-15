import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';

// Step components
import {
  OrganizationSetup,
  PlanSelection,
  AdminAccountSetup,
  OnboardingComplete
} from './steps';

export interface OnboardingData {
  // Organization info
  organizationName: string;
  organizationSlug: string;
  industry: string;
  size: string;

  // Plan selection
  planId: string;

  // Admin user info
  firstName: string;
  lastName: string;
  email: string;
  password: string;

  // Terms
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

const INITIAL_DATA: OnboardingData = {
  organizationName: '',
  organizationSlug: '',
  industry: '',
  size: '',
  planId: 'basic',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  acceptTerms: false,
  acceptPrivacy: false
};

export const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { createTenant, isLoading } = useMultiTenantAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (updates: Partial<OnboardingData>) => {
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
    try {
      const tenantData = {
        name: onboardingData.organizationName,
        slug: onboardingData.organizationSlug,
        industry: onboardingData.industry,
        size: onboardingData.size,
        planId: onboardingData.planId,
        adminUser: {
          email: onboardingData.email,
          firstName: onboardingData.firstName,
          lastName: onboardingData.lastName,
          password: onboardingData.password
        },
        settings: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: 'en-EN',
          currency: 'USD'
        }
      };

      await createTenant(tenantData);
      setCurrentStep(4); // Show completion step
    } catch (error: any) {
      setErrors({ general: error.message || 'Registration failed. Please try again.' });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <OrganizationSetup
            data={onboardingData}
            errors={errors}
            onUpdate={updateData}
            onNext={nextStep}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <PlanSelection
            data={onboardingData}
            onUpdate={updateData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <AdminAccountSetup
            data={onboardingData}
            errors={errors}
            onUpdate={updateData}
            onComplete={handleComplete}
            onPrev={prevStep}
            isLoading={isLoading}
          />
        );
      case 4:
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