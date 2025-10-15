/**
 * Composant de transition post-onboarding
 * Affiche un écran de chargement pendant la transition vers le dashboard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { postOnboardingRedirectService, type RedirectResult, OnboardingErrorType } from '../../services/onboarding/post-onboarding-redirect.service';
import { logger } from '../../utils/logger';

interface PostOnboardingTransitionProps {
  tenantId: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface TransitionStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description: string;
}

export const PostOnboardingTransition: React.FC<PostOnboardingTransitionProps> = ({
  tenantId,
  tokens,
  onSuccess,
  onError
}) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [timeoutReached, setTimeoutReached] = useState(false);

  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000; // 30 secondes

  const [steps, setSteps] = useState<TransitionStep[]>([
    {
      id: 'validate',
      label: 'Validating organization',
      status: 'pending',
      description: 'Verifying that your organization was created successfully...'
    },
    {
      id: 'sync',
      label: 'Synchronizing account',
      status: 'pending',
      description: 'Setting up your account with the new organization...'
    },
    {
      id: 'prepare',
      label: 'Preparing dashboard',
      status: 'pending',
      description: 'Loading your personalized workspace...'
    },
    {
      id: 'redirect',
      label: 'Finalizing setup',
      status: 'pending',
      description: 'Almost ready! Redirecting to your dashboard...'
    }
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!timeoutReached && currentStep < steps.length) {
        setTimeoutReached(true);
        setError('The setup is taking longer than expected. Please try again or contact support.');
      }
    }, TIMEOUT_MS);

    startTransition();

    return () => clearTimeout(timeout);
  }, [tenantId]);

  const updateStepStatus = (stepIndex: number, status: TransitionStep['status']) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
  };

  const startTransition = async () => {
    try {
      logger.onboarding('🚀 Starting post-onboarding transition', { tenantId });

      // Étape 1: Validation
      setCurrentStep(0);
      updateStepStatus(0, 'in-progress');
      setProgress(25);
      await delay(800); // Délai visuel pour l'UX

      // Étape 2: Synchronisation
      setCurrentStep(1);
      updateStepStatus(0, 'completed');
      updateStepStatus(1, 'in-progress');
      setProgress(50);
      await delay(1000);

      // Étape 3: Préparation
      setCurrentStep(2);
      updateStepStatus(1, 'completed');
      updateStepStatus(2, 'in-progress');
      setProgress(75);
      await delay(800);

      // Étape 4: Redirection
      setCurrentStep(3);
      updateStepStatus(2, 'completed');
      updateStepStatus(3, 'in-progress');
      setProgress(90);

      // Effectuer la redirection réelle
      const result = await postOnboardingRedirectService.handlePostOnboardingRedirect(
        tenantId,
        tokens
      );

      if (result.success) {
        updateStepStatus(3, 'completed');
        setProgress(100);
        
        logger.onboarding('✅ Transition completed successfully', { tenantId });
        
        // Délai avant redirection pour permettre à l'utilisateur de voir le succès
        await delay(1000);
        
        onSuccess?.();
        
        if (result.redirectUrl) {
          navigate(result.redirectUrl);
        } else {
          navigate('/dashboard');
        }
      } else {
        throw new Error(result.error || 'Redirection failed');
      }

    } catch (error) {
      logger.error('❌ Transition failed', { tenantId, error, retryCount });
      
      updateStepStatus(currentStep, 'error');
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) {
      setError('Maximum retry attempts reached. Please contact support for assistance.');
      return;
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setError(null);
    setTimeoutReached(false);
    setCurrentStep(0);
    setProgress(0);

    // Réinitialiser tous les steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));

    // Attendre un peu avant de réessayer
    await delay(1000);
    setIsRetrying(false);
    
    await startTransition();
  };

  const handleContactSupport = () => {
    // Rediriger vers la page de support avec des informations contextuelles
    const supportUrl = `/contact?issue=onboarding-transition&tenantId=${tenantId}&error=${encodeURIComponent(error || 'Unknown error')}`;
    navigate(supportUrl);
  };

  const handleGoToDashboard = () => {
    // Tentative de redirection directe vers le dashboard
    navigate('/dashboard');
  };

  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const getErrorIcon = () => {
    if (timeoutReached) {
      return <AlertCircle className="h-8 w-8 text-orange-500" />;
    }
    return <AlertCircle className="h-8 w-8 text-red-500" />;
  };

  const getErrorTitle = () => {
    if (timeoutReached) {
      return 'Setup Taking Longer Than Expected';
    }
    return 'Setup Error';
  };

  const getErrorDescription = () => {
    if (timeoutReached) {
      return 'Your organization setup is taking longer than usual. This might be due to high server load.';
    }
    return error || 'An unexpected error occurred during the setup process.';
  };

  if (error || timeoutReached) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {getErrorIcon()}
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {getErrorTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              {getErrorDescription()}
            </p>
            
            {retryCount < MAX_RETRIES && (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">
                  Retry attempt: {retryCount}/{MAX_RETRIES}
                </p>
                <Button 
                  onClick={handleRetry} 
                  disabled={isRetrying}
                  className="w-full"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Button 
                onClick={handleGoToDashboard} 
                variant="outline" 
                className="w-full"
              >
                Go to Dashboard Anyway
              </Button>
              
              <Button 
                onClick={handleContactSupport} 
                variant="ghost" 
                className="w-full"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>

            {retryCount >= MAX_RETRIES && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Need help?</strong> Our support team can help you complete the setup process.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 bg-blue-600 rounded-full opacity-20"></div>
              </div>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Setting Up Your Organization
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Please wait while we prepare your workspace...
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Liste des étapes */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {step.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {step.status === 'in-progress' && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {step.status === 'pending' && (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'in-progress' ? 'text-blue-700' :
                    step.status === 'error' ? 'text-red-700' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.status === 'in-progress' && (
                    <p className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Message d'information */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              This usually takes less than 30 seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};