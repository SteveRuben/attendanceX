import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { CheckCircle, ArrowRight, Shield, Sparkles } from 'lucide-react';

interface OnboardingCompleteProps {
  organizationName: string;
  onContinue: () => void;
}

export const OnboardingComplete: React.FC<OnboardingCompleteProps> = ({
  organizationName,
  onContinue
}) => {
  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to AttendanceX!</h1>
          <p className="text-gray-600 mt-2">Your organization has been created successfully</p>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl text-gray-900">🎉 Setup Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">
                {organizationName} is ready to go!
              </h3>
              <p className="text-sm text-green-700">
                Your organization has been successfully created with all the essential features configured.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">What's next?</h4>
              <div className="space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Explore your dashboard</p>
                    <p className="text-xs text-gray-600">Get familiar with all the features available to you</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Invite your team</p>
                    <p className="text-xs text-gray-600">Add team members and assign roles</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Create your first event</p>
                    <p className="text-xs text-gray-600">Start managing attendance and engagement</p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={onContinue}
              className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium h-12"
            >
              <div className="flex items-center justify-center">
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </Button>

            <div className="text-xs text-gray-500">
              Need help getting started? Check out our{' '}
              <a href="/help" className="text-blue-600 hover:underline">
                quick start guide
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};