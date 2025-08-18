/**
 * Dashboard d'analytics pour les événements avec métriques temps réel
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { analyticsService, EventAnalyticsData, OrganizationAnalytics } from '@/services/analyticsService';
import { eventService } from '@/services/eventService';
import { Event, EventType, EventStatus } from '@attendance-x/shared';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

interface EventAnalyticsDashboardProps {
  organizationId: string;
  eventId?: string; // Si fourni, affiche les analytics d'un événement spécifique
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const EventAnalyticsDashboard: React.FC<EventAnalyticsDashboardProps> = ({
  organizationId,
  eventId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalyticsData | null>(null);
  const [organizationAnalytics, setOrganizationAnalytics] = useState<OrganizationAnalytics | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, [organizationId, selectedEventId, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les événements pour le sélecteur
      const eventsResponse = await eventService.getEvents({
        limit: 100,
        sortBy: 'startDate',
        sortOrder: 'desc'
      });
      
      if (eventsResponse.success) {
        setEvents(eventsResponse.data.items);
        
        // Si aucun événement sélectionné, prendre le premier
        if (!selectedEventId && eventsResponse.data.items.length > 0) {
          setSelectedEventId(eventsResponse.data.items[0].id);
        }
      }

      // Charger les analytics de l'événement si sélectionné
      if (selectedEventId) {
        const eventAnalyticsResponse = await analyticsService.getEventAnalytics(selectedEventId);
        setEventAnalytics(eventAnalyticsResponse);
      }

      // Charger les analytics de l'organisation
      if (dateRange?.from && dateRange?.to) {
        const orgAnalyticsResponse = await analyticsService.getOrganizationAnalytics(
          organizationId,
          dateRange.from,
          dateRange.to
        );
        setOrganizationAnalytics(orgAnalyticsResponse);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: "Données actualisées",
      description: "Les métriques ont été mises à jour"
    });
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      if (!dateRange?.from || !dateRange?.to) return;

      const blob = await analyticsService.exportAnalytics(organizationId, 'events', {
        format,
        includeCharts: format === 'pdf',
        dateRange: {
          startDate: dateRange.from,
          endDate: dateRange.to
        }
      });

      // Télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-events-${format}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export réussi",
        description: `Les données ont été exportées en ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    change?: number,
    icon: React.ReactNode,
    description?: string
  ) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end">
            {icon}
            {change !== undefined && (
              <div className={`flex items-center mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm ml-1">{Math.abs(change)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics des Événements</h1>
          <p className="text-muted-foreground">
            Métriques et rapports de performance des événements
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner un événement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les événements</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Select onValueChange={(format) => handleExport(format as 'csv' | 'excel' | 'pdf')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Exporter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="teams">Équipes</TabsTrigger>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métriques principales */}
          {organizationAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard(
                "Total Événements",
                organizationAnalytics.totalEvents,
                undefined,
                <Calendar className="h-8 w-8 text-blue-600" />
              )}
              {renderMetricCard(
                "Total Participants",
                organizationAnalytics.totalParticipants.toLocaleString(),
                undefined,
                <Users className="h-8 w-8 text-green-600" />
              )}
              {renderMetricCard(
                "Taux de Présence Moyen",
                `${organizationAnalytics.averageAttendanceRate.toFixed(1)}%`,
                undefined,
                <CheckCircle className="h-8 w-8 text-purple-600" />
              )}
              {renderMetricCard(
                "Total Présences",
                organizationAnalytics.totalAttendances.toLocaleString(),
                undefined,
                <Clock className="h-8 w-8 text-orange-600" />
              )}
            </div>
          )}

          {/* Graphiques de répartition */}
          {organizationAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par Type d'Événement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={organizationAnalytics.eventsByType}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, count }) => `${type}: ${count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {organizationAnalytics.eventsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition par Statut</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={organizationAnalytics.eventsByStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          {eventAnalytics && (
            <>
              {/* Métriques de l'événement sélectionné */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderMetricCard(
                  "Invités",
                  eventAnalytics.totalInvited,
                  undefined,
                  <Users className="h-8 w-8 text-blue-600" />
                )}
                {renderMetricCard(
                  "Confirmés",
                  eventAnalytics.totalConfirmed,
                  undefined,
                  <CheckCircle className="h-8 w-8 text-green-600" />
                )}
                {renderMetricCard(
                  "Présents",
                  eventAnalytics.totalAttended,
                  undefined,
                  <Clock className="h-8 w-8 text-purple-600" />
                )}
                {renderMetricCard(
                  "Taux de Présence",
                  `${eventAnalytics.attendanceRate.toFixed(1)}%`,
                  undefined,
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                )}
              </div>

              {/* Graphique des présences par heure */}
              <Card>
                <CardHeader>
                  <CardTitle>Présences par Heure</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={eventAnalytics.hourlyAttendance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="checkIns" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {eventAnalytics?.teamBreakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Performance par Équipe</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={eventAnalytics.teamBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teamName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="invited" fill="#8884d8" name="Invités" />
                    <Bar dataKey="attended" fill="#82ca9d" name="Présents" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {organizationAnalytics?.teamPerformance && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {organizationAnalytics.teamPerformance.map((team) => (
                <Card key={team.teamId}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {team.teamName}
                      <Badge variant="secondary">
                        {team.averageAttendanceRate.toFixed(1)}% présence
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Événements organisés:</span>
                        <span className="font-semibold">{team.eventsOrganized}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total participants:</span>
                        <span className="font-semibold">{team.totalParticipants}</span>
                      </div>
                      
                      {team.topPerformers.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2">Top Performers:</h4>
                          {team.topPerformers.slice(0, 3).map((performer) => (
                            <div key={performer.userId} className="flex justify-between text-sm">
                              <span>{performer.userName}</span>
                              <span>{performer.attendanceRate.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {organizationAnalytics?.trends && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Tendances Mensuelles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={organizationAnalytics.trends.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="events" stroke="#8884d8" name="Événements" />
                      <Line type="monotone" dataKey="attendances" stroke="#82ca9d" name="Présences" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taux de Présence par Semaine</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={organizationAnalytics.trends.weekly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="rate" stroke="#8884d8" fill="#8884d8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};