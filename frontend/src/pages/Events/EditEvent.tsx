import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../../hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { eventService } from '../../services';
import { EventType, type Event } from '../../shared';
import { useToast } from '../../hooks/use-toast';

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageEvents } = usePermissions();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canManageEvents) {
      navigate('/events');
      return;
    }
    loadEvent();
  }, [id, canManageEvents]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEventById(id!);

      if (response.success && response.data) {
        setEvent(response.data);
      } else {
        toast({
          title: "Erreur",
          description: "Événement non trouvé",
          variant: "destructive"
        });
        navigate('/events');
      }
    } catch (error: any) {
      console.error('Error loading event:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement de l'événement",
        variant: "destructive"
      });
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) return;

    setSaving(true);

    try {
      const response = await eventService.updateEvent(id!, {
        title: event.title,
        description: event.description,
        type: event.type,
        location: event.location,
        maxParticipants: event.maxParticipants,
        isPrivate: event.isPrivate,
        tags: event.tags
      });

      if (response.success) {
        toast({
          title: "Succès",
          description: "Événement mis à jour avec succès !"
        });
        navigate(`/events/${id}`);
      }
    } catch (error: any) {
      console.error('Error updating event:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour de l'événement",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container-fluid py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Événement non trouvé
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/events/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Modifier l'événement</h1>
            <p className="text-muted-foreground mt-1">
              Modifiez les informations de votre événement
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre de l'événement</Label>
              <Input
                id="title"
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                placeholder="Ex: Réunion équipe marketing"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={event.description}
                onChange={(e) => setEvent({ ...event, description: e.target.value })}
                placeholder="Décrivez l'objectif et le contenu de l'événement..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type d'événement</Label>
                <Select
                  value={event.type}
                  onValueChange={(value) => setEvent({ ...event, type: value as EventType })}
                >
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
                  value={event.maxParticipants || ''}
                  onChange={(e) => setEvent({ ...event, maxParticipants: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Illimité"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrivate"
                checked={event.isPrivate}
                onCheckedChange={(checked) => setEvent({ ...event, isPrivate: !!checked })}
              />
              <Label htmlFor="isPrivate">Événement privé</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center space-x-4">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/events/${id}`)}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditEvent;