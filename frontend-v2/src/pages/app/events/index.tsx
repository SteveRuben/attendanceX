import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Plus, Search, Filter, MapPin, Users, Grid, List, Loader2, AlertCircle, Brain, Zap } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEvents } from '@/hooks/useEvents';
import { QuickCreateEventModal } from '@/components/events/QuickCreateEventModal';

export default function EventsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  
  const { events, loading, error, pagination, fetchEvents, deleteEvent } = useEvents();

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
      <Badge className={variants[status as keyof typeof variants] || variants.draft} data-cy="event-status">
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchTerm || 
      event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${eventName}" ?`)) {
      try {
        await deleteEvent(eventId);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    fetchEvents({ status: status || undefined, page: 1 });
  };

  return (
    <AppShell title="Événements">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                  <Calendar className="h-6 w-6" />
                  Événements
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez vos événements et inscriptions ({events.length} événement{events.length !== 1 ? 's' : ''})
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowQuickCreate(true)}
                  className="flex items-center gap-2"
                  data-cy="quick-create-button"
                >
                  <Zap className="h-4 w-4" />
                  Création rapide
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/app/ai/event-generator')}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Créer avec IA
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/app/events/create')}
                  className="flex items-center gap-2"
                  data-cy="create-event-button"
                >
                  <Plus className="h-4 w-4" />
                  Création avancée
                </Button>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-4 w-full sm:w-auto">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un événement..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                      data-cy="search-input"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="active">Actif</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Chargement des événements...</span>
              </CardContent>
            </Card>
          )}

          {/* Events List */}
          {!loading && (
            <>
              {filteredEvents.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm || statusFilter ? 'Aucun événement trouvé' : 'Aucun événement'}
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchTerm || statusFilter 
                        ? 'Essayez de modifier vos critères de recherche'
                        : 'Commencez par créer votre premier événement'
                      }
                    </p>
                    {!searchTerm && !statusFilter && (
                      <div className="flex gap-2">
                        <Button onClick={() => setShowQuickCreate(true)}>
                          <Zap className="h-4 w-4 mr-2" />
                          Création rapide
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/app/ai/event-generator')}>
                          <Brain className="h-4 w-4 mr-2" />
                          Créer avec IA
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/app/events/create')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer manuellement
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/app/events/${event.id}`)}
                      data-cy="event-card"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{event.name}</h3>
                              {getStatusBadge(event.status || 'draft')}
                              {event.type && (
                                <Badge variant="outline" className="text-xs">
                                  {event.type}
                                </Badge>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-muted-foreground mb-3 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(event.startTime)}
                              </div>
                              
                              {event.location?.name && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {event.location.name}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {event.attendeesCount || 0} participant{(event.attendeesCount || 0) !== 1 ? 's' : ''}
                                {event.maxParticipants && ` / ${event.maxParticipants}`}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/app/events/${event.id}/edit`);
                              }}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id, event.name);
                              }}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} événements
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchEvents({ page: pagination.page - 1 })}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchEvents({ page: pagination.page + 1 })}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Create Modal */}
      <QuickCreateEventModal 
        open={showQuickCreate} 
        onOpenChange={setShowQuickCreate} 
      />
    </AppShell>
  );
}