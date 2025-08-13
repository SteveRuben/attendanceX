import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Link, 
  Unlink, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Settings,
  RefreshCw
} from 'lucide-react';

export interface IntegrationCardProps {
  provider: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    available: boolean;
    comingSoon?: boolean;
    features: Array<{
      key: string;
      label: string;
      description: string;
      icon: React.ReactNode;
    }>;
  };
  integration?: {
    id: string;
    status: 'connected' | 'disconnected' | 'error' | 'expired';
    connectedAt?: Date;
    lastSyncAt?: Date;
    userEmail?: string;
    userName?: string;
    syncSettings: Record<string, boolean>;
  };
  onConnect: (providerId: string) => void;
  onDisconnect: (integrationId: string) => void;
  onToggleSync: (integrationId: string, feature: string, enabled: boolean) => void;
  onSettings?: (integrationId: string) => void;
  onSync?: (integrationId: string) => void;
  loading?: boolean;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  provider,
  integration,
  onConnect,
  onDisconnect,
  onToggleSync,
  onSettings,
  onSync,
  loading = false
}) => {
  const isConnected = integration?.status === 'connected';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connecté';
      case 'error':
        return 'Erreur';
      case 'expired':
        return 'Expiré';
      default:
        return 'Déconnecté';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'expired':
        return 'text-orange-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className={`${provider.color} ${!provider.available ? 'opacity-60' : ''} transition-all duration-200 hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {provider.icon}
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {provider.name}
                {provider.comingSoon && (
                  <Badge variant="secondary" className="text-xs">
                    Bientôt disponible
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm">
                {provider.description}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {integration && (
              <div className={`flex items-center space-x-1 text-sm ${getStatusColor(integration.status)}`}>
                {getStatusIcon(integration.status)}
                <span>{getStatusText(integration.status)}</span>
              </div>
            )}
            
            {provider.available ? (
              <div className="flex items-center space-x-1">
                {isConnected && onSync && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSync(integration!.id)}
                    disabled={loading}
                    title="Synchroniser maintenant"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                
                {isConnected && onSettings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSettings(integration!.id)}
                    title="Paramètres avancés"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
                
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDisconnect(integration!.id)}
                    disabled={loading}
                  >
                    <Unlink className="h-3 w-3 mr-1" />
                    Déconnecter
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onConnect(provider.id)}
                    disabled={loading}
                  >
                    <Link className="h-3 w-3 mr-1" />
                    Connecter
                  </Button>
                )}
              </div>
            ) : (
              <Button size="sm" disabled>
                <ExternalLink className="h-3 w-3 mr-1" />
                Bientôt
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isConnected && integration && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Informations de connexion */}
            <div className="text-xs text-gray-600 bg-white/50 rounded p-2">
              <div className="flex items-center justify-between">
                <span>Connecté en tant que <strong>{integration.userEmail}</strong></span>
                {integration.lastSyncAt && (
                  <span>
                    Dernière sync: {new Date(integration.lastSyncAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
            
            {/* Paramètres de synchronisation */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Données à synchroniser:</div>
              <div className="space-y-2">
                {provider.features.map((feature) => (
                  <div key={feature.key} className="flex items-center justify-between py-2 px-3 bg-white/30 rounded-md">
                    <div className="flex items-center space-x-3">
                      <div className="text-gray-600">
                        {feature.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{feature.label}</div>
                        <div className="text-xs text-gray-600">{feature.description}</div>
                      </div>
                    </div>
                    <Switch
                      checked={integration.syncSettings[feature.key] || false}
                      onCheckedChange={(checked) => 
                        onToggleSync(integration.id, feature.key, checked)
                      }
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Statistiques de synchronisation */}
            {integration.status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-center space-x-2 text-red-800">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Erreur de synchronisation</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  La dernière synchronisation a échoué. Vérifiez vos permissions ou reconnectez-vous.
                </p>
              </div>
            )}

            {integration.status === 'expired' && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <div className="flex items-center space-x-2 text-orange-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Autorisation expirée</span>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Votre autorisation a expiré. Reconnectez-vous pour continuer la synchronisation.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};