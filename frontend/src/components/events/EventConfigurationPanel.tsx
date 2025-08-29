// src/components/events/EventConfigurationPanel.tsx - Panneau de configuration des événements

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Clock, 
  Shield, 
  Bell, 
  Users, 
  MapPin,
  Smartphone,
  Fingerprint,
  CreditCard,
  QrCode,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { toast } from 'react-toastify';

interface AttendanceMethod {
  type: 'qr_code' | 'manual' | 'biometric' | 'nfc' | 'geolocation';
  enabled: boolean;
  settings: Record<string, any>;
}

interface EventConfiguration {
  eventId: string;
  attendanceRules: {
    checkInWindow: {
      beforeStart: number; // minutes
      afterStart: number; // minutes
    };
    checkOutRequired: boolean;
    checkOutWindow: {
      beforeEnd: number; // minutes
      afterEnd: number; // minutes
    };
    lateArrivalTolerance: number; // minutes
    earlyDepartureTolerance: number; // minutes
    minimumAttendanceDuration: number; // minutes pour être considéré comme présent
    allowMultipleCheckIns: boolean;
  };
  attendanceMethods: AttendanceMethod[];
  geolocationSettings: {
    enabled: boolean;
    requiredRadius: number; // mètres
    coordinates: {
      latitude: number;
      longitude: number;
    };
    allowedDeviation: number; // mètres
  };
  notificationSettings: {
    reminderEnabled: boolean;
    reminderTimes: number[]; // minutes avant l'événement
    lateArrivalAlerts: boolean;
    capacityAlerts: boolean;
    capacityThreshold: number; // pourcentage
  };
  validationRules: {
    requireApproval: boolean;
    autoApproveRoles: string[];
    blacklistEnabled: boolean;
    whitelistEnabled: boolean;
    duplicateCheckEnabled: boolean;
  };
  customFields: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    required: boolean;
    options?: string[];
  }>;
}

interface EventConfigurationPanelProps {
  eventId: string;
  onSave: (config: EventConfiguration) => Promise<void>;
  onCancel: () => void;
}

const EventConfigurationPanel = ({
  eventId,
  onSave,
  onCancel
}: EventConfigurationPanelProps) => {
  const [config, setConfig] = useState<EventConfiguration>({
    eventId,
    attendanceRules: {
      checkInWindow: { beforeStart: 30, afterStart: 15 },
      checkOutRequired: false,
      checkOutWindow: { beforeEnd: 0, afterEnd: 30 },
      lateArrivalTolerance: 10,
      earlyDepartureTolerance: 15,
      minimumAttendanceDuration: 60,
      allowMultipleCheckIns: false
    },
    attendanceMethods: [
      { type: 'qr_code', enabled: true, settings: { refreshInterval: 300 } },
      { type: 'manual', enabled: true, settings: {} },
      { type: 'biometric', enabled: false, settings: { confidenceThreshold: 0.8 } },
      { type: 'nfc', enabled: false, settings: {} },
      { type: 'geolocation', enabled: false, settings: { accuracy: 50 } }
    ],
    geolocationSettings: {
      enabled: false,
      requiredRadius: 100,
      coordinates: { latitude: 0, longitude: 0 },
      allowedDeviation: 50
    },
    notificationSettings: {
      reminderEnabled: true,
      reminderTimes: [60, 15],
      lateArrivalAlerts: true,
      capacityAlerts: true,
      capacityThreshold: 90
    },
    validationRules: {
      requireApproval: false,
      autoApproveRoles: ['admin', 'organizer'],
      blacklistEnabled: false,
      whitelistEnabled: false,
      duplicateCheckEnabled: true
    },
    customFields: []
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, [eventId]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${eventId}/configuration`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(config);
      setHasChanges(false);
      toast.success('Configuration sauvegardée avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (hasChanges && !confirm('Êtes-vous sûr de vouloir annuler les modifications ?')) {
      return;
    }
    loadConfiguration();
    setHasChanges(false);
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
    setHasChanges(true);
  };

  const updateMethodSetting = (methodType: string, enabled: boolean, settings?: any) => {
    setConfig(prev => ({
      ...prev,
      attendanceMethods: prev.attendanceMethods.map(method =>
        method.type === methodType
          ? { ...method, enabled, settings: settings || method.settings }
          : method
      )
    }));
    setHasChanges(true);
  };

  const addCustomField = () => {
    setConfig(prev => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { name: '', type: 'text', required: false }
      ]
    }));
    setHasChanges(true);
  };

  const removeCustomField = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const getMethodIcon = (type: string) => {
    const icons = {
      qr_code: QrCode,
      manual: Users,
      biometric: Fingerprint,
      nfc: CreditCard,
      geolocation: MapPin
    };
    return icons[type as keyof typeof icons] || Settings;
  };

  const getMethodLabel = (type: string) => {
    const labels = {
      qr_code: 'QR Code',
      manual: 'Manuel',
      biometric: 'Biométrique',
      nfc: 'NFC',
      geolocation: 'Géolocalisation'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Configuration de l'événement
          </h2>
          <p className="text-muted-foreground">
            Configurez les règles de présence et les méthodes de validation
          </p>
        </div>
        
        <div className="flex space-x-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Modifications non sauvegardées
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="attendance">Présence</TabsTrigger>
          <TabsTrigger value="methods">Méthodes</TabsTrigger>
          <TabsTrigger value="location">Localisation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Fenêtres de check-in/check-out
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkInBefore">Check-in autorisé avant (minutes)</Label>
                  <Input
                    id="checkInBefore"
                    type="number"
                    value={config.attendanceRules.checkInWindow.beforeStart}
                    onChange={(e) => updateConfig('attendanceRules.checkInWindow.beforeStart', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="checkInAfter">Check-in autorisé après (minutes)</Label>
                  <Input
                    id="checkInAfter"
                    type="number"
                    value={config.attendanceRules.checkInWindow.afterStart}
                    onChange={(e) => updateConfig('attendanceRules.checkInWindow.afterStart', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="checkOutRequired"
                  checked={config.attendanceRules.checkOutRequired}
                  onCheckedChange={(checked) => updateConfig('attendanceRules.checkOutRequired', checked)}
                />
                <Label htmlFor="checkOutRequired">Check-out obligatoire</Label>
              </div>

              {config.attendanceRules.checkOutRequired && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="checkOutBefore">Check-out autorisé avant la fin (minutes)</Label>
                    <Input
                      id="checkOutBefore"
                      type="number"
                      value={config.attendanceRules.checkOutWindow.beforeEnd}
                      onChange={(e) => updateConfig('attendanceRules.checkOutWindow.beforeEnd', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkOutAfter">Check-out autorisé après la fin (minutes)</Label>
                    <Input
                      id="checkOutAfter"
                      type="number"
                      value={config.attendanceRules.checkOutWindow.afterEnd}
                      onChange={(e) => updateConfig('attendanceRules.checkOutWindow.afterEnd', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Règles de tolérance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lateTolerance">Tolérance retard (minutes)</Label>
                  <Input
                    id="lateTolerance"
                    type="number"
                    value={config.attendanceRules.lateArrivalTolerance}
                    onChange={(e) => updateConfig('attendanceRules.lateArrivalTolerance', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="earlyTolerance">Tolérance départ anticipé (minutes)</Label>
                  <Input
                    id="earlyTolerance"
                    type="number"
                    value={config.attendanceRules.earlyDepartureTolerance}
                    onChange={(e) => updateConfig('attendanceRules.earlyDepartureTolerance', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="minDuration">Durée minimale de présence (minutes)</Label>
                <Input
                  id="minDuration"
                  type="number"
                  value={config.attendanceRules.minimumAttendanceDuration}
                  onChange={(e) => updateConfig('attendanceRules.minimumAttendanceDuration', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Durée minimale pour être considéré comme présent
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="multipleCheckIns"
                  checked={config.attendanceRules.allowMultipleCheckIns}
                  onCheckedChange={(checked) => updateConfig('attendanceRules.allowMultipleCheckIns', checked)}
                />
                <Label htmlFor="multipleCheckIns">Autoriser plusieurs check-ins</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="w-5 h-5 mr-2" />
                Méthodes de présence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.attendanceMethods.map((method, index) => {
                const Icon = getMethodIcon(method.type);
                return (
                  <div key={method.type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{getMethodLabel(method.type)}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.enabled ? 'Activé' : 'Désactivé'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={method.enabled}
                        onCheckedChange={(checked) => updateMethodSetting(method.type, checked)}
                      />
                      
                      {method.type === 'qr_code' && method.enabled && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${method.type}-refresh`} className="text-sm">
                            Actualisation (sec):
                          </Label>
                          <Input
                            id={`${method.type}-refresh`}
                            type="number"
                            className="w-20"
                            value={method.settings.refreshInterval || 300}
                            onChange={(e) => updateMethodSetting(
                              method.type, 
                              method.enabled, 
                              { ...method.settings, refreshInterval: parseInt(e.target.value) }
                            )}
                          />
                        </div>
                      )}
                      
                      {method.type === 'biometric' && method.enabled && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${method.type}-confidence`} className="text-sm">
                            Seuil confiance:
                          </Label>
                          <Input
                            id={`${method.type}-confidence`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            className="w-20"
                            value={method.settings.confidenceThreshold || 0.8}
                            onChange={(e) => updateMethodSetting(
                              method.type, 
                              method.enabled, 
                              { ...method.settings, confidenceThreshold: parseFloat(e.target.value) }
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Géolocalisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="geoEnabled"
                  checked={config.geolocationSettings.enabled}
                  onCheckedChange={(checked) => updateConfig('geolocationSettings.enabled', checked)}
                />
                <Label htmlFor="geoEnabled">Activer la validation par géolocalisation</Label>
              </div>

              {config.geolocationSettings.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={config.geolocationSettings.coordinates.latitude}
                        onChange={(e) => updateConfig('geolocationSettings.coordinates.latitude', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={config.geolocationSettings.coordinates.longitude}
                        onChange={(e) => updateConfig('geolocationSettings.coordinates.longitude', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="radius">Rayon requis (mètres)</Label>
                      <Input
                        id="radius"
                        type="number"
                        value={config.geolocationSettings.requiredRadius}
                        onChange={(e) => updateConfig('geolocationSettings.requiredRadius', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deviation">Déviation autorisée (mètres)</Label>
                      <Input
                        id="deviation"
                        type="number"
                        value={config.geolocationSettings.allowedDeviation}
                        onChange={(e) => updateConfig('geolocationSettings.allowedDeviation', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Les participants devront être dans un rayon de {config.geolocationSettings.requiredRadius}m 
                      des coordonnées spécifiées pour pouvoir s'enregistrer.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notifications et alertes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="reminderEnabled"
                  checked={config.notificationSettings.reminderEnabled}
                  onCheckedChange={(checked) => updateConfig('notificationSettings.reminderEnabled', checked)}
                />
                <Label htmlFor="reminderEnabled">Activer les rappels automatiques</Label>
              </div>

              {config.notificationSettings.reminderEnabled && (
                <div>
                  <Label>Horaires des rappels (minutes avant l'événement)</Label>
                  <div className="flex space-x-2 mt-2">
                    {config.notificationSettings.reminderTimes.map((time, index) => (
                      <Input
                        key={index}
                        type="number"
                        className="w-20"
                        value={time}
                        onChange={(e) => {
                          const newTimes = [...config.notificationSettings.reminderTimes];
                          newTimes[index] = parseInt(e.target.value);
                          updateConfig('notificationSettings.reminderTimes', newTimes);
                        }}
                      />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newTimes = [...config.notificationSettings.reminderTimes, 30];
                        updateConfig('notificationSettings.reminderTimes', newTimes);
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="lateAlerts"
                  checked={config.notificationSettings.lateArrivalAlerts}
                  onCheckedChange={(checked) => updateConfig('notificationSettings.lateArrivalAlerts', checked)}
                />
                <Label htmlFor="lateAlerts">Alertes pour les retards</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="capacityAlerts"
                  checked={config.notificationSettings.capacityAlerts}
                  onCheckedChange={(checked) => updateConfig('notificationSettings.capacityAlerts', checked)}
                />
                <Label htmlFor="capacityAlerts">Alertes de capacité</Label>
              </div>

              {config.notificationSettings.capacityAlerts && (
                <div>
                  <Label htmlFor="capacityThreshold">Seuil d'alerte de capacité (%)</Label>
                  <Input
                    id="capacityThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={config.notificationSettings.capacityThreshold}
                    onChange={(e) => updateConfig('notificationSettings.capacityThreshold', parseInt(e.target.value))}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Règles de validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="requireApproval"
                  checked={config.validationRules.requireApproval}
                  onCheckedChange={(checked) => updateConfig('validationRules.requireApproval', checked)}
                />
                <Label htmlFor="requireApproval">Approbation manuelle requise</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="duplicateCheck"
                  checked={config.validationRules.duplicateCheckEnabled}
                  onCheckedChange={(checked) => updateConfig('validationRules.duplicateCheckEnabled', checked)}
                />
                <Label htmlFor="duplicateCheck">Vérification des doublons</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="blacklistEnabled"
                  checked={config.validationRules.blacklistEnabled}
                  onCheckedChange={(checked) => updateConfig('validationRules.blacklistEnabled', checked)}
                />
                <Label htmlFor="blacklistEnabled">Activer la liste noire</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="whitelistEnabled"
                  checked={config.validationRules.whitelistEnabled}
                  onCheckedChange={(checked) => updateConfig('validationRules.whitelistEnabled', checked)}
                />
                <Label htmlFor="whitelistEnabled">Activer la liste blanche</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button onClick={handleSave} disabled={loading || !hasChanges}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </Button>
      </div>
    </div>
  );
};

export default EventConfigurationPanel;