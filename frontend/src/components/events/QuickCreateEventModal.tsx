import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, MapPin, Loader2, Sparkles, Video, Coffee, Briefcase, Heart } from 'lucide-react';
import { useRouter } from 'next/router';
import { eventsService } from '@/services/eventsService';

interface QuickCreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EventTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultDuration: number;
  suggestedLocation: string;
  color: string;
}

const eventTemplates: EventTemplate[] = [
  {
    id: 'meeting',
    name: 'Réunion',
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Réunion d\'équipe ou client',
    defaultDuration: 60,
    suggestedLocation: 'Visioconférence',
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  },
  {
    id: 'coffee',
    name: 'Café',
    icon: <Coffee className="h-4 w-4" />,
    description: 'Pause café informelle',
    defaultDuration: 30,
    suggestedLocation: 'Espace café',
    color: 'bg-amber-100 text-amber-800 hover:bg-amber-200'
  },
  {
    id: 'workshop',
    name: 'Atelier',
    icon: <Users className="h-4 w-4" />,
    description: 'Session de travail collaborative',
    defaultDuration: 120,
    suggestedLocation: 'Salle de formation',
    color: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
  },
  {
    id: 'social',
    name: 'Social',
    icon: <Heart className="h-4 w-4" />,
    description: 'Événement social ou team building',
    defaultDuration: 180,
    suggestedLocation: 'Restaurant',
    color: 'bg-pink-100 text-pink-800 hover:bg-pink-200'
  }
];

export const QuickCreateEventModal: React.FC<QuickCreateEventModalProps> = ({
  open,
  onOpenChange
}) => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  
  // Form data with auto-save
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    location: '',
    maxParticipants: '',
    type: 'meeting'
  });

  // Auto-save to localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('quickCreateEvent');
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          setFormData(parsedData);
        } catch (e) {
          console.error('Error parsing saved data:', e);
        }
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      localStorage.setItem('quickCreateEvent', JSON.stringify(formData));
    }
  }, [formData, open]);

  // Smart defaults based on current time
  useEffect(() => {
    if (open && !formData.date) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Suggest 9 AM tomorrow
      tomorrow.setHours(9, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        date: tomorrow.toISOString().split('T')[0],
        time: '09:00'
      }));
    }
  }, [open, formData.date]);

  const handleTemplateSelect = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      type: template.id,
      duration: template.defaultDuration,
      location: template.suggestedLocation,
      title: prev.title || template.name
    }));
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + formData.duration * 60000);
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: {
          type: formData.location.toLowerCase().includes('visio') || 
                formData.location.toLowerCase().includes('zoom') || 
                formData.location.toLowerCase().includes('meet') ? 'virtual' : 'physical',
          name: formData.location,
          virtualUrl: formData.location.toLowerCase().includes('visio') ? 
            `https://meet.google.com/${Math.random().toString(36).substr(2, 10)}` : undefined
        },
        participants: [],
        attendanceSettings: {
          method: ['manual'],
          requireCheckIn: false,
          requireCheckOut: false,
          allowLateCheckIn: true,
          graceMinutes: 15
        },
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        registrationRequired: false,
        tags: [formData.type],
        category: formData.type,
        isPrivate: false,
        priority: 'medium'
      };

      const response = await eventsService.createFullEvent(eventData);
      
      // Clear saved data
      localStorage.removeItem('quickCreateEvent');
      
      // Close modal and redirect
      onOpenChange(false);
      router.push(`/app/events/${response.id}?from=quick-create`);
      
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const isFormValid = formData.title.trim() && formData.date && formData.time && formData.location.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Créer un événement rapidement
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Choisissez un type d\'événement pour commencer' : 'Complétez les détails essentiels'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {eventTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all text-left group ${template.color}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {template.icon}
                    <span className="font-medium">{template.name}</span>
                  </div>
                  <p className="text-xs opacity-80">{template.description}</p>
                  <p className="text-xs opacity-60 mt-1">{template.defaultDuration} min</p>
                </button>
              ))}
            </div>
            
            <div className="text-center pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => setStep(2)}
                className="text-sm text-muted-foreground"
              >
                Ou créer sans template
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                {selectedTemplate.icon}
                <span className="font-medium">{selectedTemplate.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {selectedTemplate.defaultDuration} min
                </Badge>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Titre de l'événement *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Réunion équipe marketing"
                  className="mt-1"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Heure *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="duration">Durée (minutes)</Label>
                  <Select 
                    value={formData.duration.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="90">1h30</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                      <SelectItem value="180">3 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maxParticipants">Participants max</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    placeholder="Illimité"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Lieu *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Salle de réunion A, Visioconférence"
                  className="mt-1"
                />
                {formData.location.toLowerCase().includes('visio') && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Un lien de visioconférence sera généré automatiquement
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Détails supplémentaires..."
                  className="mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Retour
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormValid || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Créer l'événement
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};