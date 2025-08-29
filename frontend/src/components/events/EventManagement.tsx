/**
 * Composant de gestion des événements
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { 
  Calendar, 
  Users, 
  MapPin, 
  Clock, 
  Search,
  Plus,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { eventService } from '@/services';
import { type Event, EventStatus, EventType } from '@attendance-x/shared';
import { useToast } from '@/hooks/use-toast';

interface EventManagementProps {
  organizationId: string;
}

export const EventManagement: React.FC<EventManagementProps> = ({ organizationId }) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  useEffect(() => {
    loadEvents();
  }, [organizationId, statusFilter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEvents({
        limit: 50,
        sortBy: 'startDate',
        sortOrder: 'desc',
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined
      });

      if (response.success) {
        setEvents(response.data.items);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    const variants: Record<EventStatus, { variant: any; label: string }> = {
      [EventStatus.DRAFT]: { variant: 'secondary', label: 'Brouillon' },
      [EventStatus.PUBLISHED]: { variant: 'default', label: 'Publié' },
      [EventStatus.IN_PROGRESS]: { variant: 'default', label: 'En cours' },
      [EventStatus.COMPLETED]: { variant: 'outline', label: 'Terminé' },
      [EventStatus.CANCELLED]: { variant: 'destructive', label: 'Annulé' },
      [EventStatus.POSTPONED]: { variant: 'secondary', label: 'Reporté' },
      [EventStatus.CONFIRMED]: { variant: 'default', label: 'Confirmé' },
      [EventStatus.ARCHIVED]: { variant: 'outline', label: 'Archivé' },
      [EventStatus.ONGOING]: { variant: 'default', label: 'En cours' }
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: EventType) => {
    const labels: Record<EventType, string> = {
      [EventType.MEETING]: 'Réunion',
      [EventType.TRAINING]: 'Formation',
      [EventType.CONFERENCE]: 'Conférence',
      [EventType.WORKSHOP]: 'Atelier',
      [EventType.SEMINAR]: 'Séminaire',
      [EventType.WEBINAR]: 'Webinaire',
      [EventType.SOCIAL]: 'Social',
      [EventType.TEAM_BUILDING]: 'Team Building',
      [EventType.PRESENTATION]: 'Présentation',
      [EventType.INTERVIEW]: 'Entretien',
      [EventType.EXAM]: 'Examen',
      [EventType.COURSE]: 'Cours',
      [EventType.OTHER]: 'Autre'
    };

    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Événements</h1>
          <p className="text-muted-foreground">
            Gérez vos événements et suivez leur performance
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel Événement
        </Button>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des événements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value={EventStatus.PUBLISHED}>Publiés</option>
              <option value={EventStatus.IN_PROGRESS}>En cours</option>
              <option value={EventStatus.COMPLETED}>Terminés</option>
              <option value={EventStatus.CANCELLED}>Annulés</option>
            </select>

            <Button variant="outline" onClick={loadEvents}>
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des événements */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Aucun événement trouvé
              </h3>
              <p className="text-gray-500 mb-4">
                Commencez par créer votre premier événement
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer un événement
              </Button>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      {getStatusBadge(event.status)}
                      {getTypeBadge(event.type)}
                    </div>
                    
                    {event.description && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(event.startDateTime).toLocaleDateString()} à{' '}
                        {new Date(event.startDateTime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.participants.length} participant{event.participants.length > 1 ? 's' : ''}
                      </div>
                      
                      {event.location.type === 'physical' && event.location.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {event.location.address.city}
                        </div>
                      )}
                      
                      {event.location.type === 'virtual' && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          Virtuel
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Voir détails
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};