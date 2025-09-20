// Composant de choix d'onboarding : créer ou rejoindre une organisation
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Building, Users, Plus, ArrowRight, Shield } from 'lucide-react';

export const OnboardingChoice: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateOrganization = () => {
    navigate('/onboarding/create');
  };

  const handleJoinOrganization = () => {
    // TODO: Implement join organization flow
    navigate('/onboarding/join');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to AttendanceX!</h1>
          <p className="text-gray-600 mt-2">Let's get you set up with an organization</p>
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Organization */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Building className="text-blue-600 w-8 h-8" />
                </div>
              </div>
              <CardTitle className="text-xl text-gray-900">Create Organization</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Start fresh by creating a new organization. You'll become the administrator and can invite team members.
              </p>
              
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Full administrative control</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Invite team members</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Configure settings & permissions</span>
                </div>
              </div>

              <Button
                onClick={handleCreateOrganization}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 font-medium"
              >
                <div className="flex items-center justify-center">
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Create Organization</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Join Organization */}
          <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <Users className="text-green-600 w-8 h-8" />
                </div>
              </div>
              <CardTitle className="text-xl text-gray-900">Join Organization</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Join an existing organization using an invitation code or by requesting access from an administrator.
              </p>
              
              <div className="space-y-2 text-sm text-gray-500 mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Use invitation code</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Request access</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>Browse public organizations</span>
                </div>
              </div>

              <Button
                onClick={handleJoinOrganization}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
              >
                <div className="flex items-center justify-center">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Join Organization</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            You can always create or join additional organizations later from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};