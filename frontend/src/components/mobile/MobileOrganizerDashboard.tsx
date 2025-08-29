// src/components/mobile/MobileOrganizerDashboard.tsx - Dashboard mobile pour organisateurs

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Settings,
  RefreshCw,
  Eye,
  Download,
  Send,
  BarChart3,
  Calendar,
  MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';

interface EventSummary {
  id: string;
  title: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  totalParticipants: number;
  checkedInCount: number;
  lateCount: number;
  attendanceRate: number;
  capacity?: number;
  alerts: Alert[];
}

interface Alert {
  id: string;
  type: 'capacity' | 'late_arrivals' | 'low_attendance' | 'technical';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  acknowledged: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  action: () => void;
  disabled?: boolean;
}

interface MobileOrganizerDashboardProps {
  organizerId: string;
}

const MobileOrganizerDashboard = ({ organizerId }: MobileOrganizerDashboardProps) => {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
    
    // Actualisation automatique toutes les 30 secondes
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, [organizerId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizers/${organizerId}/dashboard`);
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.data.events || []);
        setAlerts(data.data.alerts || []);
        setLastUpdate(new Date());
        
        // Sélectionner automatiquement l'événement en cours
        const ongoingEvent = data.data.events?.find((e: EventSummary) => e.status === 'ongoing');
        if (ongoingEvent) {
          setSelectedEvent(ongoingEvent);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const sendReminder = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/send-reminder`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Rappels envoyés avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi des rappels');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi des rappels');
    }
  };

  const exportAttendance = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/export-attendance`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${eventId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Export téléchargé');
      } else {
        toast.error('Erreur lors de l\'export');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const getQuickActions = (event: EventSummary): QuickAction[] => {
    return [
      {
        id: 'view-details',
        label: 'Détails',
        icon: Eye,
        action: () => setSelectedEvent(event)
      },
      {
        id: 'send-reminder',
        label: 'Rappel',
        icon: Send,
        action: () => sendReminder(event.id),
        disabled: event.status === 'ended'
      },
      {
        id: 'export',
        label: 'Export',
        icon: Download,
        action: () => exportAttendance(event.id)
      },
      {
        id: 'analytics',
        label: 'Stats',
        icon: BarChart3,
        action: () => {
          // Navigation vers les analytics
          window.location.href = `/events/${event.id}/analytics`;
        }
      }
    ];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', { 
      day: '2-digit',
      month: '2-digit'
    });
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Dashboard Organisateur</h1>
              <p className="text-xs text-gray-500">
                Dernière mise à jour: {formatTime(lastUpdate)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {unacknowledgedAlerts.length > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  {unacknowledgedAlerts.length}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {unacknowledgedAlerts.slice(0, 3).map(alert => (
            <Alert key={alert.id} className={getAlertColor(alert.severity)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm">{alert.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => acknowledgeAlert(alert.id)}
                  className="ml-2 h-6 px-2"
                >
                  OK
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Vue détaillée d'un événement */}
      {selectedEvent && (
        <div className="px-4 py-4">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{selectedEvent.title}</CardTitle>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getStatusColor(selectedEvent.status)}>
                      {selectedEvent.status === 'ongoing' ? 'En cours' : 
                       selectedEvent.status === 'upcoming' ? 'À venir' : 'Terminé'}
                    </Badge>
                    {selectedEvent.location && (
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedEvent.location}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Métriques principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedEvent.checkedInCount}
                  </div>
                  <div className="text-xs text-gray-500">Présents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedEvent.totalParticipants}
                  </div>
                  <div className="text-xs text-gray-500">Inscrits</div>
                </div>
              </div>

              {/* Taux de présence */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Taux de présence</span>
                  <span className="font-medium">{selectedEvent.attendanceRate.toFixed(1)}%</span>
                </div>
                <Progress value={selectedEvent.attendanceRate} className="h-2" />
              </div>

              {/* Capacité si définie */}
              {selectedEvent.capacity && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Capacité</span>
                    <span className="font-medium">
                      {selectedEvent.checkedInCount} / {selectedEvent.capacity}
                    </span>
                  </div>
                  <Progress 
                    value={(selectedEvent.checkedInCount / selectedEvent.capacity) * 100} 
                    className="h-2" 
                  />
                </div>
              )}

              {/* Retards */}
              {selectedEvent.lateCount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-orange-500" />
                    Retards
                  </span>
                  <span className="font-medium text-orange-600">
                    {selectedEvent.lateCount}
                  </span>
                </div>
              )}

              {/* Horaires */}
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>
                    {formatDate(selectedEvent.startDateTime)} • {formatTime(selectedEvent.startDateTime)} - {formatTime(selectedEvent.endDateTime)}
                  </span>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="grid grid-cols-2 gap-2">
                {getQuickActions(selectedEvent).map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      onClick={action.action}
                      disabled={action.disabled}
                      className="flex items-center justify-center space-x-1"
                    >
                      <Icon className="w-3 h-3" />
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste des événements */}
      <div className="px-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Mes événements {!selectedEvent && `(${events.length})`}
        </h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun événement à organiser</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events
              .filter(event => !selectedEvent || event.id !== selectedEvent.id)
              .map(event => (
              <Card key={event.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm leading-tight">{event.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getStatusColor(event.status)} size="sm">
                          {event.status === 'ongoing' ? 'En cours' : 
                           event.status === 'upcoming' ? 'À venir' : 'Terminé'}
                        </Badge>
                        {event.alerts.length > 0 && (
                          <Badge className="bg-red-100 text-red-800" size="sm">
                            {event.alerts.length} alerte{event.alerts.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {event.checkedInCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        / {event.totalParticipants}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Présence</span>
                      <span>{event.attendanceRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={event.attendanceRate} className="h-1" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>
                        {formatDate(event.startDateTime)} • {formatTime(event.startDateTime)}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEvent(event)}
                      className="h-6 px-2 text-xs"
                    >
                      Voir détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileOrganizerDashboard;