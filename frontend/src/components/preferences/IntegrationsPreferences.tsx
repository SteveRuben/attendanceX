import React, { useState } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Settings } from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { OAuthConnector } from './OAuthConnector';
import { SyncSettingsModal, type SyncSettings } from './SyncSettingsModal';
import { useIntegrations } from '../hooks/useIntegrations';
import { 
  Users,
  Calendar,
  Mail,
  FileText, 
  Bell, 
  Shield, 
  Palette, 
  Link,
  Settings as SettingsIcon 
} from 'lucide-react';

// Types pour les intégrations
interface Integration {
  id: string;
  provider: 'google' | 'microsoft' | 'apple' | 'slack';
  status: 'connected' | 'disconnected' | 'error' | 'expired';
  connectedAt?: Date;
  lastSyncAt?: Date;
  userEmail?: string;
  userName?: string;
  profilePicture?: string;
  syncSettings: {
    calendar: boolean;
    contacts: boolean;
    email: boolean;
    files: boolean;
  };
}

interface IntegrationProvider {
  id: 'google' | 'microsoft' | 'apple' | 'slack';
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: Array<{
    key: keyof Integration['syncSettings'];
    label: string;
    description: string;
    icon: React.ReactNode;
  }>;
  available: boolean;
  comingSoon?: boolean;
}

const integrationProviders: IntegrationProvider[] = [
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Synchronisez votre calendrier, contacts et emails Google',
    icon: (
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </div>
    ),
    color: 'bg-blue-50 border-blue-200',
    features: [
      {
        key: 'calendar',
        label: 'Calendrier',
        description: 'Synchroniser les événements Google Calendar',
        icon: <Calendar className="h-4 w-4" />
      },
      {
        key: 'contacts',
        label: 'Contacts',
        description: 'Importer les contacts Google',
        icon: <Users className="h-4 w-4" />
      },
      {
        key: 'email',
        label: 'Gmail',
        description: 'Accéder aux emails Gmail',
        icon: <Mail className="h-4 w-4" />
      }
    ],
    available: true
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    description: 'Intégrez Outlook, Teams et OneDrive',
    icon: (
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#FF6C37" d="M17.5 12L12 16.5V7.5L17.5 12Z"/>
          <path fill="#FFB900" d="M22 12L17.5 16.5V7.5L22 12Z"/>
          <path fill="#00BCF2" d="M12 7.5L17.5 12L12 16.5V7.5Z"/>
          <path fill="#00B4FF" d="M2 7.5H12V16.5H2V7.5Z"/>
        </svg>
      </div>
    ),
    color: 'bg-orange-50 border-orange-200',
    features: [
      {
        key: 'calendar',
        label: 'Outlook Calendar',
        description: 'Synchroniser les événements Outlook',
        icon: <Calendar className="h-4 w-4" />
      },
      {
        key: 'email',
        label: 'Outlook Mail',
        description: 'Accéder aux emails Outlook',
        icon: <Mail className="h-4 w-4" />
      },
      {
        key: 'files',
        label: 'OneDrive',
        description: 'Accéder aux fichiers OneDrive',
        icon: <FileText className="h-4 w-4" />
      }
    ],
    available: true
  },
  {
    id: 'apple',
    name: 'Apple iCloud',
    description: 'Synchronisez vos données Apple',
    icon: (
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      </div>
    ),
    color: 'bg-gray-50 border-gray-200',
    features: [
      {
        key: 'calendar',
        label: 'Calendrier iCloud',
        description: 'Synchroniser les événements iCloud',
        icon: <Calendar className="h-4 w-4" />
      },
      {
        key: 'contacts',
        label: 'Contacts iCloud',
        description: 'Importer les contacts iCloud',
        icon: <Users className="h-4 w-4" />
      }
    ],
    available: false,
    comingSoon: true
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Recevez des notifications dans Slack',
    icon: (
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#E01E5A" d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5z"/>
          <path fill="#36C5F0" d="M9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z"/>
          <path fill="#2EB67D" d="M18 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V9zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5z"/>
          <path fill="#ECB22E" d="M15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"/>
        </svg>
      </div>
    ),
    color: 'bg-purple-50 border-purple-200',
    features: [
      {
        key: 'email',
        label: 'Notifications',
        description: 'Recevoir des notifications dans Slack',
        icon: <Mail className="h-4 w-4" />
      }
    ],
    available: false,
    comingSoon: true
  }
];

export const IntegrationsPreferences: React.FC = () => {
  const {
    integrations,
    loading,
    connectIntegration,
    disconnectIntegration,
    updateSyncSettings,
    triggerSync,
    testConnection,
    getIntegrationByProvider
  } = useIntegrations();

  const [oauthConnector, setOAuthConnector] = useState<{
    isOpen: boolean;
    provider?: IntegrationProvider;
  }>({ isOpen: false });
  
  const [syncSettingsModal, setSyncSettingsModal] = useState<{
    isOpen: boolean;
    integration?: Integration & { name: string; icon: React.ReactNode };
  }>({ isOpen: false });

  const handleConnect = async (providerId: string) => {
    const provider = integrationProviders.find(p => p.id === providerId);
    if (provider) {
      setOAuthConnector({ isOpen: true, provider });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    await disconnectIntegration(integrationId);
  };

  const handleToggleSync = async (integrationId: string, feature: string, enabled: boolean) => {
    await updateSyncSettings(integrationId, { [feature]: enabled } as any);
  };

  const handleSettings = (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    const provider = integrationProviders.find(p => p.id === integration?.provider);
    
    if (integration && provider) {
      setSyncSettingsModal({
        isOpen: true,
        integration: {
          ...integration,
          name: provider.name,
          icon: provider.icon
        }
      });
    }
  };

  const handleSync = async (integrationId: string) => {
    await triggerSync(integrationId);
  };

  const handleTest = async (integrationId: string) => {
    await testConnection(integrationId);
  };

  const handleOAuthSuccess = (integrationData: any) => {
    // L'hook se chargera de recharger automatiquement les données
    setOAuthConnector({ isOpen: false });
  };

  const handleOAuthError = (error: string) => {
    // L'erreur est déjà gérée par le composant OAuthConnector
    setOAuthConnector({ isOpen: false });
  };

  const handleSyncSettingsSave = async (integrationId: string, settings: SyncSettings) => {
    await updateSyncSettings(integrationId, settings);
  };

  const getIntegrationForProvider = (providerId: string): Integration | undefined => {
    return integrations.find(integration => integration.provider === providerId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Intégrations</h3>
        <p className="text-sm text-gray-600 mt-1">
          Connectez vos comptes de services externes pour synchroniser vos données.
        </p>
      </div>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Les intégrations vous permettent de synchroniser automatiquement vos calendriers, 
          contacts et autres données avec vos services préférés.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {integrationProviders.map((provider) => {
          const integration = getIntegrationForProvider(provider.id);

          return (
            <IntegrationCard
              key={provider.id}
              provider={provider}
              integration={integration}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onToggleSync={handleToggleSync}
              onSettings={handleSettings}
              onSync={handleSync}
              loading={loading}
            />
          );
        })}
      </div>

      {/* OAuth Connector Modal */}
      {oauthConnector.provider && (
        <OAuthConnector
          isOpen={oauthConnector.isOpen}
          onClose={() => setOAuthConnector({ isOpen: false })}
          provider={oauthConnector.provider}
          scopes={['calendar.read', 'contacts.read', 'profile.read']}
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
        />
      )}

      {/* Sync Settings Modal */}
      {syncSettingsModal.integration && (
        <SyncSettingsModal
          isOpen={syncSettingsModal.isOpen}
          onClose={() => setSyncSettingsModal({ isOpen: false })}
          integration={{
            ...syncSettingsModal.integration,
            syncSettings: syncSettingsModal.integration.syncSettings as SyncSettings
          }}
          onSave={handleSyncSettingsSave}
          availableFeatures={integrationProviders
            .find(p => p.id === syncSettingsModal.integration?.provider)
            ?.features.map(f => ({
              ...f,
              key: f.key as keyof SyncSettings,
              bidirectionalSupported: f.key === 'calendar'
            })) || []
          }
        />
      )}
    </div>
  );
};