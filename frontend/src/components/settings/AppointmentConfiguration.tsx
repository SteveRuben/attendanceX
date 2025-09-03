// src/components/settings/AppointmentConfiguration.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Clock, Plus, Trash2, Edit, Save, X, AlertCircle, Settings, Calendar, Users, Bell } from 'lucide-react';

interface WorkingHours {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

interface ServiceType {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  color: string;
  description?: string;
  enabled: boolean;
}

interface BookingRules {
  advanceBookingDays: number;
  cancellationHours: number;
  allowSameDayBooking: boolean;
  requireConfirmation: boolean;
  maxBookingsPerDay: number;
  bufferTimeBetweenAppointments: number; // in minutes
}

interface OrganizationSettings {
  workingHours: WorkingHours[];
  serviceTypes: ServiceType[];
  bookingRules: BookingRules;
  timezone: string;
  publicBookingEnabled: boolean;
  publicBookingUrl?: string;
}

const DAYS_OF_WEEK = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

const DEFAULT_WORKING_HOURS: WorkingHours[] = DAYS_OF_WEEK.map(day => ({
  day,
  enabled: day !== 'Samedi' && day !== 'Dimanche',
  startTime: '09:00',
  endTime: '17:00',
  breakStart: '12:00',
  breakEnd: '13:00'
}));

const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  {
    id: '1',
    name: 'Consultation standard',
    duration: 30,
    price: 50,
    color: '#3B82F6',
    description: 'Consultation de routine',
    enabled: true
  }
];

const DEFAULT_BOOKING_RULES: BookingRules = {
  advanceBookingDays: 30,
  cancellationHours: 24,
  allowSameDayBooking: false,
  requireConfirmation: true,
  maxBookingsPerDay: 20,
  bufferTimeBetweenAppointments: 15
};

const AppointmentConfiguration: React.FC = () => {
  const [settings, setSettings] = useState<OrganizationSettings>({
    workingHours: DEFAULT_WORKING_HOURS,
    serviceTypes: DEFAULT_SERVICE_TYPES,
    bookingRules: DEFAULT_BOOKING_RULES,
    timezone: 'Europe/Paris',
    publicBookingEnabled: true,
    publicBookingUrl: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [newService, setNewService] = useState<Partial<ServiceType>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await organizationService.getSettings();
      // setSettings(response.data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate public booking URL if enabled
      if (settings.publicBookingEnabled && !settings.publicBookingUrl) {
        setSettings(prev => ({
          ...prev,
          publicBookingUrl: `${window.location.origin}/booking/public`
        }));
      }
    } catch (err: any) {
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      // TODO: Replace with actual API call
      // await organizationService.updateSettings(settings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Paramètres sauvegardés avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingHours = (dayIndex: number, field: keyof WorkingHours, value: any) => {
    setSettings(prev => ({
      ...prev,
      workingHours: prev.workingHours.map((hours, index) =>
        index === dayIndex ? { ...hours, [field]: value } : hours
      )
    }));
  };

  const updateBookingRules = (field: keyof BookingRules, value: any) => {
    setSettings(prev => ({
      ...prev,
      bookingRules: { ...prev.bookingRules, [field]: value }
    }));
  };

  const addServiceType = () => {
    if (!newService.name || !newService.duration || !newService.price) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const service: ServiceType = {
      id: Date.now().toString(),
      name: newService.name,
      duration: newService.duration,
      price: newService.price,
      color: newService.color || '#3B82F6',
      description: newService.description || '',
      enabled: true
    };

    setSettings(prev => ({
      ...prev,
      serviceTypes: [...prev.serviceTypes, service]
    }));

    setNewService({});
    setError('');
  };

  const updateServiceType = (serviceId: string, updates: Partial<ServiceType>) => {
    setSettings(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.map(service =>
        service.id === serviceId ? { ...service, ...updates } : service
      )
    }));
  };

  const deleteServiceType = (serviceId: string) => {
    setSettings(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.filter(service => service.id !== serviceId)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration des rendez-vous</h1>
          <p className="text-gray-600">Gérez les paramètres de votre système de rendez-vous</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="flex items-center space-x-2">
          {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="working-hours" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="working-hours" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Horaires</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Services</span>
          </TabsTrigger>
          <TabsTrigger value="booking-rules" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Règles</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Général</span>
          </TabsTrigger>
        </TabsList>

        {/* Working Hours Tab */}
        <TabsContent value="working-hours">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Horaires de travail</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.workingHours.map((hours, index) => (
                <div key={hours.day} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-20">
                    <Label className="font-medium">{hours.day}</Label>
                  </div>
                  
                  <Switch
                    checked={hours.enabled}
                    onCheckedChange={(checked) => updateWorkingHours(index, 'enabled', checked)}
                  />
                  
                  {hours.enabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Début:</Label>
                        <Input
                          type="time"
                          value={hours.startTime}
                          onChange={(e) => updateWorkingHours(index, 'startTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Fin:</Label>
                        <Input
                          type="time"
                          value={hours.endTime}
                          onChange={(e) => updateWorkingHours(index, 'endTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm">Pause:</Label>
                        <Input
                          type="time"
                          value={hours.breakStart || ''}
                          onChange={(e) => updateWorkingHours(index, 'breakStart', e.target.value)}
                          className="w-32"
                          placeholder="Début"
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={hours.breakEnd || ''}
                          onChange={(e) => updateWorkingHours(index, 'breakEnd', e.target.value)}
                          className="w-32"
                          placeholder="Fin"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Ajouter un service</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Nom du service *</Label>
                    <Input
                      value={newService.name || ''}
                      onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Consultation"
                    />
                  </div>
                  <div>
                    <Label>Durée (minutes) *</Label>
                    <Input
                      type="number"
                      value={newService.duration || ''}
                      onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label>Prix (€) *</Label>
                    <Input
                      type="number"
                      value={newService.price || ''}
                      onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <Label>Couleur</Label>
                    <Input
                      type="color"
                      value={newService.color || '#3B82F6'}
                      onChange={(e) => setNewService(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Description</Label>
                  <Input
                    value={newService.description || ''}
                    onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description du service"
                  />
                </div>
                <Button onClick={addServiceType} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter le service
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Services existants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.serviceTypes.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: service.color }}
                        />
                        <div>
                          <h4 className="font-medium">{service.name}</h4>
                          <p className="text-sm text-gray-600">
                            {service.duration} min • {service.price}€
                          </p>
                          {service.description && (
                            <p className="text-sm text-gray-500">{service.description}</p>
                          )}
                        </div>
                        <Badge variant={service.enabled ? "default" : "secondary"}>
                          {service.enabled ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={service.enabled}
                          onCheckedChange={(checked) => updateServiceType(service.id, { enabled: checked })}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingService(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteServiceType(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Booking Rules Tab */}
        <TabsContent value="booking-rules">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Règles de réservation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Réservation à l'avance (jours)</Label>
                  <Input
                    type="number"
                    value={settings.bookingRules.advanceBookingDays}
                    onChange={(e) => updateBookingRules('advanceBookingDays', parseInt(e.target.value))}
                    min="1"
                    max="365"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Nombre maximum de jours à l'avance pour réserver
                  </p>
                </div>

                <div>
                  <Label>Délai d'annulation (heures)</Label>
                  <Input
                    type="number"
                    value={settings.bookingRules.cancellationHours}
                    onChange={(e) => updateBookingRules('cancellationHours', parseInt(e.target.value))}
                    min="1"
                    max="168"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Délai minimum avant le rendez-vous pour annuler
                  </p>
                </div>

                <div>
                  <Label>Rendez-vous maximum par jour</Label>
                  <Input
                    type="number"
                    value={settings.bookingRules.maxBookingsPerDay}
                    onChange={(e) => updateBookingRules('maxBookingsPerDay', parseInt(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <Label>Temps de battement (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.bookingRules.bufferTimeBetweenAppointments}
                    onChange={(e) => updateBookingRules('bufferTimeBetweenAppointments', parseInt(e.target.value))}
                    min="0"
                    max="60"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Temps libre entre deux rendez-vous
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autoriser les réservations le jour même</Label>
                    <p className="text-sm text-gray-600">
                      Permet aux clients de réserver des créneaux le jour même
                    </p>
                  </div>
                  <Switch
                    checked={settings.bookingRules.allowSameDayBooking}
                    onCheckedChange={(checked) => updateBookingRules('allowSameDayBooking', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Confirmation requise</Label>
                    <p className="text-sm text-gray-600">
                      Les rendez-vous doivent être confirmés manuellement
                    </p>
                  </div>
                  <Switch
                    checked={settings.bookingRules.requireConfirmation}
                    onCheckedChange={(checked) => updateBookingRules('requireConfirmation', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Paramètres généraux</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Fuseau horaire</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles (GMT-8)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Réservation publique activée</Label>
                    <p className="text-sm text-gray-600">
                      Permet aux clients de réserver en ligne sans compte
                    </p>
                  </div>
                  <Switch
                    checked={settings.publicBookingEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, publicBookingEnabled: checked }))}
                  />
                </div>

                {settings.publicBookingEnabled && (
                  <div>
                    <Label>URL de réservation publique</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={settings.publicBookingUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, publicBookingUrl: e.target.value }))}
                        placeholder="https://votre-site.com/booking"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (settings.publicBookingUrl) {
                            navigator.clipboard.writeText(settings.publicBookingUrl);
                            setSuccess('URL copiée dans le presse-papiers');
                            setTimeout(() => setSuccess(''), 2000);
                          }
                        }}
                      >
                        Copier
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Cette URL permet aux clients d'accéder à la page de réservation
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentConfiguration;