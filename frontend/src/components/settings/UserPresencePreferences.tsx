/**
 * Composant de préférences utilisateur pour la présence
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Separator,
  Slider,
  Input
} from '../components/ui';
import {
  User,
  Bell,
  Clock,
  MapPin,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserPreferences {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    clockInReminder: boolean;
    clockOutReminder: boolean;
    breakReminder: boolean;
    overtimeAlert: boolean;
    reminderTime: number;
  };
  privacy: {
    shareLocation: boolean;
    sharePresenceStatus: boolean;
    allowLocationHistory: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  mobile: {
    autoClockIn: boolean;
    autoClockOut: boolean;
    backgroundSync: boolean;
    offlineMode: boolean;
    vibration: boolean;
  };
}

interface UserPresencePreferencesProps {
  className?: string;
}

export const UserPresencePreferences: React.FC<UserPresencePreferencesProps> = ({
  className = ''
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: {
      push: true,
      email: false,
      sms: false,
      clockInReminder: true,
      clockOutReminder: true,
      breakReminder: true,
      overtimeAlert: true,
      reminderTime: 15
    },
    privacy: {
      shareLocation: true,
      sharePresenceStatus: true,
      allowLocationHistory: false
    },
    display: {
      theme: 'auto',
      language: 'fr',
      timezone: 'Europe/Paris',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    },
    mobile: {
      autoClockIn: false,
      autoClockOut: false,
      backgroundSync: true,
      offlineMode: true,
      vibration: true
    }
  });

  // Charger les préférences
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      // Simuler le chargement des préférences
      // const response = await fetch('/api/user/preferences');
      // const userPrefs = await response.json();
      // setPreferences(userPrefs);
    } catch (err) {
      setError('Erreur lors du chargement des préférences');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les préférences
  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Simuler la sauvegarde
      // const response = await fetch('/api/user/preferences', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(preferences)
      // });

      // if (!response.ok) throw new Error('Erreur de sauvegarde');

      setSuccess('Préférences sauvegardées avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde des préférences');
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour les préférences
  const updatePreferences = (section: keyof UserPreferences, field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Demander la permission pour les notifications
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updatePreferences('notifications', 'push', true);
        setSuccess('Notifications activées');
      } else {
        setError('Permission de notification refusée');
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <User className="h-6 w-6 mr-2" />
            Mes préférences
          </h2>
          <p className="text-muted-foreground">
            Personnalisez votre expérience de gestion de présence
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadPreferences}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            onClick={savePreferences}
            disabled={saving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Notifications push</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications sur cet appareil
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {!preferences.notifications.push && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNotificationPermission}
                  >
                    Activer
                  </Button>
                )}
                <Switch
                  checked={preferences.notifications.push}
                  onCheckedChange={(checked) => 
                    updatePreferences('notifications', 'push', checked)
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Notifications email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications par email
                </p>
              </div>
              <Switch
                checked={preferences.notifications.email}
                onCheckedChange={(checked) => 
                  updatePreferences('notifications', 'email', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Notifications SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir des notifications par SMS
                </p>
              </div>
              <Switch
                checked={preferences.notifications.sms}
                onCheckedChange={(checked) => 
                  updatePreferences('notifications', 'sms', checked)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Types de notifications</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rappel de pointage d'arrivée</Label>
                <Switch
                  checked={preferences.notifications.clockInReminder}
                  onCheckedChange={(checked) => 
                    updatePreferences('notifications', 'clockInReminder', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Rappel de pointage de départ</Label>
                <Switch
                  checked={preferences.notifications.clockOutReminder}
                  onCheckedChange={(checked) => 
                    updatePreferences('notifications', 'clockOutReminder', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Rappel de fin de pause</Label>
                <Switch
                  checked={preferences.notifications.breakReminder}
                  onCheckedChange={(checked) => 
                    updatePreferences('notifications', 'breakReminder', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Alerte heures supplémentaires</Label>
                <Switch
                  checked={preferences.notifications.overtimeAlert}
                  onCheckedChange={(checked) => 
                    updatePreferences('notifications', 'overtimeAlert', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Délai de rappel (minutes avant)</Label>
            <div className="flex items-center space-x-4">
              <Slider
                value={[preferences.notifications.reminderTime]}
                onValueChange={([value]) => 
                  updatePreferences('notifications', 'reminderTime', value)
                }
                max={60}
                min={5}
                step={5}
                className="flex-1"
              />
              <span className="w-16 text-sm font-medium">
                {preferences.notifications.reminderTime} min
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidentialité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Partager ma localisation</Label>
              <p className="text-sm text-muted-foreground">
                Permettre à l'application d'accéder à votre position
              </p>
            </div>
            <Switch
              checked={preferences.privacy.shareLocation}
              onCheckedChange={(checked) => 
                updatePreferences('privacy', 'shareLocation', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Partager mon statut de présence</Label>
              <p className="text-sm text-muted-foreground">
                Permettre aux collègues de voir votre statut
              </p>
            </div>
            <Switch
              checked={preferences.privacy.sharePresenceStatus}
              onCheckedChange={(checked) => 
                updatePreferences('privacy', 'sharePresenceStatus', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Conserver l'historique de localisation</Label>
              <p className="text-sm text-muted-foreground">
                Garder un historique de vos positions pour les rapports
              </p>
            </div>
            <Switch
              checked={preferences.privacy.allowLocationHistory}
              onCheckedChange={(checked) => 
                updatePreferences('privacy', 'allowLocationHistory', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Affichage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Affichage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Thème</Label>
              <Select
                value={preferences.display.theme}
                onValueChange={(value) => 
                  updatePreferences('display', 'theme', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="auto">Automatique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Langue</Label>
              <Select
                value={preferences.display.language}
                onValueChange={(value) => 
                  updatePreferences('display', 'language', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format de date</Label>
              <Select
                value={preferences.display.dateFormat}
                onValueChange={(value) => 
                  updatePreferences('display', 'dateFormat', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format d'heure</Label>
              <Select
                value={preferences.display.timeFormat}
                onValueChange={(value) => 
                  updatePreferences('display', 'timeFormat', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 heures</SelectItem>
                  <SelectItem value="12h">12 heures (AM/PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            Paramètres mobiles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Pointage automatique à l'arrivée</Label>
              <p className="text-sm text-muted-foreground">
                Pointer automatiquement en arrivant sur le lieu de travail
              </p>
            </div>
            <Switch
              checked={preferences.mobile.autoClockIn}
              onCheckedChange={(checked) => 
                updatePreferences('mobile', 'autoClockIn', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Pointage automatique au départ</Label>
              <p className="text-sm text-muted-foreground">
                Pointer automatiquement en quittant le lieu de travail
              </p>
            </div>
            <Switch
              checked={preferences.mobile.autoClockOut}
              onCheckedChange={(checked) => 
                updatePreferences('mobile', 'autoClockOut', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Synchronisation en arrière-plan</Label>
              <p className="text-sm text-muted-foreground">
                Synchroniser les données même quand l'app est fermée
              </p>
            </div>
            <Switch
              checked={preferences.mobile.backgroundSync}
              onCheckedChange={(checked) => 
                updatePreferences('mobile', 'backgroundSync', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Mode hors ligne</Label>
              <p className="text-sm text-muted-foreground">
                Permettre l'utilisation sans connexion internet
              </p>
            </div>
            <Switch
              checked={preferences.mobile.offlineMode}
              onCheckedChange={(checked) => 
                updatePreferences('mobile', 'offlineMode', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Vibrations</Label>
              <p className="text-sm text-muted-foreground">
                Activer les vibrations pour les notifications
              </p>
            </div>
            <Switch
              checked={preferences.mobile.vibration}
              onCheckedChange={(checked) => 
                updatePreferences('mobile', 'vibration', checked)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};