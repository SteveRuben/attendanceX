import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar, 
  Mail, 
  Eye, 
  Download,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import { Team, TeamSettings, Permission } from '@attendance-x/shared';
import { teamService } from '@/services/teamService';
import { toast } from 'react-toastify';

interface TeamPermissionsEditorProps {
  organizationId: string;
  team: Team;
  onUpdate?: (updatedTeam: Team) => void;
}

interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  permissions: {
    key: keyof TeamSettings;
    label: string;
    description: string;
    defaultValue: boolean;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'attendance',
    name: 'Gestion des Présences',
    description: 'Permissions liées à la validation et gestion des présences',
    icon: CheckCircle,
    permissions: [
      {
        key: 'canValidateAttendance',
        label: 'Valider les présences',
        description: 'Permet aux membres de valider manuellement les présences aux événements',
        defaultValue: true
      }
    ]
  },
  {
    id: 'events',
    name: 'Gestion des Événements',
    description: 'Permissions liées à la création et gestion des événements',
    icon: Calendar,
    permissions: [
      {
        key: 'canCreateEvents',
        label: 'Créer des événements',
        description: 'Permet aux membres de créer de nouveaux événements',
        defaultValue: false
      },
      {
        key: 'canViewAllEvents',
        label: 'Voir tous les événements',
        description: 'Permet de voir tous les événements de l\'organisation, pas seulement ceux de l\'équipe',
        defaultValue: false
      }
    ]
  },
  {
    id: 'participants',
    name: 'Gestion des Participants',
    description: 'Permissions liées à l\'invitation et gestion des participants',
    icon: Users,
    permissions: [
      {
        key: 'canInviteParticipants',
        label: 'Inviter des participants',
        description: 'Permet d\'inviter des participants aux événements',
        defaultValue: false
      }
    ]
  },
  {
    id: 'data',
    name: 'Gestion des Données',
    description: 'Permissions liées à l\'export et analyse des données',
    icon: Download,
    permissions: [
      {
        key: 'canExportData',
        label: 'Exporter les données',
        description: 'Permet d\'exporter les données en CSV, Excel, etc.',
        defaultValue: false
      }
    ]
  }
];

export const TeamPermissionsEditor: React.FC<TeamPermissionsEditorProps> = ({
  organizationId,
  team,
  onUpdate
}) => {
  const [settings, setSettings] = useState<TeamSettings>(team.settings);
  const [loading, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(team.settings);
    setHasChanges(false);
  }, [team]);

  const handlePermissionChange = (key: keyof TeamSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(JSON.stringify(newSettings) !== JSON.stringify(team.settings));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await teamService.updateTeam(organizationId, team.id, {
        settings
      });

      if (response.success && response.data) {
        toast.success('Permissions mises à jour avec succès');
        onUpdate?.(response.data);
        setHasChanges(false);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour des permissions');
      console.error('Error updating team permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(team.settings);
    setHasChanges(false);
  };

  const handleResetToDefaults = () => {
    const defaultSettings: TeamSettings = {
      canValidateAttendance: true,
      canCreateEvents: false,
      canInviteParticipants: false,
      canViewAllEvents: false,
      canExportData: false
    };
    setSettings(defaultSettings);
    setHasChanges(JSON.stringify(defaultSettings) !== JSON.stringify(team.settings));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Permissions de l'équipe "{team.name}"
          </h3>
          <p className="text-gray-600">
            Configurez les permissions accordées aux membres de cette équipe
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleResetToDefaults}
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Valeurs par défaut
          </Button>
          
          {hasChanges && (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                size="sm"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Permission Groups */}
      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <Card key={group.id} className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GroupIcon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-md font-semibold text-gray-900 mb-1">
                    {group.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {group.description}
                  </p>
                  
                  <div className="space-y-3">
                    {group.permissions.map((permission) => {
                      const isEnabled = settings[permission.key];
                      return (
                        <div key={permission.key} className="flex items-start space-x-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </label>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {permission.label}
                              </span>
                              <Badge 
                                variant={isEnabled ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {isEnabled ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Activé
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Désactivé
                                  </>
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Advanced Settings */}
      <Card className="p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Paramètres Avancés
        </h4>
        
        <div className="space-y-4">
          {/* Max Events Per Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre maximum d'événements par mois
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.maxEventsPerMonth || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : undefined;
                setSettings({ ...settings, maxEventsPerMonth: value });
                setHasChanges(true);
              }}
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Illimité"
            />
            <p className="text-sm text-gray-500 mt-1">
              Laissez vide pour aucune limite
            </p>
          </div>

          {/* Allowed Event Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Types d'événements autorisés
            </label>
            <div className="flex flex-wrap gap-2">
              {['meeting', 'training', 'conference', 'workshop', 'social'].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.allowedEventTypes?.includes(type) ?? true}
                    onChange={(e) => {
                      const currentTypes = settings.allowedEventTypes || [];
                      const newTypes = e.target.checked
                        ? [...currentTypes, type]
                        : currentTypes.filter(t => t !== type);
                      setSettings({ ...settings, allowedEventTypes: newTypes });
                      setHasChanges(true);
                    }}
                    className="mr-2"
                  />
                  <Badge variant="outline" className="text-xs">
                    {type}
                  </Badge>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Si aucun type n'est sélectionné, tous les types sont autorisés
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6 bg-blue-50">
        <h4 className="text-md font-semibold text-blue-900 mb-3">
          Résumé des Permissions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERMISSION_GROUPS.flatMap(group => group.permissions).map((permission) => {
            const isEnabled = settings[permission.key];
            return (
              <div key={permission.key} className="flex items-center space-x-2">
                {isEnabled ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-sm ${isEnabled ? 'text-green-800' : 'text-gray-600'}`}>
                  {permission.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};