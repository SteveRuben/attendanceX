import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Sliders, 
  Globe, 
  Clock, 
  Palette, 
  Monitor,
  Sun,
  Moon,
  Save,
  Timer
} from 'lucide-react';

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState({
    language: 'fr-FR',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    theme: 'system',
    gracePeriod: 15,
    autoCheckOut: false,
    emailNotifications: true,
    pushNotifications: false,
    soundNotifications: false,
    weekStartsOn: 'monday'
  });

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePreferences = () => {
    // Logique de sauvegarde des préférences
    console.log('Saving preferences:', preferences);
  };

  const languages = [
    { value: 'fr-FR', label: 'Français (France)' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'es-ES', label: 'Español' },
    { value: 'it-IT', label: 'Italiano' }
  ];

  const timezones = [
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'UTC', label: 'UTC' }
  ];

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
                    value={preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select 
                    id="timezone" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={preferences.timezone}
                    onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                  >
                    {timezones.map(tz => (
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
                    value={preferences.dateFormat}
                    onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Format d'heure</Label>
                  <select 
                    id="timeFormat" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={preferences.timeFormat}
                    onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
                  >
                    <option value="HH:mm">24h (HH:mm)</option>
                    <option value="hh:mm A">12h (hh:mm AM/PM)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekStartsOn">Début de semaine</Label>
                  <select 
                    id="weekStartsOn" 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={preferences.weekStartsOn}
                    onChange={(e) => handlePreferenceChange('weekStartsOn', e.target.value)}
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
                    className={`flex items-center gap-2 p-3 border rounded-lg ${
                      preferences.theme === 'light' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                    <span>Clair</span>
                  </button>
                  <button
                    onClick={() => handlePreferenceChange('theme', 'dark')}
                    className={`flex items-center gap-2 p-3 border rounded-lg ${
                      preferences.theme === 'dark' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    <Moon className="h-5 w-5" />
                    <span>Sombre</span>
                  </button>
                  <button
                    onClick={() => handlePreferenceChange('theme', 'system')}
                    className={`flex items-center gap-2 p-3 border rounded-lg ${
                      preferences.theme === 'system' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
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
                  value={preferences.gracePeriod}
                  onChange={(e) => handlePreferenceChange('gracePeriod', Number(e.target.value))}
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
                    checked={preferences.autoCheckOut}
                    onChange={(e) => handlePreferenceChange('autoCheckOut', e.target.checked)}
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
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  />
                  <Label htmlFor="emailNotifications">Notifications par email</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="pushNotifications" 
                    className="rounded"
                    checked={preferences.pushNotifications}
                    onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                  />
                  <Label htmlFor="pushNotifications">Notifications push</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="soundNotifications" 
                    className="rounded"
                    checked={preferences.soundNotifications}
                    onChange={(e) => handlePreferenceChange('soundNotifications', e.target.checked)}
                  />
                  <Label htmlFor="soundNotifications">Notifications sonores</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              Réinitialiser
            </Button>
            <Button onClick={handleSavePreferences}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les préférences
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}