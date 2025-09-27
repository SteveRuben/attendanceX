import React, { useState, useEffect } from 'react';
import { Badge } from '../../ui/badge';
import {
  Calendar,
  Clock,
  Send,
  Eye,
  MousePointer,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CampaignTimelineProps {
  organizationId: string;
  timeRange: string;
}

interface TimelineEvent {
  id: string;
  campaignId: string;
  campaignName: string;
  type: 'created' | 'scheduled' | 'sent' | 'milestone';
  timestamp: string;
  description: string;
  metrics?: {
    recipients?: number;
    openRate?: number;
    clickRate?: number;
  };
  status: 'success' | 'warning' | 'info';
}

export const CampaignTimeline: React.FC<CampaignTimelineProps> = ({
  organizationId,
  timeRange
}) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimelineData();
  }, [organizationId, timeRange]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);

      // Mock data
      const mockEvents: TimelineEvent[] = [
        {
          id: '1',
          campaignId: 'camp-1',
          campaignName: 'Newsletter Janvier',
          type: 'milestone',
          timestamp: '2024-01-30T14:30:00Z',
          description: '1000ème ouverture atteinte',
          metrics: { openRate: 68.4 },
          status: 'success'
        },
        {
          id: '2',
          campaignId: 'camp-2',
          campaignName: 'Rappel Événement',
          type: 'sent',
          timestamp: '2024-01-30T09:00:00Z',
          description: 'Campagne envoyée avec succès',
          metrics: { recipients: 180 },
          status: 'success'
        },
        {
          id: '3',
          campaignId: 'camp-3',
          campaignName: 'Annonce Produit',
          type: 'milestone',
          timestamp: '2024-01-29T16:45:00Z',
          description: 'Taux de clic exceptionnel (>25%)',
          metrics: { clickRate: 27.3 },
          status: 'success'
        },
        {
          id: '4',
          campaignId: 'camp-4',
          campaignName: 'Communication RH',
          type: 'scheduled',
          timestamp: '2024-01-29T11:20:00Z',
          description: 'Campagne programmée pour demain 9h',
          status: 'info'
        },
        {
          id: '5',
          campaignId: 'camp-1',
          campaignName: 'Newsletter Janvier',
          type: 'sent',
          timestamp: '2024-01-28T08:00:00Z',
          description: 'Campagne envoyée à 1250 destinataires',
          metrics: { recipients: 1250 },
          status: 'success'
        },
        {
          id: '6',
          campaignId: 'camp-5',
          campaignName: 'Invitation Webinar',
          type: 'created',
          timestamp: '2024-01-27T14:15:00Z',
          description: 'Nouvelle campagne créée',
          status: 'info'
        },
        {
          id: '7',
          campaignId: 'camp-2',
          campaignName: 'Rappel Événement',
          type: 'milestone',
          timestamp: '2024-01-26T10:30:00Z',
          description: 'Taux d\'ouverture faible (<50%)',
          metrics: { openRate: 42.1 },
          status: 'warning'
        }
      ];

      setTimelineEvents(mockEvents);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string, status: string) => {
    switch (type) {
      case 'created':
        return <Calendar className="h-4 w-4" />;
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'milestone':
        return status === 'warning' ? <AlertCircle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      created: 'Créée',
      scheduled: 'Programmée',
      sent: 'Envoyée',
      milestone: 'Jalon'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `Il y a ${diffInMinutes}min`;
    }
    if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    }
    if (diffInHours < 48) {
      return 'Hier';
    }

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupEventsByDate = (events: TimelineEvent[]) => {
    const groups: { [key: string]: TimelineEvent[] } = {};

    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return Object.entries(groups).sort(([a], [b]) =>
      new Date(b).getTime() - new Date(a).getTime()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(timelineEvents);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Activité récente</h4>
        <span className="text-xs text-gray-500">
          {timelineEvents.length} événements
        </span>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {groupedEvents.map(([dateString, events]) => (
          <div key={dateString} className="space-y-2">
            {/* Séparateur de date */}
            <div className="flex items-center gap-2">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                {new Date(dateString).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            {/* Événements du jour */}
            <div className="space-y-3">
              {events.map((event, index) => (
                <div key={event.id} className="flex items-start gap-3">
                  {/* Icône et ligne */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(event.status)}`}>
                      {getEventIcon(event.type, event.status)}
                    </div>
                    {index < events.length - 1 && (
                      <div className="w-px h-6 bg-gray-200 mt-2"></div>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(event.type)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {event.campaignName}
                    </p>

                    <p className="text-xs text-gray-600 mb-2">
                      {event.description}
                    </p>

                    {/* Métriques */}
                    {event.metrics && (
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {event.metrics.recipients && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.metrics.recipients.toLocaleString()}
                          </div>
                        )}
                        {event.metrics.openRate && (
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {event.metrics.openRate.toFixed(1)}%
                          </div>
                        )}
                        {event.metrics.clickRate && (
                          <div className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" />
                            {event.metrics.clickRate.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {timelineEvents.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            Aucune activité récente
          </div>
        )}
      </div>

      {/* Résumé */}
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Activité des {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} derniers jours</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Succès</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Attention</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Info</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};