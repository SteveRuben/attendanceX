// src/pages/Events/CreateEvent.tsx - Formulaire de création d'événement
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Save,
  ArrowLeft,
  AlertCircle,
  Plus,
  X,
  Search
} from 'lucide-react';
import { eventService, userService } from '../../services';
import { EventType, type CreateEventRequest, type User } from '../../shared';
import { useToast } from '../../hooks/use-toast';

interface EventFormData {
  title: string;
  description: string;
  type: EventType;
  startDate: string;
  endDate: string;
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    virtualLink?: string;
  };
  maxParticipants?: number;
  isPrivate: boolean;
  requiresApproval: boolean;
  allowLateRegistration: boolean;
  tags: string[];
  participants: string[];
  settings: {
    allowQRCode: boolean;
    allowGeolocation: boolean;
    allowManualCheckIn: boolean;
    checkInWindow: number; // minutes before/after
    sendReminders: boolean;
    reminderTimes: number[]; // hours before event
  };
}

const CreateEvent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreateEvents } = usePermissions();
  const { toast } = useToast();

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    type: EventType.MEETING,
    startDate: '',
    endDate: '',
    location: {
      type: 'physical',
      name: '',
      address: '',
      virtualLink: ''
    },
    maxParticipants: undefined,
    isPrivate: false,
    requiresApproval: false,
    allowLateRegistration: true,
    tags: [],
    participants: [],
    settings: {
      allowQRCode: true,
      allowGeolocation: true,
      allowManualCheckIn: true,
      checkInWindow: 30,
      sendReminders: true,
      reminderTimes: [24, 1] // 24h and 1h before
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!canCreateEvents) {
      navigate('/events');
      return;
    }
    loadUsers();
  }, [canCreateEvents]);

  const loadUsers = async () => {
    try {
      setSearchingUsers(true);
      const response = await userService.getUsers({ limit: 100 });
      if (response.success && response.data) {
        setAvailableUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setSearchingUsers(false);
    }
  }; const
    validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!formData.title.trim()) {
        newErrors.title = 'Le titre est requis';
      }

      if (!formData.startDate) {
        newErrors.startDate = 'La date de début est requise';
      }

      if (!formData.endDate) {
        newErrors.endDate = 'La date de fin est requise';
      }

      if (formData.startDate && formData.endDate) {
        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'La date de fin doit être après la date de début';
        }
      }

      if (!formData.location.name.trim()) {
        newErrors.locationName = 'Le nom du lieu est requis';
      }

      if (formData.location.type === 'virtual' && !formData.location.virtualLink?.trim()) {
        newErrors.virtualLink = 'Le lien virtuel est requis pour un événement virtuel';
      }

      if (formData.maxParticipants && formData.maxParticipants < 1) {
        newErrors.maxParticipants = 'Le nombre maximum de participants doit être supérieur à 0';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erreur",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const eventData: CreateEventRequest = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startDateTime: formData.startDate,
        endDateTime: formData.endDate,
        location: formData.location as CreateEventRequest['location'],
        maxParticipants: formData.maxParticipants,
        isPrivate: formData.isPrivate,
        requiresApproval: formData.requiresApproval,
        tags: formData.tags,
        participants: formData.participants,
        capacity: formData.maxParticipants || 100
      };

      const response = await eventService.createEvent(eventData);

      if (response.success && response.data) {
        toast({
          title: "Succès",
          description: "Événement créé avec succès !"
        });
        navigate(`/events/${response.data.id}`);
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de l'événement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLocationChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addParticipant = (userId: string) => {
    if (!formData.participants.includes(userId)) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, userId]
      }));
    }
  };

  const removeParticipant = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(id => id !== userId)
    }));
  };

  const filteredUsers = availableUsers.filter(user =>
    !formData.participants.includes(user.id) &&
    (user.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const selectedUsers = availableUsers.filter(user =>
    formData.participants.includes(user.id || "")
  );

  if (!canCreateEvents) {
    return (
      <div className="container-fluid py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous n'avez pas les permissions pour créer des événements.
          </AlertDescription>
        </Alert>
      </div>
    );
  } return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux événements
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Créer un événement</h1>
            <p className="text-muted-foreground mt-1">
              Organisez un nouvel événement et invitez des participants
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informations de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre de l'événement *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Ex: Réunion équipe marketing"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Décrivez l'objectif et le contenu de l'événement..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type d'événement</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Réunion</SelectItem>
                        <SelectItem value="training">Formation</SelectItem>
                        <SelectItem value="conference">Conférence</SelectItem>
                        <SelectItem value="workshop">Atelier</SelectItem>
                        <SelectItem value="seminar">Séminaire</SelectItem>
                        <SelectItem value="webinar">Webinaire</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maxParticipants">Nombre max de participants</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      min="1"
                      value={formData.maxParticipants || ''}
                      onChange={(e) => handleInputChange('maxParticipants', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="Illimité"
                      className={errors.maxParticipants ? 'border-red-500' : ''}
                    />
                    {errors.maxParticipants && (
                      <p className="text-sm text-red-600 mt-1">{errors.maxParticipants}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date and Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Date et heure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Date et heure de début *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={errors.startDate ? 'border-red-500' : ''}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endDate">Date et heure de fin *</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={errors.endDate ? 'border-red-500' : ''}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Lieu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Type de lieu</Label>
                  <Select value={formData.location.type} onValueChange={(value) => handleLocationChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physique</SelectItem>
                      <SelectItem value="virtual">Virtuel</SelectItem>
                      <SelectItem value="hybrid">Hybride</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="locationName">Nom du lieu *</Label>
                  <Input
                    id="locationName"
                    value={formData.location.name}
                    onChange={(e) => handleLocationChange('name', e.target.value)}
                    placeholder="Ex: Salle de conférence A, Zoom, Teams..."
                    className={errors.locationName ? 'border-red-500' : ''}
                  />
                  {errors.locationName && (
                    <p className="text-sm text-red-600 mt-1">{errors.locationName}</p>
                  )}
                </div>

                {(formData.location.type === 'physical' || formData.location.type === 'hybrid') && (
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={formData.location.address || ''}
                      onChange={(e) => handleLocationChange('address', e.target.value)}
                      placeholder="123 Rue de la Paix, 75001 Paris"
                    />
                  </div>
                )}

                {(formData.location.type === 'virtual' || formData.location.type === 'hybrid') && (
                  <div>
                    <Label htmlFor="virtualLink">Lien virtuel {formData.location.type === 'virtual' ? '*' : ''}</Label>
                    <Input
                      id="virtualLink"
                      value={formData.location.virtualLink || ''}
                      onChange={(e) => handleLocationChange('virtualLink', e.target.value)}
                      placeholder="https://zoom.us/j/123456789"
                      className={errors.virtualLink ? 'border-red-500' : ''}
                    />
                    {errors.virtualLink && (
                      <p className="text-sm text-red-600 mt-1">{errors.virtualLink}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Users */}
                <div>
                  <Label>Rechercher et ajouter des participants</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Rechercher par nom ou email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Available Users */}
                {userSearchTerm && (
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                    <h4 className="font-medium mb-2">Utilisateurs disponibles</h4>
                    {filteredUsers.length > 0 ? (
                      <div className="space-y-2">
                        {filteredUsers.slice(0, 10).map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                            <div>
                              <p className="font-medium">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addParticipant(user.id || "")}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
                    )}
                  </div>
                )}

                {/* Selected Participants */}
                {selectedUsers.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Participants sélectionnés ({selectedUsers.length})</h4>
                    <div className="space-y-2">
                      {selectedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium">{user.displayName || `${user.firstName} ${user.lastName}`}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeParticipant(user.id || "")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Ajouter un tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <div key={tag} className="flex items-center bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Paramètres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isPrivate"
                      checked={formData.isPrivate}
                      onCheckedChange={(checked) => handleInputChange('isPrivate', checked)}
                    />
                    <Label htmlFor="isPrivate">Événement privé</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requiresApproval"
                      checked={formData.requiresApproval}
                      onCheckedChange={(checked) => handleInputChange('requiresApproval', checked)}
                    />
                    <Label htmlFor="requiresApproval">Approbation requise</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowLateRegistration"
                      checked={formData.allowLateRegistration}
                      onCheckedChange={(checked) => handleInputChange('allowLateRegistration', checked)}
                    />
                    <Label htmlFor="allowLateRegistration">Inscription tardive autorisée</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de présence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowQRCode"
                      checked={formData.settings.allowQRCode}
                      onCheckedChange={(checked) => handleSettingsChange('allowQRCode', checked)}
                    />
                    <Label htmlFor="allowQRCode">Code QR</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowGeolocation"
                      checked={formData.settings.allowGeolocation}
                      onCheckedChange={(checked) => handleSettingsChange('allowGeolocation', checked)}
                    />
                    <Label htmlFor="allowGeolocation">Géolocalisation</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allowManualCheckIn"
                      checked={formData.settings.allowManualCheckIn}
                      onCheckedChange={(checked) => handleSettingsChange('allowManualCheckIn', checked)}
                    />
                    <Label htmlFor="allowManualCheckIn">Marquage manuel</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="checkInWindow">Fenêtre de marquage (minutes)</Label>
                  <Input
                    id="checkInWindow"
                    type="number"
                    min="0"
                    value={formData.settings.checkInWindow}
                    onChange={(e) => handleSettingsChange('checkInWindow', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Temps avant/après l'événement pour marquer sa présence
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Reminder Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Rappels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendReminders"
                    checked={formData.settings.sendReminders}
                    onCheckedChange={(checked) => handleSettingsChange('sendReminders', checked)}
                  />
                  <Label htmlFor="sendReminders">Envoyer des rappels</Label>
                </div>

                {formData.settings.sendReminders && (
                  <div>
                    <Label>Heures avant l'événement</Label>
                    <div className="space-y-2">
                      {[24, 12, 6, 1].map((hours) => (
                        <div key={hours} className="flex items-center space-x-2">
                          <Checkbox
                            id={`reminder-${hours}`}
                            checked={formData.settings.reminderTimes.includes(hours)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleSettingsChange('reminderTimes', [...formData.settings.reminderTimes, hours]);
                              } else {
                                handleSettingsChange('reminderTimes', formData.settings.reminderTimes.filter(h => h !== hours));
                              }
                            }}
                          />
                          <Label htmlFor={`reminder-${hours}`}>{hours}h avant</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Création...' : 'Créer l\'événement'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/events')}
                  >
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;