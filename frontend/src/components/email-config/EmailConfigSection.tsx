import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEmailConfig } from '@/hooks/useEmailConfig';
import { EmailProviderForm } from './EmailProviderForm';
import { EmailProviderCard } from './EmailProviderCard';
import { 
  Mail, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Globe,
  Building
} from 'lucide-react';
import { EmailProvider, ProviderTypeInfo } from '@/services/emailConfigService';

export const EmailConfigSection: React.FC = () => {
  const {
    providers,
    providerTypes,
    loading,
    error,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider
  } = useEmailConfig();

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<EmailProvider | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const handleCreateProvider = async (data: any) => {
    try {
      await createProvider(data);
      setShowForm(false);
    } catch (error) {
      console.error('Error creating provider:', error);
    }
  };

  const handleUpdateProvider = async (data: any) => {
    if (!editingProvider) return;
    
    try {
      await updateProvider(editingProvider.id, data);
      setEditingProvider(null);
    } catch (error) {
      console.error('Error updating provider:', error);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette configuration ? Le tenant utilisera alors la configuration globale.')) {
      return;
    }

    try {
      await deleteProvider(id);
    } catch (error) {
      console.error('Error deleting provider:', error);
    }
  };

  const handleTestProvider = async (provider: EmailProvider, testEmail: string) => {
    setTestingProvider(provider.id);
    
    try {
      const result = await testProvider({
        type: provider.type,
        config: provider.config,
        testEmail
      });

      if (result.success) {
        alert(`✅ Test réussi ! Email envoyé à ${testEmail}`);
      } else {
        alert(`❌ Test échoué : ${result.message}`);
      }
    } catch (error) {
      alert(`❌ Erreur lors du test : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const tenantProviders = providers.filter(p => !p.isGlobal);
  const globalProviders = providers.filter(p => p.isGlobal);

  if (loading && providers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Configuration Email
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-4">
                Configurez vos propres paramètres SMTP pour personnaliser l'envoi d'emails de votre organisation. 
                En l'absence de configuration, les paramètres globaux seront utilisés automatiquement.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span><strong>Configuration tenant :</strong> Paramètres spécifiques à votre organisation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span><strong>Configuration globale :</strong> Paramètres par défaut de la plateforme</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span><strong>Fallback automatique :</strong> Tenant → Global → Statique</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span><strong>Providers supportés :</strong> SendGrid, Mailgun, AWS SES, SMTP</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Providers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Configurations de votre organisation
            </h4>
            <p className="text-sm text-muted-foreground">
              Paramètres SMTP spécifiques à votre organisation (priorité haute)
            </p>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter une configuration
          </Button>
        </div>

        {tenantProviders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune configuration personnalisée</h3>
              <p className="text-muted-foreground mb-4">
                Votre organisation utilise actuellement les paramètres globaux de la plateforme.
                Ajoutez une configuration personnalisée pour utiliser vos propres paramètres SMTP.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer ma première configuration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tenantProviders.map(provider => (
              <EmailProviderCard
                key={provider.id}
                provider={provider}
                onEdit={() => setEditingProvider(provider)}
                onDelete={() => handleDeleteProvider(provider.id)}
                onTest={(testEmail) => handleTestProvider(provider, testEmail)}
                testing={testingProvider === provider.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Global Providers Section */}
      {globalProviders.length > 0 && (
        <div>
          <div className="mb-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-600" />
              Configurations globales (fallback)
            </h4>
            <p className="text-sm text-muted-foreground">
              Paramètres par défaut utilisés en l'absence de configuration personnalisée
            </p>
          </div>

          <div className="grid gap-4">
            {globalProviders.map(provider => (
              <EmailProviderCard
                key={provider.id}
                provider={provider}
                readonly
                onTest={(testEmail) => handleTestProvider(provider, testEmail)}
                testing={testingProvider === provider.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {(showForm || editingProvider) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EmailProviderForm
              providerTypes={providerTypes}
              initialData={editingProvider}
              onSubmit={editingProvider ? handleUpdateProvider : handleCreateProvider}
              onCancel={() => {
                setShowForm(false);
                setEditingProvider(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};