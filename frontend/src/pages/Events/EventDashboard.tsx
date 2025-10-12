import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/MultiTenantAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/badge';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { eventService } from '../../services';
import type { Event, EventStatus } from '../../shared';
import { useToast } from '../../hooks/use-toast';

const EventDashboard = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    totalParticipants: 0,
    averageAttendance: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [tenant?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [upcomingResponse, statsResponse] = await Promise.all([
        eventService.getUpcomingEvents(5),
        eventService.getEventStats()
      ]);

      if (upcomingResponse.success && upcomingResponse.data) {
        setUpcomingEvents(upcomingResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Brouillon', icon: AlertCircle },
      published: { variant: 'default' as const, label: 'Publié', icon: CheckCircle },
      ongoing: { variant: 'default' as const, label: 'En cours', icon: Clock },
      completed: { variant: 'outline' as const, label: 'Terminé', icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, label: 'Annulé', icon: XCircle }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord des événements</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de vos événements et statistiques
          </p>
        </div>
        <Button onClick={() => navigate('/events/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel événement
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total événements</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">À venir</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.upcoming}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Participants</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalParticipants}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de présence</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats.averageAttendance.toFixed(0)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Événements à venir</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
                Voir tout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{event.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(event.startDateTime)}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {event.participants?.length || 0}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(event.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun événement à venir</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/events/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un événement
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-muted-foreground">Publiés</span>
                </div>
                <span className="font-semibold">{stats.upcoming}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-muted-foreground">En cours</span>
                </div>
                <span className="font-semibold">{stats.ongoing}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                  <span className="text-sm text-muted-foreground">Terminés</span>
                </div>
                <span className="font-semibold">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-muted-foreground">Annulés</span>
                </div>
                <span className="font-semibold">{stats.cancelled}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-6" onClick={() => navigate('/analytics/events')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Voir les analytics détaillées
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventDashboard;

