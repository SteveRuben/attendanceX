import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  Mail, 
  FileText,
  Clock,
  RefreshCw,
  ArrowLeftRight,
  Info,
  Save,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';

export interface SyncSettings {
  enabled: boolean;
  calendar: boolean;
  contacts: boolean;
  email: boolean;
  files: boolean;
  tasks: boolean;
  presence: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  bidirectional: boolean;
  autoSync: boolean;
  syncOnStartup: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
}

export interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: {
    id: string;
    provider: string;
    name: string;
    icon: React.ReactNode;
    syncSettings: SyncSettings;
  };
  onSave: (integrationId: string, settings: SyncSettings) => Promise<void>;
  availableFeatures: Array<{
    key: keyof SyncSettings;
    label: string;
    description: string;
    icon: React.ReactNode;
    bidirectionalSupported?: boolean;
  }>;
}

const frequencyOptions = [
  { value: 'realtime', label: 'Temps réel', description: 'Synchronisation immédiate' },
  { value: 'hourly', label: 'Toutes les heures', description: 'Synchronisation automatique chaque heure' },
  { value: 'daily', label: 'Quotidienne', description: 'Synchronisation une fois par jour' },
  { value: 'weekly', label: 'Hebdomadaire', description: 'Synchronisation une fois par semaine' }
];

const conflictResolutionOptions = [
  { value: 'local', label: 'Priorité locale', description: 'Les modifications locales ont la priorité' },
  { value: 'remote', label: 'Priorité distante', description: 'Les modifications distantes ont la priorité' },
  { value: 'manual', label: 'Résolution manuelle', description: 'Demander à chaque conflit' }
];

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  integration,
  onSave,
  availableFeatures
}) => {
  const [settings, setSettings] = useState<SyncSettings>(integration.syncSettings);
  const [loading, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(integration.syncSettings);
    setHasChanges(false);
  }, [integration.syncSettings, isOpen]);

  useEffect(() => {
    const hasChanged = JSON.stringify(settings) !== JSON.stringify(integration.syncSettings);
    setHasChanges(hasChanged);
  }, [settings, integration.syncSettings]);

  const handleSettingChange = <K extends keyof SyncSettings>(
    key: K,
    value: SyncSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(integration.id, settings);
      toast.success('Paramètres de synchronisation mis à jour');
      onClose();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?')) {
        setSettings(integration.syncSettings);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getFeatureIcon = (featureKey: string) => {
    switch (featureKey) {
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'contacts':
        return <Users className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'files':
        return <FileText className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {integration.icon}
            <span>Paramètres de synchronisation - {integration.name}</span>
          </DialogTitle>
          <DialogDescription>
            Configurez comment et quand synchroniser vos données avec {integration.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Activation générale */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Synchronisation activée</Label>
                <p className="text-sm text-gray-600">
                  Activer ou désactiver complètement la synchronisation
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Types de données à synchroniser */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Types de données</Label>
              <p className="text-sm text-gray-600">
                Choisissez quelles données synchroniser
              </p>
            </div>

            <div className="space-y-3">
              {availableFeatures.map((feature) => (
                <div key={feature.key} className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {feature.icon}
                      <div>
                        <div className="font-medium">{feature.label}</div>
                        <div className="text-sm text-gray-600">{feature.description}</div>
                      </div>
                    </div>
                    <Switch
                      checked={settings[feature.key] as boolean}
                      onCheckedChange={(checked) => handleSettingChange(feature.key, checked)}
                      disabled={!settings.enabled}
                    />
                  </div>

                  {/* Option bidirectionnelle si supportée */}
                  {feature.bidirectionalSupported && settings[feature.key] && (
                    <div className="ml-6 flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center space-x-2">
                        <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">Synchronisation bidirectionnelle</span>
                      </div>
                      <Switch
                        checked={settings.bidirectional}
                        onCheckedChange={(checked) => handleSettingChange('bidirectional', checked)}
                        disabled={!settings.enabled}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Fréquence de synchronisation */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Fréquence de synchronisation</Label>
              <p className="text-sm text-gray-600">
                À quelle fréquence synchroniser automatiquement
              </p>
            </div>

            <Select
              value={settings.frequency}
              onValueChange={(value: SyncSettings['frequency']) => handleSettingChange('frequency', value)}
              disabled={!settings.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Options avancées */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Options avancées</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Synchronisation automatique</Label>
                  <p className="text-sm text-gray-600">
                    Synchroniser automatiquement selon la fréquence définie
                  </p>
                </div>
                <Switch
                  checked={settings.autoSync}
                  onCheckedChange={(checked) => handleSettingChange('autoSync', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Synchroniser au démarrage</Label>
                  <p className="text-sm text-gray-600">
                    Effectuer une synchronisation à l'ouverture de l'application
                  </p>
                </div>
                <Switch
                  checked={settings.syncOnStartup}
                  onCheckedChange={(checked) => handleSettingChange('syncOnStartup', checked)}
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Résolution des conflits */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Résolution des conflits</Label>
              <p className="text-sm text-gray-600">
                Comment gérer les conflits lors de la synchronisation bidirectionnelle
              </p>
            </div>

            <Select
              value={settings.conflictResolution}
              onValueChange={(value: SyncSettings['conflictResolution']) => 
                handleSettingChange('conflictResolution', value)
              }
              disabled={!settings.enabled || !settings.bidirectional}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conflictResolutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Avertissement pour la synchronisation temps réel */}
          {settings.frequency === 'realtime' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                La synchronisation en temps réel peut consommer plus de batterie et de données. 
                Elle est recommandée uniquement pour les données critiques.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <span className="text-sm text-orange-600 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Modifications non sauvegardées
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};