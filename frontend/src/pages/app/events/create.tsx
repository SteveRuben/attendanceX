import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Stepper, Step } from '@/components/ui/stepper';
import { Calendar, ArrowLeft, Loader2, MapPin, Clock, Users, Plus, X, Tag } from 'lucide-react';

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description: string;
}

interface EventFormData {
  // Step 1: Basic Info
  title: string;
  category: string;
  tags: string[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  
  // Step 2: Details
  description: string;
  isOnline: boolean;
  locationName: string;
  address: string;
  onlineUrl: string;
  
  // Step 3: Tickets
  isFree: boolean;
  ticketTypes: TicketType[];
  
  // Step 4: Settings
  visibility: 'public' | 'private';
  maxCapacity: string;
  manualApproval: boolean;
}

export default function CreateEventPage() {
  const router = useRouter();
  const { t } = useTranslation(['common']);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EventFormData>({
    // Step 1
    title: '',
    category: '',
    tags: [],
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    // Step 2
    description: '',
    isOnline: false,
    locationName: '',
    address: '',
    onlineUrl: '',
    // Step 3
    isFree: true,
    ticketTypes: [],
    // Step 4
    visibility: 'public',
    maxCapacity: '',
    manualApproval: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const steps: Step[] = [
    {
      id: 'basic-info',
      title: t('create_event.steps.basic_info'),
      description: t('create_event.basic_info.description'),
    },
    {
      id: 'details',
      title: t('create_event.steps.details'),
      description: t('create_event.details.description'),
    },
    {
      id: 'tickets',
      title: t('create_event.steps.tickets'),
      description: t('create_event.tickets.description'),
    },
    {
      id: 'settings',
      title: t('create_event.steps.settings'),
      description: t('create_event.settings.description'),
    },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      // Step 1: Basic Info
      if (!formData.title.trim()) {
        newErrors.title = t('create_event.validation.title_required');
      }
      if (!formData.category) {
        newErrors.category = t('create_event.validation.category_required');
      }
      if (!formData.startDate) {
        newErrors.startDate = t('create_event.validation.start_date_required');
      }
      if (!formData.startTime) {
        newErrors.startTime = t('create_event.validation.start_time_required');
      }
    } else if (step === 1) {
      // Step 2: Details
      if (!formData.description.trim()) {
        newErrors.description = t('create_event.validation.description_required');
      }
      if (!formData.isOnline && !formData.locationName.trim()) {
        newErrors.locationName = t('create_event.validation.location_required');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Redirect to dashboard
      router.push('/app/dashboard');
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        handleInputChange('tags', [...formData.tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange(
      'tags',
      formData.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleAddTicket = () => {
    const newTicket: TicketType = {
      id: `ticket-${Date.now()}`,
      name: '',
      price: 0,
      quantity: 0,
      description: '',
    };
    handleInputChange('ticketTypes', [...formData.ticketTypes, newTicket]);
  };

  const handleUpdateTicket = (id: string, field: keyof TicketType, value: any) => {
    handleInputChange(
      'ticketTypes',
      formData.ticketTypes.map((ticket) =>
        ticket.id === id ? { ...ticket, [field]: value } : ticket
      )
    );
  };

  const handleRemoveTicket = (id: string) => {
    handleInputChange(
      'ticketTypes',
      formData.ticketTypes.filter((ticket) => ticket.id !== id)
    );
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