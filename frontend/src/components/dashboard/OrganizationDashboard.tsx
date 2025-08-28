import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  TrendingUp,
  Plus,
  Building,
  UserPlus,
  CalendarPlus,
  Upload,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Activity
} from 'lucide-react';
import type { Organization, Team, Event } from '@attendance-x/shared';
import { organizationService } from '@/services/organizationService';
import { teamService } from '@/services/teamService';
import { eventService } from '@/services/eventService';
import { toast } from 'react-toastify';

interface OrganizationDashboardProps {
  organization: Organization;
  onNavigate?: (path: string) => void;
}

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalTeams: number;
  totalEvents: number;
  upcomingEvents: number;
  attendanceRate: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'user_joined' | 'team_created' | 'event_created' | 'attendance_validated';
  message: string;
  timestamp: Date;
  actor?: string;
  icon: React.ComponentType<any>;
}

const ACTIVITY_ICONS = {
  user_joined: UserPlus,
  team_created: Building,
  event_created: CalendarPlus,
  attendance_validated: CheckCircle
};

export const OrganizationDashboard: React.FC<OrganizationDashboardProps> = ({
  organization,
  onNavigate
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    totalTeams: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    attendanceRate: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [recentTeams, setRecentTeams] = useState<Team[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [organization.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Charger les statistiques en parallèle
      const [membersResponse, teamsResponse, eventsResponse] = await Promise.all([
        organizationService.getOrganizationMembers(organization.id),
        teamService.getTeams(organization.id),
        eventService.getEvents({ organizerId: organization.id })
      ]);

      // Calculer les statistiques
      const members = Array.isArray(membersResponse) ? membersResponse : [];
      const totalMembers = members.length;
      const activeMembers = members.filter(member => member.isActive).length;

      const teams = Array.isArray(teamsResponse) ? teamsResponse : [];
      const totalTeams = teams.length;

      const events = Array.isArray(eventsResponse) ? eventsResponse : [];
      const totalEvents = events.length;

      const now = new Date();
      const upcoming = events.filter(event => new Date(event.startDateTime) > now);

      // Simuler des activités récentes
      const recentActivity: ActivityItem[] = [
        {
          id: '1',
          type: 'user_joined',
          message: '3 nouveaux membres ont rejoint l\'organisation',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          icon: ACTIVITY_ICONS.user_joined
        },
        {
          id: '2',
          type: 'event_created',
          message: 'Événement "Formation sécurité" créé',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          actor: 'Marie Dupont',
          icon: ACTIVITY_ICONS.event_created
        },
        {
          id: '3',
          type: 'team_created',
          message: 'Équipe "Support Client" créée',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          actor: 'Jean Martin',
          icon: ACTIVITY_ICONS.team_created
        }
      ];

      setStats({
        totalMembers,
        activeMembers,
        totalTeams,
        totalEvents,
        upcomingEvents: upcoming.length,
        attendanceRate: 85, // Simulé
        recentActivity
      });

      setRecentTeams(teams.slice(0, 3));
      setUpcomingEvents(upcoming.slice(0, 3));

    } catch (error) {
      toast.error('Erreur lors du chargement du dashboard');
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Inviter des utilisateurs',
      description: 'Ajouter de nouveaux membres à votre organisation',
      icon: UserPlus,
      color: 'bg-blue-500',
      action: () => onNavigate?.('/users/import')
    },
    {
      title: 'Créer un événement',
      description: 'Organiser un nouvel événement',
      icon: CalendarPlus,
      color: 'bg-green-500',
      action: () => onNavigate?.('/events/create')
    },
    {
      title: 'Gérer les équipes',
      description: 'Organiser vos équipes et permissions',
      icon: Building,
      color: 'bg-purple-500',
      action: () => onNavigate?.('/teams')
    },
    {
      title: 'Import en masse',
      description: 'Importer des utilisateurs ou participants',
      icon: Upload,
      color: 'bg-orange-500',
      action: () => onNavigate?.('/import')
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {organization.displayName || organization.name}
          </h1>
          <p className="text-gray-600">
            {organization.description || 'Tableau de bord de votre organisation'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            {organization.sector}
          </Badge>
          <Badge
            variant={organization.isActive ? "default" : "secondary"}
            className="text-sm"
          >
            {organization.isActive ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Membres</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
              <p className="text-xs text-gray-500">
                {stats.activeMembers} actifs
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Équipes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
              <p className="text-xs text-gray-500">
                Organisées par département
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Événements</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              <p className="text-xs text-gray-500">
                {stats.upcomingEvents} à venir
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de présence</p>
              <p className="text-2xl font-bold text-gray-900">{stats.attendanceRate}%</p>
              <p className="text-xs text-gray-500">
                Moyenne mensuelle
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow text-left group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Teams */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Équipes récentes</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('/teams')}
            >
              Voir tout
            </Button>
          </div>

          {recentTeams.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Aucune équipe créée</p>
              <Button
                variant="outline"
                onClick={() => onNavigate?.('/teams/create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une équipe
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTeams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-600">
                      {team.department} • {team.members.length} membre(s)
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {team.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Événements à venir</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate?.('/events')}
            >
              Voir tout
            </Button>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Aucun événement à venir</p>
              <Button
                variant="outline"
                onClick={() => onNavigate?.('/events/create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un événement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{event.title}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(event.startDateTime).toLocaleDateString()} • {event.location.address?.city}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {event.participants.length} participant(s)
                    </Badge>
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité récente</h2>

        {stats.recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {activity.actor && (
                        <span className="text-xs text-gray-600">par {activity.actor}</span>
                      )}
                      <span className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};