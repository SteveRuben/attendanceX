import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, ArrowLeft, Loader2, MapPin, Clock, Users } from 'lucide-react';

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  maxAttendees: string;
  isRecurring: boolean;
  registrationRequired: boolean;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    address: '',
    maxAttendees: '',
    isRecurring: false,
    registrationRequired: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre de l\'événement est requis';
    }

    if (!formData.date) {
      newErrors.date = 'La date est requise';
    }

    if (!formData.time) {
      newErrors.time = 'L\'heure est requise';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Le lieu est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simuler la création de l'événement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Rediriger vers l'événement créé
      const eventId = 'new-event-' + Date.now();
      router.push(`/app/events/${eventId}`);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AppShell title="Créer un Événement">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Calendar className="h-6 w-6" />
                Créer un Nouvel Événement
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Organisez votre événement et gérez les inscriptions
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} data-cy="event-form">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulaire Principal */}
              <div className="lg:col-span-2 space-y-6">
                {/* Informations de Base */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informations de Base</CardTitle>
                    <CardDescription>
                      Définissez les informations principales de votre événement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Titre de l'Événement *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Ex: Conférence Tech 2024"
                        data-cy="event-title-input"
                      />
                      {errors.title && (
                        <p className="text-sm text-destructive" data-cy="title-error">
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Décrivez votre événement..."
                        rows={4}
                        data-cy="event-description-input"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Date et Heure */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Date et Heure
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleInputChange('date', e.target.value)}
                          data-cy="event-date-input"
                        />
                        {errors.date && (
                          <p className="text-sm text-destructive" data-cy="date-error">
                            {errors.date}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time">Heure *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleInputChange('time', e.target.value)}
                          data-cy="event-time-input"
                        />
                        {errors.time && (
                          <p className="text-sm text-destructive" data-cy="time-error">
                            {errors.time}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recurring"
                        checked={formData.isRecurring}
                        onCheckedChange={(checked) => handleInputChange('isRecurring', checked)}
                        data-cy="recurring-toggle"
                      />
                      <Label htmlFor="recurring">Événement récurrent</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Lieu */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Lieu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Nom du Lieu *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Ex: Centre de Conférences"
                        data-cy="event-location-input"
                      />
                      {errors.location && (
                        <p className="text-sm text-destructive" data-cy="location-error">
                          {errors.location}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Adresse Complète</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="123 Rue de la Paix, 75001 Paris"
                        data-cy="event-address-input"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Paramètres */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Paramètres
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxAttendees">Nombre Maximum de Participants</Label>
                      <Input
                        id="maxAttendees"
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => handleInputChange('maxAttendees', e.target.value)}
                        placeholder="Ex: 100"
                        min="1"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="registration"
                        checked={formData.registrationRequired}
                        onCheckedChange={(checked) => handleInputChange('registrationRequired', checked)}
                      />
                      <Label htmlFor="registration">Inscription requise</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-cy="create-event-button"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      'Créer l\'Événement'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}