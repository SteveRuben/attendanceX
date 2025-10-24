import React from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface ProgressIndicatorProps {
  steps: Step[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  showDescriptions?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  className,
  orientation = 'horizontal',
  showDescriptions = false
}) => {
  const getStepIcon = (step: Step, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'current':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-gray-400 text-xs font-medium">{index + 1}</span>
          </div>
        );
    }
  };

  const getStepColor = (step: Step) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-600';
      case 'current':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getConnectorColor = (currentStep: Step, nextStep?: Step) => {
    if (currentStep.status === 'completed') {
      return 'bg-green-600';
    }
    if (currentStep.status === 'current' && nextStep) {
      return 'bg-gradient-to-r from-blue-600 to-gray-300';
    }
    return 'bg-gray-300';
  };

  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            <div className="flex flex-col items-center">
              {getStepIcon(step, index)}
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-0.5 h-8 mt-2',
                  getConnectorColor(step, steps[index + 1])
                )} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', getStepColor(step))}>
                {step.title}
              </p>
              {showDescriptions && step.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center space-y-2">
            {getStepIcon(step, index)}
            <div className="text-center">
              <p className={cn('text-xs font-medium', getStepColor(step))}>
                {step.title}
              </p>
              {showDescriptions && step.description && (
                <p className="text-xs text-gray-500 mt-1 max-w-20">
                  {step.description}
                </p>
              )}
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-4',
              getConnectorColor(step, steps[index + 1])
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressIndicator;