/**
 * Tableau de bord principal de l'organisation
 * Utilise le nom configuré lors de la création
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building,
  Users,
  Calendar,
  BarChart3,
  Settings,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  Crown,
  Shield
} from 'lucide-react';
import { MainNavigation } from '@/components/navigation/MainNavigation';
import { organizationService, userService, teamService } from '@/services';
import type { Organization, Team } from '@attendance-x/shared';

// Type for the user membership response from the API
interface UserMembershipResponse {
  organizationId: string;
  organizationName: string;
  role: string;
  isActive: boolean;
  joinedAt: Date;
  permissions: string[];
}
import { useToast } from '@/hooks/use-toast';

interface OrganizationDashboardProps {
  userId: string;
}

export const OrganizationDashboard: React.FC<OrganizationDashboardProps> = ({ userId }) => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userMembership, setUserMembership] = useState<UserMembershipResponse | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalTeams: 0,
    totalEvents: 0,
    activeEvents: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadOrganizationData();
    }
  }, [organizationId, userId]);

  /**
   * Charger toutes les données de l'organisation
   */
  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!organizationId) {
        throw new Error('ID d\'organisation manquant');
      }

      // Charger les données en parallèle
      const [
        orgResponse,
        membershipResponse,
        userResponse,
        teamsResponse,
        statsResponse
      ] = await Promise.allSettled([
        organizationService.getOrganization(organizationId),
        userService.getUserOrganizationMembership(userId, organizationId),
        userService.getUserProfile(userId),
        teamService.getTeams(organizationId),
        organizationService.getOrganizationStats(organizationId)
      ]);

      console.log('API Responses:', {
        orgResponse: orgResponse.status === 'fulfilled' ? orgResponse.value : orgResponse.reason,
        membershipResponse: membershipResponse.status === 'fulfilled' ? membershipResponse.value : membershipResponse.reason,
        userResponse: userResponse.status === 'fulfilled' ? userResponse.value : userResponse.reason,
        teamsResponse: teamsResponse.status === 'fulfilled' ? teamsResponse.value : teamsResponse.reason,
        statsResponse: statsResponse.status === 'fulfilled' ? statsResponse.value : statsResponse.reason
      });
      // Traiter la réponse de l'organisation
      if (orgResponse.status === 'fulfilled' && orgResponse.value) {
        setOrganization(orgResponse.value);
      } else {
        console.error('Organization response error:', orgResponse.status === 'rejected' ? orgResponse.reason : 'No data');
        throw new Error('Organisation non trouvée');
      }

      // Traiter l'appartenance de l'utilisateur
      if (membershipResponse.status === 'fulfilled' && membershipResponse.value) {
        setUserMembership(membershipResponse.value);
      } else {
        console.error('Membership response error:', membershipResponse.status === 'rejected' ? membershipResponse.reason : 'No data');
        // L'utilisateur n'appartient pas à cette organisation
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas accès à cette organisation",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      // Traiter les informations de l'utilisateur
      if (userResponse.status === 'fulfilled' && userResponse.value) {
        const user = userResponse.value;
        // Utiliser displayName en priorité, puis email sans le domaine
        const displayName = user.displayName || 
                           (user.email ? user.email.split('@')[0] : '') ||
                           'Utilisateur';
        setUserName(displayName);
      }

      // Traiter les équipes
      if (teamsResponse.status === 'fulfilled' && teamsResponse.value.data) {
        setTeams(teamsResponse.value.data.data);
      }

      // Traiter les statistiques
      if (statsResponse.status === 'fulfilled') {
        setStats({
          totalMembers: statsResponse.value.memberCount || 0,
          totalTeams: teamsResponse.status === 'fulfilled' ? teamsResponse.value.data?.total || 0 : 0,
          totalEvents: statsResponse.value.totalEvents || 0,
          activeEvents: statsResponse.value.activeEvents || 0
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement de l\'organisation:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');

      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les données de l'organisation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtenir le nom d'affichage de l'organisation
   * Utilise displayName en priorité, puis name, et évite d'afficher les emails
   */
  const getOrganizationDisplayName = (): string => {
    if (!organization) return 'Organisation';

    // Si displayName existe et n'est pas vide, l'utiliser
    if (organization.displayName && organization.displayName.trim()) {
      return organization.displayName;
    }

    // Si name existe mais ressemble à un email, utiliser un nom générique
    if (organization.name) {
      if (organization.name.includes('@')) {
        return 'Mon Organisation';
      }
      return organization.name;
    }

    return 'Organisation';
  };

  /**
   * Obtenir la couleur du badge selon le rôle
   */
  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'manager':
        return 'outline';
      default:
        return 'outline';
    }
  };

  /**
   * Obtenir l'icône selon le rôle
   */
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
      case 'manager':
        return <Shield className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement de l'organisation...</p>
        </div>
      </div>
    );
  }
  console.log({ "organization": organization });
  if (error || !organization || !userMembership) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Erreur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              {error || 'Organisation non accessible'}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérification supplémentaire pour s'assurer que les données essentielles sont disponibles
  if (!organization?.id || !userMembership?.role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Finalisation du chargement...</p>
        </div>
      </div>
    );
  }

  // Si tout est chargé, afficher la navigation principale
  return (
    <MainNavigation
      organizationId={organization.id}
      organizationName={getOrganizationDisplayName()}
      userRole={userMembership.role}
      userName={userName}
      userPermissions={userMembership.permissions || []}
      isOwner={userMembership.role?.toLowerCase() === 'owner'}
      isAdmin={userMembership.role?.toLowerCase() === 'admin' || userMembership.role?.toLowerCase() === 'owner'}
    />
  );
};

/**
 * Composant pour l'aperçu de l'organisation (utilisé dans le tableau de bord)
 */
export const OrganizationOverview: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalTeams: 0,
    totalEvents: 0,
    activeEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      const [orgResponse, statsResponse] = await Promise.all([
        organizationService.getOrganization(organizationId),
        organizationService.getOrganizationStats(organizationId)
      ]);

      setOrganization(orgResponse);
      setStats({
        totalMembers: statsResponse.memberCount || 0,
        totalTeams: statsResponse.teamCount || 0,
        totalEvents: statsResponse.totalEvents || 0,
        activeEvents: statsResponse.activeEvents || 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-muted-foreground">Impossible de charger les informations de l'organisation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de l'organisation */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {organization.displayName || organization.name}
              </h1>
              {organization.displayName && organization.displayName !== organization.name && (
                <p className="text-sm text-muted-foreground">({organization.name})</p>
              )}
              <p className="text-muted-foreground mt-1">{organization.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {organization.contactInfo.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {organization.contactInfo.email}
                  </div>
                )}
                {organization.contactInfo.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {organization.contactInfo.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {organization.sector.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Membres</p>
                <p className="text-2xl font-bold">{stats.totalMembers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Équipes</p>
                <p className="text-2xl font-bold">{stats.totalTeams}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Événements</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Événements Actifs</p>
                <p className="text-2xl font-bold">{stats.activeEvents}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6" />
              <span>Créer un Événement</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <UserPlus className="h-6 w-6" />
              <span>Inviter des Membres</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              <span>Voir les Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};