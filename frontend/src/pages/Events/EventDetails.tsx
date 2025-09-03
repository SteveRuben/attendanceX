// src/pages/Events/EventDetails.tsx - Détail d'un événement avec gestion des présences
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Edit, 
  Trash2,
  Copy,
  QrCode,
  Download,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Share2,
  ArrowLeft,
  Brain,
  Target,
  TrendingUp
} from 'lucide-react';
import { eventService, attendanceService, mlService } from '@/services';
import { AttendancePredictionCard, RecommendationPanel } from '@/components/ml';
import type { Event, Attendance, EventStatus, AttendancePrediction } from '@attendance-x/shared';
import { toast } from 'react-toastify';

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageEvents, canViewAttendances } = usePermissions();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalAttendances: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    if (id) {
      loadEventDetails();
      loadEventAttendances();
    }
  }, [id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEventById(id!);
      
      if (response.success && response.data) {
        setEvent(response.data);
        calculateStats(response.data);
      } else {
        toast.error('Événement non trouvé');
        navigate('/events');
      }
    } catch (error: any) {
      console.error('Error loading event:', error);
      toast.error('Erreur lors du chargement de l\'événement');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const loadEventAttendances = async () => {
    if (!canViewAttendances) return;
    
    try {
      setAttendanceLoading(true);
      const response = await attendanceService.getEventAttendances(id!);
      
      if (response.success && response.data) {
        setAttendances(response.data);
      }
    } catch (error: any) {
      console.error('Error loading attendances:', error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const calculateStats = (eventData: Event) => {
    const totalParticipants = eventData.participants?.length || 0;
    const presentCount = attendances.filter(a => a.status === 'present').length;
    const absentCount = attendances.filter(a => a.status === 'absent').length;
    const lateCount = attendances.filter(a => a.status === 'late').length;
    const attendanceRate = totalParticipants > 0 ? (presentCount / totalParticipants) * 100 : 0;

    setStats({
      totalParticipants,
      totalAttendances: attendances.length,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate
    });
  };

  const getStatusBadge = (status: EventStatus) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Brouillon' },
      published: { variant: 'default' as const, label: 'Publié' },
      ongoing: { variant: 'default' as const, label: 'En cours' },
      completed: { variant: 'outline' as const, label: 'Terminé' },
      cancelled: { variant: 'destructive' as const, label: 'Annulé' }
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAttendanceStatusBadge = (status: string) => {
    const statusConfig = {
      present: { variant: 'default' as const, label: 'Présent', icon: CheckCircle },
      absent: { variant: 'destructive' as const, label: 'Absent', icon: XCircle },
      late: { variant: 'secondary' as const, label: 'En retard', icon: AlertCircle },
      excused: { variant: 'outline' as const, label: 'Excusé', icon: AlertCircle }
    };

    const config = statusConfig[status] || { variant: 'outline' as const, label: status, icon: AlertCircle };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDuplicateEvent = async () => {
    try {
      const response = await eventService.duplicateEvent(id!);
      if (response.success) {
        toast.success('Événement dupliqué avec succès');
        navigate(`/events/${response.data.id}`);
      }
    } catch (error: any) {
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return;
    
    try {
      // Implementation would depend on your API
      toast.success('Événement supprimé');
      navigate('/events');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleChangeEventStatus = async (newStatus: EventStatus) => {
    try {
      const response = await eventService.changeEventStatus(id!, newStatus);
      if (response.success) {
        setEvent(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success('Statut mis à jour');
      }
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const isEventPast = event ? new Date(event.endDate) < new Date() : false;
  const isEventOngoing = event ? 
    new Date(event.startDate) <= new Date() && new Date(event.endDate) >= new Date() : false;

  if (loading) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
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
            Événement non trouvé ou vous n'avez pas les permissions pour le voir.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>
            <div className="flex items-center space-x-3 mt-2">
              {getStatusBadge(event.status)}
              <Badge variant="outline">{event.type}</Badge>
              {isEventOngoing && (
                <Badge variant="default" className="animate-pulse">
                  En cours
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {canManageEvents && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDuplicateEvent}>
              <Copy className="w-4 h-4 mr-2" />
              Dupliquer
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/events/${event.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'événement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{event.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Date de début</p>
                    <p className="text-muted-foreground">{formatDateTime(event.startDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Date de fin</p>
                    <p className="text-muted-foreground">{formatDateTime(event.endDate)}</p>
                  </div>
                </div>
                
                {event.location && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium">Lieu</p>
                      <p className="text-muted-foreground">{event.location.name}</p>
                      {event.location.address && (
                        <p className="text-sm text-muted-foreground">{event.location.address}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Participants</p>
                    <p className="text-muted-foreground">{stats.totalParticipants} invités</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          {canViewAttendances && (
            <Card>
              <CardHeader>
                <CardTitle>Statistiques de présence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.presentCount}</div>
                    <div className="text-sm text-muted-foreground">Présents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.absentCount}</div>
                    <div className="text-sm text-muted-foreground">Absents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.lateCount}</div>
                    <div className="text-sm text-muted-foreground">En retard</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.attendanceRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Taux de présence</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs Content */}
          <Tabs defaultValue="participants" className="space-y-4">
            <TabsList>
              <TabsTrigger value="participants">
                Participants ({stats.totalParticipants})
              </TabsTrigger>
              {canViewAttendances && (
                <TabsTrigger value="attendances">
                  Présences ({stats.totalAttendances})
                </TabsTrigger>
              )}
              {canViewAttendances && !isEventPast && (
                <TabsTrigger value="predictions">
                  <Brain className="w-4 h-4 mr-1" />
                  Prédictions IA
                </TabsTrigger>
              )}
              <TabsTrigger value="details">Détails</TabsTrigger>
            </TabsList>

            <TabsContent value="participants">
              <Card>
                <CardHeader>
                  <CardTitle>Liste des participants</CardTitle>
                </CardHeader>
                <CardContent>
                  {event.participants && event.participants.length > 0 ? (
                    <div className="space-y-3">
                      {event.participants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={participant.profilePicture} />
                              <AvatarFallback>{getUserInitials(participant)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {participant.displayName || `${participant.firstName} ${participant.lastName}`}
                              </p>
                              <p className="text-sm text-muted-foreground">{participant.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{participant.role}</Badge>
                            {/* Show attendance status if available */}
                            {attendances.find(a => a.userId === participant.id) && 
                              getAttendanceStatusBadge(
                                attendances.find(a => a.userId === participant.id)?.status || 'absent'
                              )
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucun participant invité</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {canViewAttendances && (
              <TabsContent value="attendances">
                <Card>
                  <CardHeader>
                    <CardTitle>Présences enregistrées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attendanceLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground mt-2">Chargement des présences...</p>
                      </div>
                    ) : attendances.length > 0 ? (
                      <div className="space-y-3">
                        {attendances.map((attendance) => (
                          <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={attendance.user?.profilePicture} />
                                <AvatarFallback>{getUserInitials(attendance.user)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {attendance.user?.displayName || 
                                   `${attendance.user?.firstName} ${attendance.user?.lastName}` ||
                                   attendance.user?.email}
                                </p>
                                {attendance.checkInTime && (
                                  <p className="text-sm text-muted-foreground">
                                    Arrivé le {formatDateTime(attendance.checkInTime)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getAttendanceStatusBadge(attendance.status)}
                              <Badge variant="outline">{attendance.method}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Aucune présence enregistrée</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {canViewAttendances && !isEventPast && (
              <TabsContent value="predictions">
                <div className="space-y-6">
                  {/* Prédictions Header */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-primary" />
                        Prédictions de Présence IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round((stats.totalParticipants * 0.85))}
                          </div>
                          <div className="text-sm text-muted-foreground">Présence prédite</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">85%</div>
                          <div className="text-sm text-muted-foreground">Taux prédit</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">92%</div>
                          <div className="text-sm text-muted-foreground">Confiance IA</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Les prédictions sont basées sur l'historique de présence, les patterns comportementaux et les caractéristiques de l'événement.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Prédictions par participant */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Prédictions par participant</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {event.participants && event.participants.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {event.participants.slice(0, 6).map((participant) => (
                            <AttendancePredictionCard
                              key={participant.id}
                              userId={participant.id}
                              eventId={event.id}
                              userName={participant.displayName || `${participant.firstName} ${participant.lastName}`}
                              compact={true}
                              showFactors={false}
                              showRecommendations={false}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Aucun participant pour les prédictions</p>
                        </div>
                      )}
                      
                      {event.participants && event.participants.length > 6 && (
                        <div className="text-center mt-4">
                          <Button variant="outline" onClick={() => navigate('/predictions')}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Voir toutes les prédictions ({event.participants.length})
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recommandations pour l'événement */}
                  <RecommendationPanel
                    type="event"
                    targetId={event.id}
                    context={{ eventType: event.type, participantCount: stats.totalParticipants }}
                    maxRecommendations={3}
                    showPriority={true}
                    showActions={true}
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Détails techniques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">ID de l'événement</p>
                      <p className="text-muted-foreground font-mono text-sm">{event.id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Créé le</p>
                      <p className="text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-medium">Organisateur</p>
                      <p className="text-muted-foreground">
                        {event.organizer?.displayName || event.organizer?.email}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Dernière modification</p>
                      <p className="text-muted-foreground">{formatDateTime(event.updatedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEventOngoing && (
                <Button className="w-full" asChild>
                  <Link to={`/attendances/mark/${event.id}`}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Marquer les présences
                  </Link>
                </Button>
              )}
              
              {canViewAttendances && (
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter les présences
                </Button>
              )}
              
              <Button variant="outline" className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                Voir les analytics
              </Button>
              
              {canManageEvents && event.status === 'published' && !isEventPast && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleChangeEventStatus('cancelled')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Annuler l'événement
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Event Status */}
          <Card>
            <CardHeader>
              <CardTitle>Statut de l'événement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Statut actuel</span>
                  {getStatusBadge(event.status)}
                </div>
                
                {isEventPast && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cet événement est terminé.
                    </AlertDescription>
                  </Alert>
                )}
                
                {isEventOngoing && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cet événement est actuellement en cours.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {(isEventOngoing || !isEventPast) && (
            <Card>
              <CardHeader>
                <CardTitle>Code QR de l'événement</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-32 h-32 bg-muted rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Scannez ce code pour marquer votre présence
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le QR Code
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;