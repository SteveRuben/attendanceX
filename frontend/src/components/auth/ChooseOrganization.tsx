import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building, 
  Users, 
  ArrowRight, 
  Plus, 
  Shield,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  isDefault: boolean;
}

interface PendingInvitation {
  id: string;
  organizationName: string;
  organizationId: string;
  role: string;
  inviterName: string;
  expiresAt: string;
}

export const ChooseOrganization: React.FC = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserOrganizations();
  }, []);

  const loadUserOrganizations = async () => {
    try {
      const response = await fetch('/api/auth/user-organizations', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setInvitations(data.pendingInvitations || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setError('Unable to load your organizations');
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = async (organizationId: string) => {
    setSelecting(organizationId);
    
    try {
      const response = await fetch('/api/auth/set-active-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId })
      });

      if (!response.ok) {
        throw new Error('Failed to select organization');
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Error selecting organization:', error);
      setError('Failed to access organization');
    } finally {
      setSelecting(null);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    setAccepting(invitationId);
    
    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ invitationId })
      });

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      // Recharger les organisations après acceptation
      await loadUserOrganizations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(null);
    }
  };

  const createNewOrganization = () => {
    navigate('/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your organizations...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Choose Organization</h1>
          <p className="text-gray-600 mt-2">Select which organization to access</p>
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Existing Organizations */}
          {organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Your Organizations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {organizations.map(org => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{org.name}</h3>
                        {org.isDefault && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <Badge variant="secondary">{org.role}</Badge>
                        <span className="text-sm text-gray-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          {org.memberCount} members
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => selectOrganization(org.id)}
                      disabled={selecting === org.id}
                      className="ml-4"
                    >
                      {selecting === org.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Access
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Pending Invitations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invitations.map(invitation => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{invitation.organizationName}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <Badge variant="outline">{invitation.role}</Badge>
                        <span className="text-sm text-gray-600">
                          Invited by {invitation.inviterName}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => acceptInvitation(invitation.id)}
                      disabled={accepting === invitation.id}
                      variant="outline"
                      className="ml-4"
                    >
                      {accepting === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Create New Organization */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Create New Organization</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Start fresh with your own organization
                  </p>
                </div>
                <Button
                  onClick={createNewOrganization}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* No Organizations State */}
          {organizations.length === 0 && invitations.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Building className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">No Organizations Yet</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Create your first organization to get started
                  </p>
                </div>
                <Button onClick={createNewOrganization} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChooseOrganization;