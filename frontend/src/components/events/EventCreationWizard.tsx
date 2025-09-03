import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Users, 
  QrCode, 
  Mail, 
  Clock,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  Send
} from 'lucide-react';
import { eventService } from '@/services/eventService';
import { invitationService } from '@/services/invitationService';
import { toast } from 'react-toastify';

interface EventData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    name: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
    virtualLink?: string;
  };
  capacity?: number;
  isPrivate: boolean;
  requiresRegistration: boolean;
  attendanceSettings: {
    requireQRCode: boolean;
    requireGeolocation: boolean;
    allowLateEntry: boolean;
    lateThresholdMinutes: number;
  };
}

interface InvitationData {
  method: 'email' | 'bulk' | 'public_link';
  emails?: string[];
  message?: string;
  sendReminders: boolean;
  reminderSchedule: {
    days: number[];
    hours: number[];
  };
}

const EventCreationWizard: React.FC<{
  onComplete: (eventId: string) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: {
      type: 'physical',
      name: ''
    },
    isPrivate: false,
    requiresRegistration: true,
    attendanceSettings: {
      requireQRCode: true,
      requireGeolocation: false,
      allowLateEntry: true,
      lateThresholdMinutes: 15
    }
  });
  const [invitationData, setInvitationData] = useState<InvitationData>({
    method: 'email',
    emails: [],
    sendReminders: true,
    reminderSchedule: {
      days: [7, 1], // 7 jours avant et 1 jour avant
      hours: [9] // 9h du matin
    }
  });
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const steps = [
    { id: 1, name: 'Détails', icon: Calendar },
    { id: 2, name: 'Lieu', icon: MapPin },
    { id: 3, name: 'Présence', icon: QrCode },
    { id: 4, name: 'Invitations', icon: Users },
    { id: 5, name: 'Confirmation', icon: CheckCircle }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setLoading(true);
      
      const response = await eventService.createEvent({
        ...eventData,
        startDateTime: `${eventData.startDate}T${eventData.startTime}`,
        endDateTime: `${eventData.endDate}T${eventData.endTime}`,
        type: 'meeting',
        status: 'scheduled'
      });

      if (response.success && response.data) {
        setCreatedEventId(response.data.id);
        toast.success('Événement créé avec succès !');
        handleNext();
      }
    } catch (error) {
      toast.error('Erreur lors de la création de l\'événement');
      console.error('Event creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!createdEventId) return;

    try {
      setLoading(true);

      if (invitationData.method === 'email' && invitationData.emails?.length) {
        // Envoyer invitations par email
        await eventService.bulkInviteParticipants(createdEventId, {
          emails: invitationData.emails,
          message: invitationData.message
        });

        // Programmer les rappels si activés
        if (invitationData.sendReminders) {
          await eventService.scheduleReminders(createdEventId, {
            schedule: invitationData.reminderSchedule
          });
        }
      }

      toast.success('Invitations envoyées avec succès !');
      onComplete(createdEventId);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi des invitations');
      console.error('Invitation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Détails de l'événement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titre de l'événement</label>
                <input
                  type="text"
                  value={eventData.title}
                  onChange={(e) => setEventData({...eventData, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Ex: Réunion équipe mensuelle"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Capacité (optionnel)</label>
                <input
                  type="number"
                  value={eventData.capacity || ''}
                  onChange={(e) => setEventData({...eventData, capacity: parseInt(e.target.value) || undefined})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Nombre maximum de participants"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={eventData.description}
                onChange={(e) => setEventData({...eventData, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Décrivez votre événement..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date de début</label>
                <input
                  type="date"
                  value={eventData.startDate}
                  onChange={(e) => setEventData({...eventData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Heure de début</label>
                <input
                  type="time"
                  value={eventData.startTime}
                  onChange={(e) => setEventData({...eventData, startTime: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date de fin</label>
                <input
                  type="date"
                  value={eventData.endDate}
                  onChange={(e) => setEventData({...eventData, endDate: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Heure de fin</label>
                <input
                  type="time"
                  value={eventData.endTime}
                  onChange={(e) => setEventData({...eventData, endTime: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventData.isPrivate}
                  onChange={(e) => setEventData({...eventData, isPrivate: e.target.checked})}
                  className="mr-2"
                />
                Événement privé
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventData.requiresRegistration}
                  onChange={(e) => setEventData({...eventData, requiresRegistration: e.target.checked})}
                  className="mr-2"
                />
                Inscription requise
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Lieu de l'événement</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Type de lieu</label>
              <div className="flex space-x-4">
                {['physical', 'virtual', 'hybrid'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="locationType"
                      value={type}
                      checked={eventData.location.type === type}
                      onChange={(e) => setEventData({
                        ...eventData,
                        location: {...eventData.location, type: e.target.value as any}
                      })}
                      className="mr-2"
                    />
                    {type === 'physical' ? 'Présentiel' : 
                     type === 'virtual' ? 'Virtuel' : 'Hybride'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nom du lieu</label>
              <input
                type="text"
                value={eventData.location.name}
                onChange={(e) => setEventData({
                  ...eventData,
                  location: {...eventData.location, name: e.target.value}
                })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Ex: Salle de conférence A, Zoom, Teams..."
              />
            </div>

            {eventData.location.type !== 'virtual' && (
              <div>
                <label className="block text-sm font-medium mb-2">Adresse</label>
                <textarea
                  value={eventData.location.address || ''}
                  onChange={(e) => setEventData({
                    ...eventData,
                    location: {...eventData.location, address: e.target.value}
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Adresse complète du lieu"
                />
              </div>
            )}

            {eventData.location.type !== 'physical' && (
              <div>
                <label className="block text-sm font-medium mb-2">Lien de connexion</label>
                <input
                  type="url"
                  value={eventData.location.virtualLink || ''}
                  onChange={(e) => setEventData({
                    ...eventData,
                    location: {...eventData.location, virtualLink: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://zoom.us/j/..."
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Paramètres de présence</h3>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventData.attendanceSettings.requireQRCode}
                  onChange={(e) => setEventData({
                    ...eventData,
                    attendanceSettings: {
                      ...eventData.attendanceSettings,
                      requireQRCode: e.target.checked
                    }
                  })}
                  className="mr-3"
                />
                <QrCode className="w-5 h-5 mr-2" />
                <div>
                  <span className="font-medium">Code QR requis</span>
                  <p className="text-sm text-muted-foreground">
                    Les participants devront scanner un QR code pour marquer leur présence
                  </p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventData.attendanceSettings.requireGeolocation}
                  onChange={(e) => setEventData({
                    ...eventData,
                    attendanceSettings: {
                      ...eventData.attendanceSettings,
                      requireGeolocation: e.target.checked
                    }
                  })}
                  className="mr-3"
                />
                <MapPin className="w-5 h-5 mr-2" />
                <div>
                  <span className="font-medium">Géolocalisation requise</span>
                  <p className="text-sm text-muted-foreground">
                    Vérifier que les participants sont au bon endroit
                  </p>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={eventData.attendanceSettings.allowLateEntry}
                  onChange={(e) => setEventData({
                    ...eventData,
                    attendanceSettings: {
                      ...eventData.attendanceSettings,
                      allowLateEntry: e.target.checked
                    }
                  })}
                  className="mr-3"
                />
                <Clock className="w-5 h-5 mr-2" />
                <div>
                  <span className="font-medium">Autoriser les retards</span>
                  <p className="text-sm text-muted-foreground">
                    Permettre aux participants d'arriver en retard
                  </p>
                </div>
              </label>

              {eventData.attendanceSettings.allowLateEntry && (
                <div className="ml-10">
                  <label className="block text-sm font-medium mb-2">
                    Seuil de retard (minutes)
                  </label>
                  <input
                    type="number"
                    value={eventData.attendanceSettings.lateThresholdMinutes}
                    onChange={(e) => setEventData({
                      ...eventData,
                      attendanceSettings: {
                        ...eventData.attendanceSettings,
                        lateThresholdMinutes: parseInt(e.target.value) || 15
                      }
                    })}
                    className="w-32 px-3 py-2 border rounded-md"
                    min="1"
                    max="120"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Invitations</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Méthode d'invitation</label>
              <div className="flex space-x-4">
                {[
                  { value: 'email', label: 'Emails individuels', icon: Mail },
                  { value: 'bulk', label: 'Import en masse', icon: Users },
                  { value: 'public_link', label: 'Lien public', icon: QrCode }
                ].map((method) => (
                  <label key={method.value} className="flex items-center">
                    <input
                      type="radio"
                      name="invitationMethod"
                      value={method.value}
                      checked={invitationData.method === method.value}
                      onChange={(e) => setInvitationData({
                        ...invitationData,
                        method: e.target.value as any
                      })}
                      className="mr-2"
                    />
                    <method.icon className="w-4 h-4 mr-1" />
                    {method.label}
                  </label>
                ))}
              </div>
            </div>

            {invitationData.method === 'email' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Adresses email (une par ligne)
                </label>
                <textarea
                  value={invitationData.emails?.join('\n') || ''}
                  onChange={(e) => setInvitationData({
                    ...invitationData,
                    emails: e.target.value.split('\n').filter(email => email.trim())
                  })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="participant1@example.com&#10;participant2@example.com"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {invitationData.emails?.length || 0} email(s) ajouté(s)
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Message personnalisé</label>
              <textarea
                value={invitationData.message || ''}
                onChange={(e) => setInvitationData({
                  ...invitationData,
                  message: e.target.value
                })}
                rows={4}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Message d'invitation personnalisé..."
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={invitationData.sendReminders}
                  onChange={(e) => setInvitationData({
                    ...invitationData,
                    sendReminders: e.target.checked
                  })}
                  className="mr-2"
                />
                Envoyer des rappels automatiques
              </label>
              
              {invitationData.sendReminders && (
                <div className="mt-4 ml-6 space-y-2">
                  <p className="text-sm font-medium">Rappels programmés :</p>
                  <div className="flex flex-wrap gap-2">
                    {invitationData.reminderSchedule.days.map((days) => (
                      <Badge key={days} variant="secondary">
                        {days === 1 ? 'Veille' : `${days} jours avant`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Confirmation</h3>
            
            <Card className="p-6 bg-green-50">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                <span className="font-semibold text-green-800">Événement prêt à être créé</span>
              </div>
              
              <div className="space-y-3 text-sm">
                <div><strong>Titre :</strong> {eventData.title}</div>
                <div><strong>Date :</strong> {eventData.startDate} de {eventData.startTime} à {eventData.endTime}</div>
                <div><strong>Lieu :</strong> {eventData.location.name} ({eventData.location.type})</div>
                <div><strong>Capacité :</strong> {eventData.capacity || 'Illimitée'}</div>
                <div><strong>QR Code :</strong> {eventData.attendanceSettings.requireQRCode ? 'Requis' : 'Optionnel'}</div>
                <div><strong>Géolocalisation :</strong> {eventData.attendanceSettings.requireGeolocation ? 'Requise' : 'Optionnelle'}</div>
                {invitationData.emails?.length && (
                  <div><strong>Invitations :</strong> {invitationData.emails.length} participant(s)</div>
                )}
              </div>
            </Card>

            {createdEventId && (
              <Card className="p-6 bg-blue-50">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-800">Événement créé avec succès !</span>
                </div>
                <p className="text-sm text-blue-700 mb-4">
                  Votre événement a été créé. Vous pouvez maintenant envoyer les invitations.
                </p>
                <Button onClick={handleSendInvitations} disabled={loading} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Envoi en cours...' : 'Envoyer les invitations'}
                </Button>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              currentStep >= step.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {currentStep > step.id ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-8">
        {renderStepContent()}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
        </div>
        
        <div className="flex space-x-4">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          
          {currentStep < 4 && (
            <Button onClick={handleNext}>
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 4 && !createdEventId && (
            <Button onClick={handleCreateEvent} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Création...' : 'Créer l\'événement'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCreationWizard;