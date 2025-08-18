/**
 * Interface de paramètres pour la gestion de présence
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Separator,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Slider
} from '@/components/ui';
import {
  Settings,
  Clock,
  MapPin,
  Bell,
  Shield,
  Users,
  Calendar,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from '@/utils/dateUtils';

interface WorkingHours {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakDuration: number;
}

interface GeolocationSettings {
  enabled: boolean;
  radius: number;
  locations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
  }>;
}

interface NotificationSettings {
  clockInReminder: boolean;
  clockOutReminder: boolean;
  breakReminder: boolean;
  overtimeAlert: boolean;
  lateArrivalAlert: boolean;
  earlyDepartureAlert: boolean;
  reminderTime: number; // minutes before
}

interface PresenceRules {
  maxWorkHoursPerDay: number;
  maxWorkHoursPerWeek: number;
  minBreakDuration: number;
  maxBreakDuration: number;
  lateThreshold: number; // minutes
  earlyLeaveThreshold: number; // minutes
  overtimeThreshold: number; // minutes
  allowFlexibleHours: boolean;
  requireGeolocation: boolean;
  allowManualCorrections: boolean;
}

export const PresenceSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États des paramètres
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: 'Lundi', enabled: true, startTime: '09:00', endTime: '17:00', breakDuration: 60 },
    { day: 'Mardi', enabled: true, startTime: '09:00', endTime: '17:00', breakDuration: 60 },
    { day: 'Mercredi', enabled: true, startTime: '09:00', endTime: '17:00', breakDuration: 60 },
    { day: 'Jeudi', enabled: true, startTime: '09:00', endTime: '17:00', breakDuration: 60 },
    { day: 'Vendredi', enabled: true, startTime: '09:00', endTime: '17:00', breakDuration: 60 },
    { day: 'Samedi', enabled: false, startTime: '09:00', endTime: '12:00', breakDuration: 0 },
    { day: 'Dimanche', enabled: false, startTime: '09:00', endTime: '12:00', breakDuration: 0 }
  ]);

  const [geolocationSettings, setGeolocationSettings] = useState<GeolocationSettings>({
    enabled: true,
    radius: 100,
    locations: []
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    clockInReminder: true,
    clockOutReminder: true,
    breakReminder: true,
    overtimeAlert: true,
    lateArrivalAlert: true,
    earlyDepartureAlert: true,
    reminderTime: 15
  });

  const [presenceRules, setPresenceRules] = useState<PresenceRules>({
    maxWorkHoursPerDay: 8,
    maxWorkHoursPerWeek: 40,
    minBreakDuration: 30,
    maxBreakDuration: 120,
    lateThreshold: 15,
    earlyLeaveThreshold: 15,
    overtimeThreshold: 30,
    allowFlexibleHours: false,
    requireGeolocation: true,
    allowManualCorrections: false
  });

  const [newLocation, setNewLocation] = useState({
    name: '',
    latitude: 0,
    longitude: 0,
    radius: 50
  });

  const [locationDialog, setLocationDialog] = useState(false);

  // Charger les paramètres
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Simuler le chargement des paramètres
      // const response = await fetch('/api/presence/settings');
      // const settings = await response.json();
      // setWorkingHours(settings.workingHours);
      // setGeolocationSettings(settings.geolocation);
      // setNotificationSettings(settings.notifications);
      // setPresenceRules(settings.rules);
    } catch (err) {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les paramètres
  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const settings = {
        workingHours,
        geolocation: geolocationSettings,
        notifications: notificationSettings,
        rules: presenceRules
      };

      // Simuler la sauvegarde
      // const response = await fetch('/api/presence/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // });

      // if (!response.ok) throw new Error('Erreur de sauvegarde');

      setSuccess('Paramètres sauvegardés avec succès');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour les horaires de travail
  const updateWorkingHours = (index: number, field: keyof WorkingHours, value: any) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setWorkingHours(updated);
  };

  // Ajouter une nouvelle localisation
  const addLocation = () => {
    if (!newLocation.name.trim()) return;

    const location = {
      id: Date.now().toString(),
      ...newLocation
    };

    setGeolocationSettings(prev => ({
      ...prev,
      locations: [...prev.locations, location]
    }));

    setNewLocation({ name: '', latitude: 0, longitude: 0, radius: 50 });
    setLocationDialog(false);
  };

  // Supprimer une localisation
  const removeLocation = (locationId: string) => {
    setGeolocationSettings(prev => ({
      ...prev,
      locations: prev.locations.filter(loc => loc.id !== locationId)
    }));
  };

  // Obtenir la position actuelle
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewLocation(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          setError('Impossible d\'obtenir la position actuelle');
        }
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Settings className="h-8 w-8 mr-3" />
            Paramètres de présence
          </h1>
          <p className="text-muted-foreground">
            Configurez les règles et paramètres de gestion de présence
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={loadSettings}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
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

      {/* Onglets de paramètres */}
      <Tabs defaultValue="working-hours" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="working-hours" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Horaires
          </TabsTrigger>
          <TabsTrigger value="geolocation" className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            Géolocalisation
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Règles
          </TabsTrigger>
        </TabsList>

        {/* Onglet Horaires de travail */}
        <TabsContent value="working-hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Horaires de travail par défaut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workingHours.map((day, index) => (
                <div key={day.day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-24">
                    <Label className="font-medium">{day.day}</Label>
                  </div>
                  
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(checked) => updateWorkingHours(index, 'enabled', checked)}
                  />
                  
                  {day.enabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">De</Label>
                        <Input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => updateWorkingHours(index, 'startTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">À</Label>
                        <Input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => updateWorkingHours(index, 'endTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Pause (min)</Label>
                        <Input
                          type="number"
                          value={day.breakDuration}
                          onChange={(e) => updateWorkingHours(index, 'breakDuration', parseInt(e.target.value))}
                          className="w-20"
                          min="0"
                          max="240"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Géolocalisation */}
        <TabsContent value="geolocation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Paramètres de géolocalisation
                <Switch
                  checked={geolocationSettings.enabled}
                  onCheckedChange={(checked) => 
                    setGeolocationSettings(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {geolocationSettings.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Rayon de tolérance par défaut (mètres)</Label>
                    <div className="flex items-center space-x-4">
                      <Slider
                        value={[geolocationSettings.radius]}
                        onValueChange={([value]) => 
                          setGeolocationSettings(prev => ({ ...prev, radius: value }))
                        }
                        max={500}
                        min={10}
                        step={10}
                        className="flex-1"
                      />
                      <span className="w-16 text-sm font-medium">
                        {geolocationSettings.radius}m
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Lieux de travail autorisés</h3>
                      <Dialog open={locationDialog} onOpenChange={setLocationDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un lieu
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajouter un lieu de travail</DialogTitle>
                            <DialogDescription>
                              Définissez un nouveau lieu où les employés peuvent pointer
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Nom du lieu</Label>
                              <Input
                                value={newLocation.name}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Bureau principal, Entrepôt..."
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Latitude</Label>
                                <Input
                                  type="number"
                                  step="0.000001"
                                  value={newLocation.latitude}
                                  onChange={(e) => setNewLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                                />
                              </div>
                              <div>
                                <Label>Longitude</Label>
                                <Input
                                  type="number"
                                  step="0.000001"
                                  value={newLocation.longitude}
                                  onChange={(e) => setNewLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Rayon (mètres)</Label>
                              <Input
                                type="number"
                                value={newLocation.radius}
                                onChange={(e) => setNewLocation(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                                min="10"
                                max="500"
                              />
                            </div>
                            <Button
                              variant="outline"
                              onClick={getCurrentLocation}
                              className="w-full"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              Utiliser ma position actuelle
                            </Button>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setLocationDialog(false)}>
                              Annuler
                            </Button>
                            <Button onClick={addLocation} disabled={!newLocation.name.trim()}>
                              Ajouter
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      {geolocationSettings.locations.map((location) => (
                        <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <div className="font-medium">{location.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)} (±{location.radius}m)
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLocation(location.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {geolocationSettings.locations.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <MapPin className="h-8 w-8 mx-auto mb-2" />
                          <p>Aucun lieu de travail configuré</p>
                          <p className="text-sm">Ajoutez des lieux pour restreindre le pointage</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Rappel de pointage d'arrivée</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier les employés qui n'ont pas pointé leur arrivée
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.clockInReminder}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, clockInReminder: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Rappel de pointage de départ</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier les employés de pointer leur départ
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.clockOutReminder}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, clockOutReminder: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Rappel de fin de pause</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier les employés en pause prolongée
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.breakReminder}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, breakReminder: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Alerte heures supplémentaires</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier en cas de dépassement d'horaires
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.overtimeAlert}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, overtimeAlert: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Alerte retard</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier les managers en cas de retard
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.lateArrivalAlert}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, lateArrivalAlert: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Alerte départ anticipé</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier les managers en cas de départ anticipé
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.earlyDepartureAlert}
                    onCheckedChange={(checked) => 
                      setNotificationSettings(prev => ({ ...prev, earlyDepartureAlert: checked }))
                    }
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Délai de rappel (minutes avant l'heure prévue)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    value={[notificationSettings.reminderTime]}
                    onValueChange={([value]) => 
                      setNotificationSettings(prev => ({ ...prev, reminderTime: value }))
                    }
                    max={60}
                    min={5}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-16 text-sm font-medium">
                    {notificationSettings.reminderTime} min
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Règles */}
        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Règles de présence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Heures de travail max par jour</Label>
                  <Input
                    type="number"
                    value={presenceRules.maxWorkHoursPerDay}
                    onChange={(e) => setPresenceRules(prev => ({ 
                      ...prev, 
                      maxWorkHoursPerDay: parseInt(e.target.value) 
                    }))}
                    min="1"
                    max="24"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Heures de travail max par semaine</Label>
                  <Input
                    type="number"
                    value={presenceRules.maxWorkHoursPerWeek}
                    onChange={(e) => setPresenceRules(prev => ({ 
                      ...prev, 
                      maxWorkHoursPerWeek: parseInt(e.target.value) 
                    }))}
                    min="1"
                    max="168"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Durée de pause min (minutes)</Label>
                  <Input
                    type="number"
                    value={presenceRules.minBreakDuration}
                    onChange={(e) => setPresenceRules(prev => ({ 
                      ...prev, 
                      minBreakDuration: parseInt(e.target.value) 
                    }))}
                    min="0"
                    max="240"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Durée de pause max (minutes)</Label>
                  <Input
                    type="number"
                    value={presenceRules.maxBreakDuration}
                    onChange={(e) => setPresenceRules(prev => ({ 
                      ...prev, 
                      maxBreakDuration: parseInt(e.target.value) 
                    }))}
                    min="0"
                    max="480"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Seuil de retard (minutes)</Label>
                  <Input
                    type="number"
                    value={presenceRules.lateThreshold}
                    onChange={(e) => setPresenceRules(prev => ({ 
                      ...prev, 
                      lateThreshold: parseInt(e.target.value) 
                    }))}
                    min="1"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Seuil départ anticipé (minutes)</Label>
                  <Input
                    type="number"
                    value={presenceRules.earlyLeaveThreshold}
                    onChange={(e) => setPresenceRules(prev => ({ 
                      ...prev, 
                      earlyLeaveThreshold: parseInt(e.target.value) 
                    }))}
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Autoriser les horaires flexibles</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre aux employés de modifier leurs horaires
                    </p>
                  </div>
                  <Switch
                    checked={presenceRules.allowFlexibleHours}
                    onCheckedChange={(checked) => 
                      setPresenceRules(prev => ({ ...prev, allowFlexibleHours: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Géolocalisation obligatoire</Label>
                    <p className="text-sm text-muted-foreground">
                      Exiger la géolocalisation pour pointer
                    </p>
                  </div>
                  <Switch
                    checked={presenceRules.requireGeolocation}
                    onCheckedChange={(checked) => 
                      setPresenceRules(prev => ({ ...prev, requireGeolocation: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Corrections manuelles autorisées</Label>
                    <p className="text-sm text-muted-foreground">
                      Permettre aux managers de corriger les pointages
                    </p>
                  </div>
                  <Switch
                    checked={presenceRules.allowManualCorrections}
                    onCheckedChange={(checked) => 
                      setPresenceRules(prev => ({ ...prev, allowManualCorrections: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};