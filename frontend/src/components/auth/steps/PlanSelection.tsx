import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, Check, Shield, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { usePlans } from '@/hooks/usePlans';
import type { OnboardingData } from '../OnboardingFlow';

interface PlanSelectionProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PlanSelection: React.FC<PlanSelectionProps> = ({
  data,
  onUpdate,
  onNext,
  onPrev
}) => {
  const { plans, loading, error, refetch } = usePlans();

  const handlePlanSelect = (planId: string) => {
    onUpdate({ planId });
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Choose your plan</h1>
          <p className="text-gray-600 mt-2">Select the plan that best fits your organization's needs</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div className="w-16 h-1 bg-green-600"></div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <div className="w-16 h-1 bg-gray-200"></div>
            <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-600">Step 2 of 3</div>
        </div>

        {/* Error State */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load plans: {error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="ml-4"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading available plans...</p>
            </div>
          </div>
        )}

        {/* Plans */}
        {!loading && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all duration-200 ${
                data.planId === plan.id
                  ? 'border-gray-900 ring-2 ring-gray-900 shadow-lg'
                  : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
              } ${plan.recommended ? 'border-blue-500' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Recommended
                  </span>
                </div>
              )}

              {plan.metadata?.most_popular && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-gray-900 mt-2">{plan.price}</div>
                <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
                
                {plan.metadata?.trial_days && plan.metadata.trial_days > 0 && (
                  <div className="mt-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      {plan.metadata.trial_days} days free trial
                    </span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.filter(f => f.included).map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature.name}</span>
                      {feature.limit && feature.limit > 0 && (
                        <span className="ml-auto text-xs text-gray-500">
                          ({feature.limit})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Plan Limits */}
                {plan.limits && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Users:</span>
                        <span>{plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Events:</span>
                        <span>{plan.limits.events === -1 ? 'Unlimited' : plan.limits.events}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <span>
                          {plan.limits.storage === -1 
                            ? 'Unlimited' 
                            : `${Math.round(plan.limits.storage / 1024)}GB`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {data.planId === plan.id && (
                  <div className="absolute top-4 right-4">
                    <div className="h-6 w-6 bg-gray-900 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {/* No Plans Available */}
        {!loading && !error && plans.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Plans Available</h3>
            <p className="text-gray-600 mb-4">
              We couldn't find any available plans at the moment.
            </p>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between max-w-md mx-auto">
          <Button
            variant="outline"
            onClick={onPrev}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <Button
            onClick={onNext}
            className="bg-gray-900 text-white hover:bg-gray-800 flex items-center"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Plan details note */}
        <div className="text-center mt-6 text-sm text-gray-600">
          You can change your plan anytime from your dashboard settings
        </div>
      </div>
    </div>
  );
};