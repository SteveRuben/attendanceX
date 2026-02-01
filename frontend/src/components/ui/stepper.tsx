/**
 * Stepper Component
 * Multi-step form navigation component
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = '',
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && index < currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                    isCompleted && 'bg-blue-600 border-blue-600 text-white',
                    isCurrent && 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30',
                    !isCompleted && !isCurrent && 'border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600',
                    isClickable && 'cursor-pointer hover:scale-110'
                  )}
                  aria-label={`Step ${index + 1}: ${step.title}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-blue-600 dark:text-blue-400',
                      isCompleted && 'text-slate-900 dark:text-slate-100',
                      !isCompleted && !isCurrent && 'text-slate-500 dark:text-slate-500'
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors duration-200',
                    index < currentStep ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                  )}
                  style={{ maxWidth: '100px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
