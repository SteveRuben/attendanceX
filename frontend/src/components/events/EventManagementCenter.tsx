import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Plus,
  Users,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Eye,
  Filter,
  Search,
  BarChart3,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { eventService } from '@/services';
import type { Event, EventStatus, EventType } from '../../shared';
import { toast } from 'react-toastify';

interface EventManagementCenterProps {
  organizationId: string;
}

export const EventManagementCenter: React.FC<EventManagementCenterProps> = ({ organizationId }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0
  });

  useEffect(() => {
    loadEvents();
    loadStats();
  }, [organizationId, statusFilter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEvents({
        organizerId: organizationId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
        sortBy: 'startDate',
        sortOrder: 'desc'
      });

      if (response.success && response.data) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Erreur lors du chargement des événements');
      
      // Données de fallback pour la démonstration
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Réunion équipe développement',
          description: 'Point hebdomadaire sur l\'avancement des projets',
          type: 'meeting' as EventType,
          status: 'scheduled' as EventStatus,
          startDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          endDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          location: {
            type: 'physical',
            address: {
              street: '123 Rue de la Tech',
              city: 'Paris',
              postalCode: '75001',
              country: 'France'
            }
          },
          organizerId: organizationId,
          participants: [],
          maxParticipants: 20,
          isPrivate: false,
          tags: ['développement', 'équipe'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Formation sécurité informatique',
          description: 'Session de formation obligatoire sur la cybersécurité',
          type: 'training' as EventType,
          status: 'completed' as EventStatus,
          startDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          location: {
            type: 'virtual',
            virtualLink: 'https://meet.google.com/abc-def-ghi'
          },
          organizerId: organizationId,
          participants: [],
          maxParticipants: 50,
          isPrivate: false,
          tags: ['formation', 'sécurité'],
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await eventService.getEventStats({
        organizerId: organizationId
      });

      if (response.success && response.data) {
        setStats({
          total: response.data.total,
          upcoming: response.data.upcoming,
          ongoing: response.data.ongoing,
          completed: response.data.completed,
          cancelled: response.data.cancelled
        });
      }
    } catch (error) {
      console.error('Error loading event stats:', error);
      // Stats de fallback
      setStats({
        total: 2,
        upcoming: 1,
        ongoing: 0,
        completed: 1,
        cancelled: 0
      });
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Brouillon', icon: Edit },
      scheduled: { variant: 'default' as const, label: 'Programmé', icon: Clock },
      ongoing: { variant: 'default' as const, label: 'En cours', icon: CheckCircle },
      completed: { variant: 'default' as const, label: 'Terminé', icon: CheckCircle },
      cancelled: { variant: 'destructive' as const, label: 'Annulé', icon: XCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationDisplay = (location: Event['location']) => {
    if (location.type === 'virtual') {
      return 'En ligne';
    } else if (location.type === 'hybrid') {
      return 'Hybride';
    } else if (location.address) {
      return `${location.address.city}, ${location.address.country}`;
    }
    return 'Lieu non spécifié';
  };

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Événements</h1>
          <p className="text-gray-600">
            Organisez et gérez vos événements
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Événement
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">À venir</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En cours</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ongoing}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Terminés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-gray-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Annulés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un événement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="scheduled">Programmé</option>
            <option value="ongoing">En cours</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>
        </div>
      </Card>

      {/* Liste des événements */}
      <Card>
        <CardHeader>
          <CardTitle>Mes Événements</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Aucun événement trouvé' : 'Aucun événement'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Essayez de modifier vos critères de recherche.'
                  : 'Créez votre premier événement pour commencer.'
                }
              </p>
              {!searchTerm && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un événement
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      {getStatusBadge(event.status)}
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{event.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(event.startDateTime)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {getLocationDisplay(event.location)}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.participants.length}/{event.maxParticipants || '∞'} participants
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};