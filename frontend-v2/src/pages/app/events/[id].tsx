import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Share2, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Brain,
  Target,
  DollarSign,
  Settings,
  List
} from 'lucide-react';
import { EventItem, eventsService } from '@/services/eventsService';

export default function EventDetailPage() {
  const router = useRouter();
  const { id, from } = router.query;
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchEvent(id);
    }
    
    // Afficher l'alerte de succès si l'événement vient d'être créé via IA
    if (from === 'ai-generator') {
      setShowSuccessAlert(true);
      // Masquer l'alerte après 5 secondes
      setTimeout(() => setShowSuccessAlert(false), 5000);
    }
  }, [id, from]);

  const fetchEvent = async (eventId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const eventData = await eventsService.getEventById(eventId);
      setEvent(eventData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement de l\'événement';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.name}" ?`)) {
      setDeleting(true);
      try {
        await eventsService.deleteEvent(event.id);
        router.push('/app/events');
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setDeleting(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
      published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
    };
    
    const labels = {
      draft: 'Brouillon',
      published: 'Publié',
      cancelled: 'Annulé',
      active: 'Actif'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.draft}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const eventDate = new Date(dateString);
      return eventDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateOnly = (dateString: string) => {
    try {
      const eventDate = new Date(dateString);
      return eventDate.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  };

  const formatTimeOnly = (dateString: string) => {
    try {
      const eventDate = new Date(dateString);
      return eventDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Heure invalide';
    }
  };

  if (loading) {
    return (
      <AppShell title="Chargement...">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Chargement de l'événement...</span>
        </div>
      </AppShell>
    );
  }

  if (error || !event) {
    return (
      <AppShell title="Erreur">
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Événement non trouvé'}
            </AlertDescription>
          </Alert>
          
          <div className="text-center">
            <Button onClick={() => router.push('/app/events')}>
              Retour à la liste des événements
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={event.name}>
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-6xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            {/* Success Alert for AI-generated events */}
            {showSuccessAlert && (
              <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <div className="flex items-center justify-between">
                    <span>🎉 Événement créé avec succès par l'IA !</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => router.push('/app/events')}
                      className="text-green-800 hover:text-green-900 dark:text-green-200"
                    >
                      <List className="h-4 w-4 mr-1" />
                      Voir tous les événements
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => router.push('/app/events')}
                className="text-muted-foreground"
              >
                <List className="h-4 w-4 mr-2" />
                Tous les événements
              </Button>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold">{event.name}</h1>
                  {getStatusBadge(event.status || 'draft')}
                  {event.type && (
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  )}
                </div>
                {event.description && (
                  <p className="text-muted-foreground">{event.description}</p>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/app/events/${event.id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteEvent}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Supprimer
                </Button>
              </div>
            </div>
          </div>

          {/* Event Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{formatDateOnly(event.startTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Heure</p>
                    <p className="font-semibold">{formatTimeOnly(event.startTime)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participants</p>
                    <p className="font-semibold">
                      {event.attendeesCount || 0}
                      {event.maxParticipants && ` / ${event.maxParticipants}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lieu</p>
                    <p className="font-semibold">
                      {event.location?.name || 'Non défini'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Vue d'ensemble
              </TabsTrigger>
              <TabsTrigger value="participants" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Tâches
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Paramètres
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Détails de l'événement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Titre</label>
                      <p className="mt-1">{event.name}</p>
                    </div>
                    
                    {event.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="mt-1 text-sm">{event.description}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <p className="mt-1">{event.type || 'Non défini'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Statut</label>
                      <div className="mt-1">
                        {getStatusBadge(event.status || 'draft')}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Informations pratiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date et heure</label>
                      <p className="mt-1">{formatDate(event.startTime)}</p>
                    </div>
                    
                    {event.location && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Lieu</label>
                        <p className="mt-1">{event.location.name}</p>
                        {event.location.address && (
                          <p className="text-sm text-muted-foreground">
                            {typeof event.location.address === 'string' 
                              ? event.location.address 
                              : `${event.location.address.street}, ${event.location.address.city}`
                            }
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Capacité</label>
                      <p className="mt-1">
                        {event.maxParticipants ? `${event.maxParticipants} participants maximum` : 'Illimitée'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Visibilité</label>
                      <p className="mt-1">{event.isPrivate ? 'Privé' : 'Public'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des participants</CardTitle>
                  <CardDescription>
                    Gérez les inscriptions et la participation à votre événement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Gestion des participants</h3>
                    <p className="text-muted-foreground mb-4">
                      Cette fonctionnalité sera bientôt disponible
                    </p>
                    <Button variant="outline">
                      Inviter des participants
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tâches de l'événement</CardTitle>
                  <CardDescription>
                    Organisez et suivez les tâches liées à votre événement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Gestion des tâches</h3>
                    <p className="text-muted-foreground mb-4">
                      Cette fonctionnalité sera bientôt disponible
                    </p>
                    <Button variant="outline">
                      Créer une tâche
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres de l'événement</CardTitle>
                  <CardDescription>
                    Configurez les options avancées de votre événement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Paramètres avancés</h3>
                    <p className="text-muted-foreground mb-4">
                      Cette fonctionnalité sera bientôt disponible
                    </p>
                    <Button variant="outline">
                      Configurer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}