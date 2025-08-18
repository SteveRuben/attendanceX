// src/pages/Dashboard/Dashboard.tsx - Dashboard principal AttendanceX
import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  MapPin, 
  Bell, 
  BarChart3,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Brain,
  Target,
  Zap,
  UserCheck,
  Timer,
  Coffee
} from 'lucide-react';
import { eventService, attendanceService, userService, notificationService } from '@/services';
import { InsightsWidget, AnomalyAlert, RecommendationPanel } from '@/components/ml';
import type { Event, Attendance, User } from '@attendance-x/shared';
import { toast } from 'react-toastify';

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalUsers: number;
  activeUsers: number;
  attendanceRate: number;
  totalAttendances: number;
  pendingNotifications: number;
  // Presence stats
  currentPresenceStatus: 'present' | 'absent' | 'on_break' | 'late';
  todayHours: number;
  weeklyHours: number;
  presentEmployees: number;
}

interface RecentActivity {
  id: string;
  type: 'event_created' | 'attendance_marked' | 'user_joined' | 'notification_sent';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  icon: React.ReactNode;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { canCreateEvents, canManageUsers, canViewReports, isAdmin } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    totalUsers: 0,
    activeUsers: 0,
    attendanceRate: 0,
    totalAttendances: 0,
    pendingNotifications: 0
  });
  
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentAttendances, setRecentAttendances] = useState<Attendance[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load data in parallel
      const [
        eventsResponse,
        upcomingEventsResponse,
        attendanceStatsResponse,
        userStatsResponse,
        myAttendancesResponse,
        notificationsResponse
      ] = await Promise.allSettled([
        eventService.getEventStats(),
        eventService.getUpcomingEvents(5),
        attendanceService.getAttendanceStats(),
        isAdmin ? userService.getUserStats() : Promise.resolve({ data: null }),
        attendanceService.getMyAttendances({ limit: 5 }),
        notificationService.getMyNotifications({ limit: 5, unreadOnly: true })
      ]);

      // Process results
      const eventStats = eventsResponse.status === 'fulfilled' ? eventsResponse.value.data : null;
      const upcomingEventsData = upcomingEventsResponse.status === 'fulfilled' ? upcomingEventsResponse.value.data : [];
      const attendanceStats = attendanceStatsResponse.status === 'fulfilled' ? attendanceStatsResponse.value.data : null;
      const userStats = userStatsResponse.status === 'fulfilled' ? userStatsResponse.value.data : null;
      const myAttendances = myAttendancesResponse.status === 'fulfilled' ? myAttendancesResponse.value.data : [];
      const notifications = notificationsResponse.status === 'fulfilled' ? notificationsResponse.value.data : null;

      // Update stats
      setStats({
        totalEvents: eventStats?.total || 0,
        upcomingEvents: eventStats?.upcoming || 0,
        totalUsers: userStats?.total || 0,
        activeUsers: userStats?.active || 0,
        attendanceRate: attendanceStats?.attendanceRate || 0,
        totalAttendances: attendanceStats?.total || 0,
        pendingNotifications: notifications?.pagination?.total || 0,
        // Mock presence data - replace with real API calls
        currentPresenceStatus: 'present',
        todayHours: 7.5,
        weeklyHours: 37.5,
        presentEmployees: 42
      });

      setUpcomingEvents(upcomingEventsData || []);
      setRecentAttendances(myAttendances || []);

      // Generate recent activity
      const activities: RecentActivity[] = [];
      
      if (upcomingEventsData) {
        upcomingEventsData.slice(0, 3).forEach(event => {
          activities.push({
            id: `event-${event.id}`,
            type: 'event_created',
            title: 'Nouvel événement',
            description: event.title,
            timestamp: event.createdAt,
            user: event.organizer?.displayName || 'Organisateur',
            icon: <Calendar className="w-4 h-4 text-blue-600" />
          });
        });
      }

      if (myAttendances) {
        myAttendances.slice(0, 2).forEach(attendance => {
          activities.push({
            id: `attendance-${attendance.id}`,
            type: 'attendance_marked',
            title: 'Présence marquée',
            description: `Événement: ${attendance.event?.title || 'N/A'}`,
            timestamp: attendance.checkInTime || attendance.createdAt,
            user: user?.displayName || 'Vous',
            icon: <CheckCircle className="w-4 h-4 text-green-600" />
          });
        });
      }

      setRecentActivity(activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 5));

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Tableau de bord actualisé');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Actif' },
      upcoming: { variant: 'secondary' as const, label: 'À venir' },
      ongoing: { variant: 'default' as const, label: 'En cours' },
      completed: { variant: 'outline' as const, label: 'Terminé' },
      cancelled: { variant: 'destructive' as const, label: 'Annulé' },
      present: { variant: 'default' as const, label: 'Présent' },
      absent: { variant: 'destructive' as const, label: 'Absent' },
      late: { variant: 'secondary' as const, label: 'En retard' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { variant: 'outline' as const, label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bonjour, {user?.firstName || user?.displayName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de votre activité AttendanceX
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {canCreateEvents && (
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel événement
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">Mon Statut</p>
                <p className="metric-value">
                  {stats.currentPresenceStatus === 'present' ? 'Présent' :
                   stats.currentPresenceStatus === 'absent' ? 'Absent' :
                   stats.currentPresenceStatus === 'on_break' ? 'En pause' : 'En retard'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.todayHours}h aujourd'hui
                </p>
              </div>
              <UserCheck className={`w-8 h-8 ${
                stats.currentPresenceStatus === 'present' ? 'text-green-600' :
                stats.currentPresenceStatus === 'absent' ? 'text-red-600' :
                stats.currentPresenceStatus === 'on_break' ? 'text-yellow-600' : 'text-orange-600'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">Événements</p>
                <p className="metric-value">{stats.totalEvents}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.upcomingEvents} à venir
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="metric-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="metric-label">Équipe Présente</p>
                  <p className="metric-value">{stats.presentEmployees}</p>
                  <p className="text-sm text-muted-foreground">
                    sur {stats.totalUsers} employés
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">Heures Semaine</p>
                <p className="metric-value">{stats.weeklyHours}h</p>
                <p className="text-sm text-muted-foreground">
                  Objectif: 40h
                </p>
              </div>
              <Timer className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">Notifications</p>
                <p className="metric-value">{stats.pendingNotifications}</p>
                <p className="text-sm text-muted-foreground">
                  Non lues
                </p>
              </div>
              <Bell className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Presence Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Actions Présence Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {stats.currentPresenceStatus === 'absent' && (
              <Button className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pointer l'arrivée
              </Button>
            )}
            
            {stats.currentPresenceStatus === 'present' && (
              <>
                <Button variant="outline" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Pointer la sortie
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Coffee className="h-4 w-4" />
                  Commencer une pause
                </Button>
              </>
            )}
            
            {stats.currentPresenceStatus === 'on_break' && (
              <Button className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Terminer la pause
              </Button>
            )}
            
            <Button variant="outline" onClick={() => window.location.href = '/presence'}>
              Voir ma présence
            </Button>
            
            {canManageUsers && (
              <Button variant="outline" onClick={() => window.location.href = '/presence/management'}>
                Gérer les présences
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Événements à venir
              </CardTitle>
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{event.title}</h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatDate(event.startDate)}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {event.location.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(event.status)}
                        <Button variant="outline" size="sm">
                          Détails
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun événement à venir</p>
                  {canCreateEvents && (
                    <Button className="mt-4" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un événement
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(activity.timestamp)} • {activity.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune activité récente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI/ML Widgets Section */}
      {canViewReports && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <Brain className="w-6 h-6 mr-2 text-primary" />
              Intelligence Artificielle
            </h2>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/analytics'}>
              <Zap className="w-4 h-4 mr-2" />
              Dashboard IA complet
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights Widget */}
            <InsightsWidget
              type="global"
              timeframe={{
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              }}
              maxInsights={2}
              showTrends={true}
              showRecommendations={false}
              compact={false}
            />

            {/* Anomaly Alert */}
            <AnomalyAlert
              type="attendance"
              timeframe={{
                start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
              }}
              threshold={0.7}
              autoRefresh={true}
              refreshInterval={15}
              compact={false}
            />
          </div>

          {/* Recommendations Panel */}
          <RecommendationPanel
            type="global"
            targetId="system"
            maxRecommendations={3}
            showPriority={true}
            showActions={true}
          />
        </div>
      )}

      {/* Quick Actions */}
      {(canCreateEvents || canManageUsers || canViewReports) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {canCreateEvents && (
                <Button variant="outline" className="h-20 flex-col">
                  <Plus className="w-6 h-6 mb-2" />
                  Créer un événement
                </Button>
              )}
              {canViewReports && (
                <Button variant="outline" className="h-20 flex-col" onClick={() => window.location.href = '/reports'}>
                  <BarChart3 className="w-6 h-6 mb-2" />
                  Générer un rapport
                </Button>
              )}
              {canViewReports && (
                <Button variant="outline" className="h-20 flex-col" onClick={() => window.location.href = '/predictions'}>
                  <Target className="w-6 h-6 mb-2" />
                  Prédictions IA
                </Button>
              )}
              {canManageUsers && (
                <Button variant="outline" className="h-20 flex-col">
                  <Users className="w-6 h-6 mb-2" />
                  Gérer les utilisateurs
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;