import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Calendar, 
  Mail, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Plus
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  category: 'calendar' | 'communication' | 'productivity';
}

const IntegrationsDashboard = () => {
  const integrations: Integration[] = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Synchronisez vos événements avec Google Calendar',
      icon: Calendar,
      status: 'connected',
      lastSync: new Date(),
      category: 'calendar'
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      description: 'Intégration avec Outlook Calendar et Email',
      icon: Mail,
      status: 'disconnected',
      category: 'calendar'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Notifications et commandes via Slack',
      icon: MessageSquare,
      status: 'connected',
      lastSync: new Date(Date.now() - 30 * 60 * 1000),
      category: 'communication'
    },
    {
      id: 'apple-calendar',
      name: 'Apple Calendar',
      description: 'Synchronisation avec iCloud Calendar',
      icon: Calendar,
      status: 'error',
      category: 'calendar'
    }
  ];

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800">Connecté</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="secondary">Déconnecté</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Intégrations</h1>
          <p className="text-muted-foreground mt-2">
            Connectez vos outils favoris pour une expérience unifiée
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une intégration
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-foreground">
                {integrations.filter(i => i.status === 'connected').length}
              </p>
              <p className="text-sm text-muted-foreground">Intégrations actives</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-foreground">{integrations.length}</p>
              <p className="text-sm text-muted-foreground">Intégrations disponibles</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-foreground">
                {integrations.filter(i => i.status === 'error').length}
              </p>
              <p className="text-sm text-muted-foreground">Nécessitent attention</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Integrations List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <integration.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-foreground">{integration.name}</h3>
                  {getStatusBadge(integration.status)}
                </div>
              </div>
              {getStatusIcon(integration.status)}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {integration.description}
            </p>

            {integration.lastSync && (
              <p className="text-xs text-muted-foreground mb-4">
                Dernière sync: {integration.lastSync.toLocaleString('fr-FR')}
              </p>
            )}

            <div className="flex space-x-2">
              {integration.status === 'connected' ? (
                <>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurer
                  </Button>
                  <Button variant="outline" size="sm">
                    Déconnecter
                  </Button>
                </>
              ) : (
                <Button size="sm" className="flex-1">
                  Connecter
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Help Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Besoin d'aide avec les intégrations ?
        </h3>
        <p className="text-muted-foreground mb-4">
          Consultez notre documentation pour configurer vos intégrations ou contactez notre support.
        </p>
        <div className="flex space-x-4">
          <Button variant="outline">
            Voir la documentation
          </Button>
          <Button variant="outline">
            Contacter le support
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default IntegrationsDashboard;