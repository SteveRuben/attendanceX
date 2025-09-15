// Composant d'onboarding pour nouveaux tenants
import React, { useState } from 'react';
import { useMultiTenantAuth } from '../../contexts/MultiTenantAuthContext';
import { useNavigate } from 'react-router-dom';

interface TenantOnboardingProps {
  onComplete?: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

export const TenantOnboarding: React.FC<TenantOnboardingProps> = ({ onComplete }) => {
  const { createTenant, isLoading } = useMultiTenantAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [tenantData, setTenantData] = useState({
    name: '',
    slug: '',
    planId: 'basic',
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'en',
      currency: 'USD'
    },
    branding: {
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280'
    }
  });

  const steps: OnboardingStep[] = [
    {
      id: 'basic-info',
      title: 'Organization Information',
      description: 'Tell us about your organization',
      component: BasicInfoStep
    },
    {
      id: 'plan-selection',
      title: 'Choose Your Plan',
      description: 'Select the plan that fits your needs',
      component: PlanSelectionStep
    },
    {
      id: 'customization',
      title: 'Customize Your Workspace',
      description: 'Make it yours with branding and preferences',
      component: CustomizationStep
    },
    {
      id: 'confirmation',
      title: 'Review & Create',
      description: 'Review your settings and create your organization',
      component: ConfirmationStep
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const tenant = await createTenant(tenantData);
      onComplete?.();
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create tenant:', error);
      // TODO: Afficher une notification d'erreur
    }
  };

  const updateTenantData = (updates: Partial<typeof tenantData>) => {
    setTenantData(prev => ({ ...prev, ...updates }));
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome to Attendance Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's set up your organization in just a few steps
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    index <= currentStep
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 ml-2 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-gray-900">
              {steps[currentStep].title}
            </h3>
            <p className="text-sm text-gray-600">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Contenu de l'étape */}
        <div className="bg-white shadow rounded-lg p-6">
          <CurrentStepComponent
            tenantData={tenantData}
            updateTenantData={updateTenantData}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onComplete={handleComplete}
            isLoading={isLoading}
            isFirstStep={currentStep === 0}
            isLastStep={currentStep === steps.length - 1}
          />
        </div>
      </div>
    </div>
  );
};

// Étape 1: Informations de base
const BasicInfoStep: React.FC<any> = ({ tenantData, updateTenantData, onNext, isLoading }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!tenantData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }
    
    if (!tenantData.slug.trim()) {
      newErrors.slug = 'Organization slug is required';
    } else if (!/^[a-z0-9-]+$/.test(tenantData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    updateTenantData({ name });
    if (!tenantData.slug || tenantData.slug === generateSlug(tenantData.name)) {
      updateTenantData({ slug: generateSlug(name) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Organization Name
        </label>
        <input
          type="text"
          id="name"
          value={tenantData.name}
          onChange={(e) => handleNameChange(e.target.value)}
          className={`mt-1 block w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your organization name"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Organization URL
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
            yourapp.com/
          </span>
          <input
            type="text"
            id="slug"
            value={tenantData.slug}
            onChange={(e) => updateTenantData({ slug: e.target.value })}
            className={`flex-1 block w-full rounded-none rounded-r-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.slug ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="organization-name"
          />
        </div>
        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
        <p className="mt-1 text-sm text-gray-500">
          This will be your organization's unique URL identifier
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </form>
  );
};

// Étape 2: Sélection du plan
const PlanSelectionStep: React.FC<any> = ({ tenantData, updateTenantData, onNext, onPrevious, isLoading }) => {
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Free',
      description: 'Perfect for small teams getting started',
      features: ['Up to 10 users', 'Basic reporting', 'Email support', 'Core features']
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$29/month',
      description: 'For growing teams that need more features',
      features: ['Up to 100 users', 'Advanced reporting', 'Priority support', 'Integrations', 'Custom branding']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Contact us',
      description: 'For large organizations with custom needs',
      features: ['Unlimited users', 'Advanced analytics', 'Dedicated support', 'API access', 'Custom features']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-lg border p-4 cursor-pointer focus:outline-none ${
              tenantData.planId === plan.id
                ? 'border-blue-500 ring-2 ring-blue-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => updateTenantData({ planId: plan.id })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{plan.name}</div>
                  <div className="text-gray-500">{plan.price}</div>
                </div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border ${
                  tenantData.planId === plan.id
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {tenantData.planId === plan.id && (
                  <div className="h-2 w-2 rounded-full bg-white mx-auto mt-1"></div>
                )}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500">{plan.description}</div>
            <ul className="mt-3 text-xs text-gray-500 space-y-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="h-3 w-3 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Étape 3: Personnalisation
const CustomizationStep: React.FC<any> = ({ tenantData, updateTenantData, onNext, onPrevious, isLoading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customize Your Workspace</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Color</label>
            <div className="mt-1 flex items-center space-x-3">
              <input
                type="color"
                value={tenantData.branding.primaryColor}
                onChange={(e) => updateTenantData({
                  branding: { ...tenantData.branding, primaryColor: e.target.value }
                })}
                className="h-10 w-20 rounded border border-gray-300"
              />
              <span className="text-sm text-gray-500">{tenantData.branding.primaryColor}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Timezone</label>
            <select
              value={tenantData.settings.timezone}
              onChange={(e) => updateTenantData({
                settings: { ...tenantData.settings, timezone: e.target.value }
              })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <select
              value={tenantData.settings.currency}
              onChange={(e) => updateTenantData({
                settings: { ...tenantData.settings, currency: e.target.value }
              })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="JPY">JPY - Japanese Yen</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Étape 4: Confirmation
const ConfirmationStep: React.FC<any> = ({ tenantData, onPrevious, onComplete, isLoading }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Organization</h3>
        
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Organization Name:</span>
            <span>{tenantData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">URL:</span>
            <span>yourapp.com/{tenantData.slug}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Plan:</span>
            <span className="capitalize">{tenantData.planId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Timezone:</span>
            <span>{tenantData.settings.timezone}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Currency:</span>
            <span>{tenantData.settings.currency}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isLoading}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={isLoading}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </div>
          ) : (
            'Create Organization'
          )}
        </button>
      </div>
    </div>
  );
};