/**
 * Composant pour gérer la redirection automatique après authentification
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building, Users, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authService, userService } from '@/services';
import { OrganizationSetup } from '@/components/organization/OrganizationSetup';
import { MainNavigation } from '@/components/navigation/MainNavigation';
import { useToast } from '@/hooks/use-toast';

interface AuthRedirectProps {
  user: {
    uid: string;
    email: string;
    displayName?: string;
  };
}

interface UserOrganization {
  organizationId: string;
  organizationName: string;
  role: string;
  isActive: boolean;
  joinedAt: Date;
}

export const AuthRedirect: React.FC<AuthRedirectProps> = ({ user }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<UserOrganization | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUserStatus();
  }, [user.uid]);

  /**
   * Vérifier le statut de l'utilisateur et ses organisations
   */
  const checkUserStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Essayer de récupérer les organisations de l'utilisateur
      try {
        const organizationsResponse = await userService.getUserOrganizations(user.uid);
        
        if (organizationsResponse.success && organizationsResponse.data && organizationsResponse.data.length > 0) {
          const organizations = organizationsResponse.data;
          setUserOrganizations(organizations);

          if (organizations.length === 1) {
            // Une seule organisation -> Redirection automatique
            const org = organizations[0];
            setSelectedOrganization(org);
            
            toast({
              title: "Connexion réussie",
              description: `Redirection vers ${org.organizationName}...`
            });
            
            // Redirection après un court délai
            setTimeout(() => {
              navigate(`/organization/${org.organizationId}/dashboard`);
            }, 1500);
            return;
          }
          // Plusieurs organisations -> Choix utilisateur (géré dans le rendu)
        } else {
          // Aucune organisation trouvée -> Configuration optionnelle
          setShowSetup(true);
        }
      } catch (error) {
        console.log('Aucune organisation trouvée ou erreur API, redirection vers la configuration');
        // En cas d'erreur API, proposer la configuration d'organisation
        setShowSetup(true);
      }

    } catch (error) {
      console.error('Erreur lors de la vérification du statut utilisateur:', error);
      // En cas d'erreur générale, proposer quand même la configuration
      setShowSetup(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sélectionner une organisation
   */
  const selectOrganization = (organization: UserOrganization) => {
    setSelectedOrganization(organization);
    
    toast({
      title: "Organisation sélectionnée",
      description: `Accès à ${organization.organizationName}`
    });
    
    navigate(`/organization/${organization.organizationId}/dashboard`);
  };

  /**
   * Créer une nouvelle organisation
   */
  const createNewOrganization = () => {
    setShowSetup(true);
  };

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold">Connexion en cours...</h3>
                <p className="text-sm text-muted-foreground">
                  Vérification de vos organisations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Erreur de Connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={checkUserStatus} variant="outline">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Configuration d'organisation
  if (showSetup) {
    // Récupérer le nom de l'organisation depuis localStorage si disponible
    const pendingOrganizationName = localStorage.getItem('pendingOrganizationName');
    
    return (
      <OrganizationSetup 
        userId={user.uid} 
        userEmail={user.email}
        initialOrganizationName={pendingOrganizationName || undefined}
      />
    );
  }

  // Redirection automatique en cours
  if (selectedOrganization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <div>
                <h3 className="text-lg font-semibold">Connexion réussie !</h3>
                <p className="text-sm text-muted-foreground">
                  Redirection vers {selectedOrganization.organizationName}...
                </p>
              </div>
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Chargement du tableau de bord...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Choix entre plusieurs organisations
  if (userOrganizations.length > 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Sélectionner votre Organisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                Bonjour <strong>{user.displayName || user.email}</strong> !
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Vous appartenez à plusieurs organisations. Sélectionnez celle que vous souhaitez utiliser :
              </p>
            </div>
            
            <div className="space-y-3">
              {userOrganizations.map((org) => (
                <div
                  key={org.organizationId}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => selectOrganization(org)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                          {org.organizationName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {org.role}
                          </Badge>
                          {org.isActive && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              Actif
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Membre depuis
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(org.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={createNewOrganization}
                className="w-full"
              >
                <Building className="h-4 w-4 mr-2" />
                Créer une nouvelle organisation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback - ne devrait pas arriver
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <p>État inattendu. Redirection...</p>
          <Button onClick={checkUserStatus} className="mt-4">
            Actualiser
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};