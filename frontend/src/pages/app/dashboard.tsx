import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  FileText, 
  Plus, 
  RefreshCw,
  Activity,
  Clock
} from 'lucide-react';
import { useRouter } from 'next/router';

interface DashboardStats {
  projects: number;
  events: number;
  attendances: number;
  users: number;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  type: 'project' | 'event' | 'user';
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  attendees: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    events: 0,
    attendances: 0,
    users: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      // Simuler le chargement des données
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        projects: 0,
        events: 0,
        attendances: 0,
        users: 0
      });

      setActivities([]);

      setUpcomingEvents([]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
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
      <AppShell title="Tableau de Bord">
        <div className="p-6 flex items-center justify-center min-h-[400px]" data-cy="loading-indicator">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Tableau de Bord">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <TrendingUp className="h-6 w-6" />
                Tableau de Bord
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vue d'ensemble de votre activité
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              data-cy="refresh-dashboard"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-cy="dashboard-stats">
            <Card data-cy="stats-projects">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Projets</p>
                    <p className="text-2xl font-bold" data-cy="stat-value">{stats.projects}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-cy="stats-events">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Événements</p>
                    <p className="text-2xl font-bold" data-cy="stat-value">{stats.events}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-cy="stats-attendances">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Participations</p>
                    <p className="text-2xl font-bold" data-cy="stat-value">{stats.attendances}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card data-cy="stats-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
                    <p className="text-2xl font-bold" data-cy="stat-value">{stats.users}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Button 
              onClick={() => router.push('/app/projects/create')}
              data-cy="quick-create-project"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Projet
            </Button>
            <Button 
              onClick={() => router.push('/app/events/create')}
              variant="outline"
              data-cy="quick-create-event"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Événement
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <Card data-cy="recent-activities">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activités Récentes
                </CardTitle>
                <CardDescription>
                  Les dernières actions dans votre organisation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3" data-cy="activity-item">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-cy="activity-title">
                        {activity.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1" data-cy="activity-date">
                        {formatDate(activity.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card data-cy="upcoming-events">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Événements à Venir
                </CardTitle>
                <CardDescription>
                  Vos prochains événements programmés
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3" data-cy="event-item">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium" data-cy="event-title">
                            {event.title}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-cy="event-date">
                            {formatDate(event.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            📍 {event.location}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {event.attendees} participants
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8" data-cy="no-events-message">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Aucun événement à venir
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}