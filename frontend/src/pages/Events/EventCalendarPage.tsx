import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/MultiTenantAuthContext';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { EventCalendar } from '../../components/events/EventCalendar';
import { Plus, List, Calendar } from 'lucide-react';
import { eventService } from '../../services';
import type { Event } from '../../shared';
import { useToast } from '../../hooks/use-toast';

const EventCalendarPage = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    loadEvents();
  }, [tenant?.id]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEvents({
        limit: 100,
        sortBy: 'startDate',
        sortOrder: 'asc'
      });

      if (response.success && response.data) {
        setEvents(response.data.items || response.data);
      }
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const handleDateSelect = (date: Date) => {
    console.log('Date selected:', date);
  };

  if (loading) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendrier des événements</h1>
          <p className="text-muted-foreground mt-1">
            Visualisez et gérez vos événements dans le calendrier
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
            <TabsList>
              <TabsTrigger value="calendar">
                <Calendar className="w-4 h-4 mr-2" />
                Calendrier
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="w-4 h-4 mr-2" />
                Liste
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => navigate('/events/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel événement
          </Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <EventCalendar
          events={events}
          onEventClick={handleEventClick}
          onDateSelect={handleDateSelect}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Vue liste - Utilisez la page Événements pour voir la liste complète
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate('/events')}
          >
            Aller à la liste des événements
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventCalendarPage;

