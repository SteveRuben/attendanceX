import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sliders, 
  Globe, 
  Clock, 
  Palette, 
  Monitor,
  Sun,
  Moon,
  Save,
  Timer,
  Loader2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { UserPreferencesUpdate } from '@/services/userPreferencesService';

export default function PreferencesPage() {
  const { 
    preferences, 
    options, 
    loading, 
    error, 
    updating, 
    updatePreferences, 
    resetPreferences 
  } = useUserPreferences();

  const [formData, setFormData] = useState({
    language: 'fr-FR',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    theme: 'system' as 'light' | 'dark' | 'system',
    gracePeriod: 15,
    autoCheckOut: false,
    emailNotifications: true,
    pushNotifications: false,
    soundNotifications: false,
    weekStartsOn: 'monday' as 'monday' | 'sunday'
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when preferences load
  useEffect(() => {
    if (preferences) {
      const newFormData = {
        language: preferences.language,
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat,
        timeFormat: preferences.timeFormat,
        theme: preferences.theme,
        gracePeriod: preferences.gracePeriod,
        autoCheckOut: preferences.autoCheckOut,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        soundNotifications: preferences.soundNotifications,
        weekStartsOn: preferences.weekStartsOn
      };
      setFormData(newFormData);
    }
  }, [preferences]);

  const handlePreferenceChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSavePreferences = async () => {
    if (!hasChanges) return;

    try {
      await updatePreferences(formData);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleResetPreferences = async () => {
    try {
      await resetPreferences();
      setHasChanges(false);
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  };

  const handleCancelChanges = () => {
    if (preferences) {
      setFormData({
        language: preferences.language,
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat,
        timeFormat: preferences.timeFormat,
        theme: preferences.theme,
        gracePeriod: preferences.gracePeriod,
        autoCheckOut: preferences.autoCheckOut,
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        soundNotifications: preferences.soundNotifications,
        weekStartsOn: preferences.weekStartsOn
      });
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Préférences">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Préférences">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Sliders className="h-6 w-6" />
                Préférences
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Personnalisez votre expérience utilisateur
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Préférences Régionales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Préférences Régionales
              </CardTitle>
              <CardDescription>
                Configuration de la langue, timezone et formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Langue</Label>
                  <select 
                    id="language" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    disabled={updating}
                  >
                    {options?.languages.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select 
                    id="timezone" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                    disabled={updating}
                  >
                    {options?.timezones.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Format de date</Label>
                  <select 
                    id="dateFormat" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                    disabled={updating}
                  >
                    {options?.dateFormats.map(format => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Format d'heure</Label>
                  <select 
                    id="timeFormat" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.timeFormat}
                    onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
                    disabled={updating}
                  >
                    {options?.timeFormats.map(format => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekStartsOn">Début de semaine</Label>
                  <select 
                    id="weekStartsOn" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.weekStartsOn}
                    onChange={(e) => handlePreferenceChange('weekStartsOn', e.target.value)}
                    disabled={updating}
                  >
                    <option value="monday">Lundi</option>
                    <option value="sunday">Dimanche</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apparence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apparence
              </CardTitle>
              <CardDescription>
                Personnalisez l'apparence de l'interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Thème</Label>
                <div className="flex gap-4">
                  <button
                    onClick={() => handlePreferenceChange('theme', 'light')}
                    disabled={updating}
                    className={`flex items-center gap-2 p-3 border rounded-lg ${
                      formData.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Sun className="h-5 w-5" />
                    <span>Clair</span>
                  </button>
                  <button
                    onClick={() => handlePreferenceChange('theme', 'dark')}
                    disabled={updating}
                    className={`flex items-center gap-2 p-3 border rounded-lg ${
                      formData.theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Moon className="h-5 w-5" />
                    <span>Sombre</span>
                  </button>
                  <button
                    onClick={() => handlePreferenceChange('theme', 'system')}
                    disabled={updating}
                    className={`flex items-center gap-2 p-3 border rounded-lg ${
                      formData.theme === 'system' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Monitor className="h-5 w-5" />
                    <span>Système</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Préférences de Présence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Préférences de Présence
              </CardTitle>
              <CardDescription>
                Configuration personnelle pour le suivi de présence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Période de grâce personnelle (minutes)</Label>
                <select 
                  id="gracePeriod" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.gracePeriod}
                  onChange={(e) => handlePreferenceChange('gracePeriod', Number(e.target.value))}
                  disabled={updating}
                >
                  <option value={0}>Aucune période de grâce</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Cette préférence s'applique uniquement si autorisée par votre organisation
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="autoCheckOut" 
                    className="rounded"
                    checked={formData.autoCheckOut}
                    onChange={(e) => handlePreferenceChange('autoCheckOut', e.target.checked)}
                    disabled={updating}
                  />
                  <Label htmlFor="autoCheckOut">Check-out automatique en fin de journée</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Vous serez automatiquement déconnecté à l'heure de fin de travail
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="emailNotifications" 
                    className="rounded"
                    checked={formData.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                    disabled={updating}
                  />
                  <Label htmlFor="emailNotifications">Notifications par email</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="pushNotifications" 
                    className="rounded"
                    checked={formData.pushNotifications}
                    onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                    disabled={updating}
                  />
                  <Label htmlFor="pushNotifications">Notifications push</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="soundNotifications" 
                    className="rounded"
                    checked={formData.soundNotifications}
                    onChange={(e) => handlePreferenceChange('soundNotifications', e.target.checked)}
                    disabled={updating}
                  />
                  <Label htmlFor="soundNotifications">Notifications sonores</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleResetPreferences}
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réinitialiser
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancelChanges}
              disabled={!hasChanges || updating}
            >
              Annuler les modifications
            </Button>
            <Button 
              onClick={handleSavePreferences}
              disabled={!hasChanges || updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder les préférences
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}