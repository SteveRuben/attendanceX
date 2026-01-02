import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Search, Filter, MapPin, Users, Grid, List } from 'lucide-react';
import { useRouter } from 'next/router';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendeesCount: number;
  status: 'draft' | 'published' | 'cancelled';
}

export default function EventsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [events] = useState<Event[]>([]);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    const labels = {
      draft: 'Brouillon',
      published: 'Publié',
      cancelled: 'Annulé'
    };

    return (
      <Badge className={variants[status as keyof typeof variants]} data-cy="event-status">
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AppShell title="Événements">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <Calendar className="h-6 w-6" />
                Événements
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos événements et inscriptions
              </p>
            </div>
            <Button 
              onClick={() => router.push('/app/events/create')}
              data-cy="create-event-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Événement
            </Button>
          </div>

          {/* Search, Filters and View Toggle */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des événements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-cy="events-search"
              />
            </div>
            <Button variant="outline" data-cy="events-filter">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-cy="list-view-toggle"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                data-cy="calendar-view-toggle"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Events List View */}
          {viewMode === 'list' && (
            <div className="space-y-4" data-cy="events-list-view">
              <div className="grid grid-cols-1 gap-4" data-cy="events-list">
                {filteredEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/app/events/${event.id}`)}
                    data-cy="event-card"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold" data-cy="event-title">
                                {event.title}
                              </h3>
                              <p className="text-muted-foreground mt-1" data-cy="event-description">
                                {event.description}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1" data-cy="event-date">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(event.date, event.time)}
                                </span>
                                <span className="flex items-center gap-1" data-cy="event-location">
                                  <MapPin className="h-4 w-4" />
                                  {event.location}
                                </span>
                                <span className="flex items-center gap-1" data-cy="event-attendees-count">
                                  <Users className="h-4 w-4" />
                                  {event.attendeesCount} participants
                                </span>
                              </div>
                            </div>
                            {getStatusBadge(event.status)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div data-cy="events-calendar-view">
              <Card data-cy="events-calendar">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Calendrier des Événements</span>
                    <div className="flex gap-2" data-cy="calendar-navigation">
                      <Button variant="outline" size="sm" data-cy="previous-month">
                        ←
                      </Button>
                      <span className="px-4 py-2 text-sm" data-cy="current-month">
                        Février 2024
                      </span>
                      <Button variant="outline" size="sm" data-cy="next-month">
                        →
                      </Button>
                      <Button variant="outline" size="sm" data-cy="today-button">
                        Aujourd'hui
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }, (_, i) => {
                      const day = i - 2; // Commencer le calendrier
                      const hasEvent = day > 0 && day <= 28 && [15, 20, 25].includes(day);
                      
                      return (
                        <div 
                          key={i} 
                          className={`
                            p-2 text-center text-sm border rounded cursor-pointer hover:bg-gray-50
                            ${day <= 0 || day > 28 ? 'text-muted-foreground' : ''}
                            ${hasEvent ? 'bg-blue-50 border-blue-200' : ''}
                          `}
                          data-cy="calendar-day"
                        >
                          {day > 0 && day <= 28 ? day : ''}
                          {hasEvent && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1" data-cy="calendar-event" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun événement trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Aucun événement ne correspond à votre recherche.' : 'Commencez par créer votre premier événement.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/app/events/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un événement
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}