/**
 * Page d'accueil du dashboard
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Users,
  UserCheck,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

interface DashboardHomeProps {
  organizationId: string;
}

interface DashboardStats {
  totalEvents: number;
  totalMembers: number;
  attendanceRate: number;
  upcomingEvents: number;
  trends: {
    events: number;
    members: number;
    attendance: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'event_created' | 'member_joined' | 'attendance_validated' | 'report_generated';
  title: string;
  description: string;
  timestamp: Date;
  user: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startDate: Date;
  location: string;
  participantCount: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ organizationId }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalMembers: 0,
    attendanceRate: 0,
    upcomingEvents: 0,
    trends: { events: 0, members: 0, attendance: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [organizationId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simuler des données pour le moment
      // TODO: Remplacer par de vrais appels API
      setTimeout(() => {
        setStats({
          totalEvents: 24,
          totalMembers: 156,
          attendanceRate: 87.5,
          upcomingEvents: 8,
          trends: {
            events: 12.5,
            members: 8.3,
            attendance: -2.1
          }
        });

        setRecentActivity([
          {
            id: '1',
            type: 'event_created',
            title: 'Nouvel événement créé',
            description: 'Réunion équipe marketing - 15 Mars 2024',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            user: 'Marie Dubois'
          },
          {
            id: '2',
            type: 'member_joined',
            title: 'Nouveau membre',
            description: 'Jean Martin a rejoint l\'équipe développement',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            user: 'Système'
          },
          {
            id: '3',
            type: 'attendance_validated',
            title: 'Présences validées',
            description: 'Formation sécurité - 45 participants',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            user: 'Pierre Durand'
          }
        ]);

        setUpcomingEvents([
          {
            id: '1',
            title: 'Réunion équipe marketing',
            startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            location: 'Salle de conférence A',
            participantCount: 12,
            status: 'scheduled'
          },
          {
            id: '2',
            title: 'Formation sécurité',
            startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            location: 'Auditorium principal',
            participantCount: 45,
            status: 'scheduled'
          },
          {
            id: '3',
            title: 'Assemblée générale',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            location: 'Visioconférence',
            participantCount: 156,
            status: 'scheduled'
          }
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'event_created':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'member_joined':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'attendance_validated':
        return <UserCheck className="h-4 w-4 text-purple-600" />;
      case 'report_generated':
        return <BarChart3 className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: UpcomingEvent['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Programmé</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-green-600 border-green-200">En cours</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-gray-600 border-gray-200">Terminé</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-200">Annulé</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Il y a moins d\'une heure';
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600 mt-1">
            Vue d'ensemble de votre organisation
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button asChild>
            <Link to={`/organization/${organizationId}/events/create`}>
              <Plus className="h-4 w-4" />
              Créer un événement
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements totaux</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.trends.events > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={stats.trends.events > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.trends.events)}%
              </span>
              <span className="ml-1">ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membres actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.trends.members > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={stats.trends.members > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.trends.members)}%
              </span>
              <span className="ml-1">ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de présence</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.trends.attendance > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={stats.trends.attendance > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.trends.attendance)}%
              </span>
              <span className="ml-1">ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements à venir</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">
              Dans les 30 prochains jours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Événements à venir */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Événements à venir</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/organization/${organizationId}/events`}>
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900">{event.title}</h4>
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(event.startDate)}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {event.participantCount} participants
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun événement à venir</p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <Link to={`/organization/${organizationId}/events/create`}>
                    Créer un événement
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/organization/${organizationId}/activity`}>
                Voir tout
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Par {activity.user}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune activité récente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link to={`/organization/${organizationId}/events/create`}>
                <Calendar className="h-6 w-6 mb-2" />
                Créer un événement
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link to={`/organization/${organizationId}/users/invite`}>
                <Users className="h-6 w-6 mb-2" />
                Inviter un utilisateur
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link to={`/organization/${organizationId}/attendance/upload`}>
                <UserCheck className="h-6 w-6 mb-2" />
                Importer présences
              </Link>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link to={`/organization/${organizationId}/reports/attendance`}>
                <BarChart3 className="h-6 w-6 mb-2" />
                Générer un rapport
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};