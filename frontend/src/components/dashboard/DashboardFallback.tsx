// frontend/src/components/dashboard/DashboardFallback.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  BarChart3,
  Bell,
  AlertTriangle,
  RefreshCw,
  Settings,
  Building,
  Plus,
  Info
} from 'lucide-react';

interface DashboardFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  hasOrganization?: boolean;
}

const DashboardFallback: React.FC<DashboardFallbackProps> = ({
  error,
  onRetry,
  hasOrganization = true
}) => {
  // Mode dégradé avec données statiques
  const fallbackStats = [
    {
      title: 'Événements',
      value: '--',
      icon: Calendar,
      description: 'Données non disponibles',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Utilisateurs',
      value: '--',
      icon: Users,
      description: 'Données non disponibles',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Présences',
      value: '--',
      icon: BarChart3,
      description: 'Données non disponibles',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Notifications',
      value: '--',
      icon: Bell,
      description: 'Données non disponibles',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  const isServiceError = error?.message?.includes('404') || error?.message?.includes('Route not found');

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header avec alerte */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">Mode dégradé - Fonctionnalités limitées</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        )}
      </div>

      {/* Alerte d'erreur */}
      <Alert className={`border-${isServiceError ? 'blue' : 'orange'}-200 bg-${isServiceError ? 'blue' : 'orange'}-50`}>
        <AlertTriangle className={`h-4 w-4 ${isServiceError ? 'text-blue-600' : 'text-orange-600'}`} />
        <AlertDescription className={isServiceError ? 'text-blue-700' : 'text-orange-700'}>
          {isServiceError ? (
            <>
              <strong>Services en développement :</strong> Certaines fonctionnalités ne sont pas encore disponibles. 
              Vous pouvez utiliser les fonctions de base en attendant.
            </>
          ) : (
            <>
              <strong>Problème de connexion :</strong> {error?.message || 'Impossible de charger les données du tableau de bord.'}
            </>
          )}
        </AlertDescription>
      </Alert>

      {/* Stats en mode dégradé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {fallbackStats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-full`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions disponibles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasOrganization ? (
              <>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Créer un événement
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Gérer les utilisateurs
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Voir les rapports
                </Button>
              </>
            ) : (
              <>
                <Button className="w-full justify-start" variant="outline">
                  <Building className="w-4 h-4 mr-2" />
                  Configurer l'organisation
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres du compte
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Informations système */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              État du système
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Interface utilisateur</span>
              <Badge variant="default">Opérationnel</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Services backend</span>
              <Badge variant={isServiceError ? "secondary" : "destructive"}>
                {isServiceError ? 'En développement' : 'Indisponible'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Base de données</span>
              <Badge variant="secondary">Inconnu</Badge>
            </div>
            
            {isServiceError && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Astuce :</strong> Les services sont en cours de développement. 
                  Revenez bientôt pour accéder à toutes les fonctionnalités !
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message d'encouragement */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            {hasOrganization ? 'Tableau de bord en mode dégradé' : 'Bienvenue sur AttendanceX !'}
          </h3>
          <p className="text-blue-700 mb-4">
            {hasOrganization 
              ? 'Certaines données ne peuvent pas être chargées pour le moment, mais vous pouvez toujours accéder aux fonctionnalités principales.'
              : 'Commencez par configurer votre organisation pour accéder à toutes les fonctionnalités.'
            }
          </p>
          {onRetry && (
            <Button onClick={onRetry} className="mr-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer le chargement
            </Button>
          )}
          {!hasOrganization && (
            <Button variant="outline">
              <Building className="w-4 h-4 mr-2" />
              Configurer l'organisation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardFallback;