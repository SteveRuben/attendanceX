/**
 * Composant intelligent pour gérer la redirection automatique après authentification
 * Logique centralisée pour SaaS multi-tenant
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/Button';

interface UserContext {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isFirstLogin: boolean;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    isDefault: boolean;
  }>;
  pendingInvitations: Array<{
    id: string;
    organizationName: string;
    role: string;
    inviterName: string;
  }>;
}

export const AuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyzeUserContext();
  }, []);

  const analyzeUserContext = async () => {
    try {
      setLoading(true);

      // Récupérer le contexte utilisateur complet
      const response = await fetch('/api/auth/user-context', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to get user context');
      }

      const context: UserContext = await response.json();
      setUserContext(context);

      // Logique de redirection intelligente
      await handleIntelligentRedirect(context);

    } catch (error) {
      console.error('Auth redirect error:', error);
      setError('Unable to determine user context');
      // Fallback vers login
      setTimeout(() => navigate('/login'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleIntelligentRedirect = async (context: UserContext) => {
    setRedirecting(true);

    // 1. First login + No organization = skip onboarding (temporary)
    if (context.isFirstLogin && context.organizations.length === 0) {
      navigate('/dashboard');
      return;
    }

    // 2. Utilisateur avec invitations en attente = Choix d'organisation
    if (context.pendingInvitations.length > 0 && context.organizations.length === 0) {
      navigate('/choose-organization');
      return;
    }

    // 3. Utilisateur avec une seule organisation = Dashboard direct
    if (context.organizations.length === 1) {
      const org = context.organizations[0];
      await setActiveOrganization(org.id);
      navigate('/dashboard');
      return;
    }

    // 4. Utilisateur multi-organisations = Sélection d'organisation
    if (context.organizations.length > 1) {
      // Utiliser l'organisation par défaut si définie
      const defaultOrg = context.organizations.find(org => org.isDefault);
      if (defaultOrg) {
        await setActiveOrganization(defaultOrg.id);
        navigate('/dashboard');
      } else {
        navigate('/choose-organization');
      }
      return;
    }

    // 5. Fallback = Dashboard
    navigate('/dashboard');
  };

  const setActiveOrganization = async (organizationId: string) => {
    try {
      await fetch('/api/auth/set-active-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId })
      });
    } catch (error) {
      console.error('Failed to set active organization:', error);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">
            {loading ? 'Analyzing your account...' : 'Redirecting...'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {userContext && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Welcome back</span>
                <span className="font-medium">{userContext.firstName}</span>
              </div>

              {userContext.organizations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Your organizations:</p>
                  {userContext.organizations.map(org => (
                    <div key={org.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{org.name}</span>
                      </div>
                      <Badge variant={org.isDefault ? 'default' : 'secondary'}>
                        {org.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {userContext.pendingInvitations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Pending invitations:</p>
                  {userContext.pendingInvitations.map(invitation => (
                    <div key={invitation.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">{invitation.organizationName}</span>
                      </div>
                      <Badge variant="outline">{invitation.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-500">
              {loading
                ? 'Determining the best experience for you...'
                : 'Taking you to your workspace...'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};