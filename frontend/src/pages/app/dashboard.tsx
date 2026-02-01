import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  Plus, 
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';

interface DashboardStats {
  eventsCreated: number;
  upcomingEvents: number;
  totalParticipants: number;
  totalRevenue: number;
}

interface Event {
  id: string;
  title: string;
  coverImage: string;
  date: string;
  status: 'active' | 'past' | 'draft';
  participants: number;
  capacity: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const [stats, setStats] = useState<DashboardStats>({
    eventsCreated: 12,
    upcomingEvents: 5,
    totalParticipants: 342,
    totalRevenue: 8450
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Mock events data
  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Tech Conference 2026',
      coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=225&fit=crop',
      date: '2026-03-15T09:00:00',
      status: 'active',
      participants: 85,
      capacity: 100
    },
    {
      id: '2',
      title: 'Music Festival Summer',
      coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=225&fit=crop',
      date: '2026-06-20T18:00:00',
      status: 'active',
      participants: 250,
      capacity: 500
    },
    {
      id: '3',
      title: 'Business Networking Event',
      coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=225&fit=crop',
      date: '2026-02-10T19:00:00',
      status: 'past',
      participants: 45,
      capacity: 50
    },
    {
      id: '4',
      title: 'Art Exhibition Opening',
      coverImage: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=400&h=225&fit=crop',
      date: '2026-04-05T14:00:00',
      status: 'draft',
      participants: 0,
      capacity: 75
    }
  ];

  const loadDashboardData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

  const handleEdit = (eventId: string) => {
    router.push(`/app/events/${eventId}/edit`);
  };

  const handleDelete = (eventId: string) => {
    // TODO: Implement delete confirmation and API call
    console.log('Delete event:', eventId);
  };

  const handleView = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: Event['status']) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      past: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-200',
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
    };
    
    return (
      <Badge className={variants[status]}>
        {t(`status.${status}`)}
      </Badge>
    );
  };

  const filterEvents = (status: string) => {
    if (status === 'all') return events;
    return events.filter(event => event.status === status);
  };

  const filteredEvents = filterEvents(activeTab);

  if (loading) {
    return (
      <AppShell title={t('dashboard.title')}>
        <div className="p-6 flex items-center justify-center min-h-[400px]" data-cy="loading-indicator">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('dashboard.title')}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto pb-20">
        {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2" data-cy="page-title">
                <TrendingUp className="h-6 w-6" />
                {t('dashboard.title')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleRefresh} 
                disabled={refreshing}
                variant="outline"
                data-cy="refresh-dashboard"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
              <Button 
                onClick={() => router.push('/app/events/create')}
                data-cy="create-event"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('common.create')} {t('navigation.events')}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-cy="dashboard-stats">
            <StatCard
              icon={Calendar}
              label={t('dashboard.stats.events_created')}
              value={stats.eventsCreated}
              trend={{ direction: 'up', percentage: 12.5 }}
              color="blue"
              data-cy="stat-events-created"
            />
            
            <StatCard
              icon={TrendingUp}
              label={t('dashboard.stats.upcoming_events')}
              value={stats.upcomingEvents}
              trend={{ direction: 'up', percentage: 8.3 }}
              color="green"
              data-cy="stat-upcoming-events"
            />
            
            <StatCard
              icon={Users}
              label={t('dashboard.stats.total_participants')}
              value={stats.totalParticipants}
              trend={{ direction: 'up', percentage: 15.7 }}
              color="orange"
              data-cy="stat-total-participants"
            />
            
            <StatCard
              icon={DollarSign}
              label={t('dashboard.stats.total_revenue')}
              value={`$${stats.totalRevenue.toLocaleString()}`}
              trend={{ direction: 'up', percentage: 22.1 }}
              color="purple"
              data-cy="stat-total-revenue"
            />
          </div>

          {/* Events Table with Tabs */}
          <Card data-cy="events-table-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('navigation.events')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all" data-cy="tab-all">
                    {t('dashboard.tabs.all')}
                  </TabsTrigger>
                  <TabsTrigger value="active" data-cy="tab-active">
                    {t('dashboard.tabs.active')}
                  </TabsTrigger>
                  <TabsTrigger value="past" data-cy="tab-past">
                    {t('dashboard.tabs.past')}
                  </TabsTrigger>
                  <TabsTrigger value="draft" data-cy="tab-drafts">
                    {t('dashboard.tabs.drafts')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                  {filteredEvents.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">{t('dashboard.table.thumbnail')}</TableHead>
                            <TableHead>{t('dashboard.table.name')}</TableHead>
                            <TableHead>{t('dashboard.table.date')}</TableHead>
                            <TableHead>{t('dashboard.table.status')}</TableHead>
                            <TableHead>{t('dashboard.table.participants')}</TableHead>
                            <TableHead className="text-right">{t('dashboard.table.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEvents.map((event) => (
                            <TableRow key={event.id} data-cy={`event-row-${event.id}`}>
                              <TableCell>
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                                  <Image
                                    src={event.coverImage}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{event.title}</TableCell>
                              <TableCell>{formatDate(event.date)}</TableCell>
                              <TableCell>{getStatusBadge(event.status)}</TableCell>
                              <TableCell>
                                {event.participants} / {event.capacity}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleView(event.id)}
                                    data-cy={`view-event-${event.id}`}
                                    aria-label={t('dashboard.actions.view')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(event.id)}
                                    data-cy={`edit-event-${event.id}`}
                                    aria-label={t('dashboard.actions.edit')}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(event.id)}
                                    data-cy={`delete-event-${event.id}`}
                                    aria-label={t('dashboard.actions.delete')}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12" data-cy="no-events-message">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                        {t('dashboard.table.no_events')}
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
                        {t('dashboard.table.create_first')}
                      </p>
                      <Button onClick={() => router.push('/app/events/create')}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('common.create')} {t('navigation.events')}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
    </AppShell>
  );
}