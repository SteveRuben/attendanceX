// src/pages/Events/EventsList.tsx - Liste des événements avec filtres et actions
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';
import { eventService } from '@/services';
import type { Event, EventStatus, EventType } from '../../shared';
import { toast } from 'react-toastify';

interface EventFilters {
  search: string;
  status: EventStatus | 'all';
  type: EventType | 'all';
  sortBy: 'startDate' | 'title' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

const EventsList = () => {
  const { user } = useAuth();
  const { canCreateEvents, canManageEvents } = usePermissions();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    status: 'all',
    type: 'all',
    sortBy: 'startDate',
    sortOrder: 'asc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    loadEvents();
  }, [filters, pagination.page]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      if (filters.search) params.search = filters.search;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.type !== 'all') params.type = filters.type;

      const response = await eventService.getEvents(params);
      
      if (response.success && response.data) {
        setEvents(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0
        }));
      }
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof EventFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const getTypeLabel = (type: EventType) => {
    const typeLabels = {
      meeting: 'Réunion',
      training: 'Formation',
      conference: 'Conférence',
      workshop: 'Atelier',
      seminar: 'Séminaire',
      webinar: 'Webinaire',
      other: 'Autre'
    };
    return typeLabels[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDuplicateEvent = async (eventId: string) => {
    try {
      const response = await eventService.duplicateEvent(eventId);
      if (response.success) {
        toast.success('Événement dupliqué avec succès');
        loadEvents();
      }
    } catch (error: any) {
      toast.error('Erreur lors de la duplication');
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold text-foreground">Événements</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos événements et suivez les présences
          </p>
        </div>
        {canCreateEvents && (
          <Button onClick={() => navigate('/events/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel événement
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher des événements..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="ongoing">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
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
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="space-y-4">
        {events.length > 0 ? (
          events.map((event) => (
            <Card key={event.id} className="card-interactive">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {event.title}
                      </h3>
                      {getStatusBadge(event.status)}
                      <Badge variant="outline">{getTypeLabel(event.type)}</Badge>
                    </div>
                    
                    {event.description && (
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(event.startDate)}
                      </div>
                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {event.location.name}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {event.participants?.length || 0} participants
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(event.endDate).getTime() - new Date(event.startDate).getTime() > 86400000 
                          ? `${Math.ceil((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / 86400000)} jour(s)`
                          : `${Math.ceil((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / 3600000)} heure(s)`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/events/${event.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Link>
                    </Button>
                    
                    {canManageEvents && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/events/${event.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </Link>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDuplicateEvent(event.id)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Dupliquer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucun événement trouvé
              </h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status !== 'all' || filters.type !== 'all'
                  ? 'Aucun événement ne correspond à vos critères de recherche.'
                  : 'Vous n\'avez pas encore créé d\'événement.'
                }
              </p>
              {canCreateEvents && (
                <Button onClick={() => navigate('/events/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer votre premier événement
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} événements
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsList;