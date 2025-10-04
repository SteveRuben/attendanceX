import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/badge';
import {
  Calendar,
  Users,
  Mail,
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Zap
} from 'lucide-react';

interface EventTrigger {
  id: string;
  name: string;
  description: string;
  eventType: 'event_created' | 'event_updated' | 'event_cancelled' | 'event_reminder' | 'attendance_marked' | 'user_joined';
  status: 'active' | 'paused' | 'draft';
  conditions: {
    eventTypes?: string[];
    daysBeforeEvent?: number;
    hoursBeforeEvent?: number;
    targetAudience: 'participants' | 'organizers' | 'all' | 'non_participants';
  };
  campaign: {
    templateId: string;
    subject: string;
    fromName: string;
    fromEmail: string;
  };
  stats: {
    triggered: number;
    sent: number;
    failed: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface EventTriggeredCampaignsProps {
  organizationId: string;
}

export const EventTriggeredCampaigns: React.FC<EventTriggeredCampaignsProps> = ({ organizationId }) => {
  const [triggers, setTriggers] = useState<EventTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTriggers();
  }, [organizationId]);

  const loadTriggers = async () => {
    setLoading(true);

    const mockTriggers: EventTrigger[] = [
      {
        id: 'trigger-1',
        name: 'Rappel 24h avant événement',
        description: 'Envoyer un rappel aux participants 24h avant le début de l\'événement',
        eventType: 'event_reminder',
        status: 'active',
        conditions: {
          daysBeforeEvent: 1,
          targetAudience: 'participants'
        },
        campaign: {
          templateId: 'template-reminder',
          subject: 'Rappel: {{event.title}} demain',
          fromName: 'Équipe Événements',
          fromEmail: 'events@organization.com'
        },
        stats: {
          triggered: 156,
          sent: 154,
          failed: 2
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'trigger-2',
        name: 'Nouvel événement créé',
        description: 'Notifier tous les membres quand un nouvel événement est créé',
        eventType: 'event_created',
        status: 'active',
        conditions: {
          eventTypes: ['meeting', 'conference', 'training'],
          targetAudience: 'all'
        },
        campaign: {
          templateId: 'template-new-event',
          subject: 'Nouvel événement: {{event.title}}',
          fromName: 'Équipe Événements',
          fromEmail: 'events@organization.com'
        },
        stats: {
          triggered: 45,
          sent: 45,
          failed: 0
        },
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'trigger-3',
        name: 'Bienvenue nouveau membre',
        description: 'Email de bienvenue automatique pour les nouveaux membres',
        eventType: 'user_joined',
        status: 'active',
        conditions: {
          targetAudience: 'all'
        },
        campaign: {
          templateId: 'template-welcome',
          subject: 'Bienvenue dans notre organisation!',
          fromName: 'Équipe RH',
          fromEmail: 'hr@organization.com'
        },
        stats: {
          triggered: 23,
          sent: 23,
          failed: 0
        },
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    setTriggers(mockTriggers);
    setLoading(false);
  };

  const handleToggleStatus = async (triggerId: string) => {
    setTriggers(triggers.map(t =>
      t.id === triggerId
        ? { ...t, status: t.status === 'active' ? 'paused' : 'active' }
        : t
    ));
  };

  const handleDelete = async (triggerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce déclencheur ?')) {
      setTriggers(triggers.filter(t => t.id !== triggerId));
    }
  };

  const getEventTypeLabel = (type: EventTrigger['eventType']) => {
    const labels = {
      event_created: 'Événement créé',
      event_updated: 'Événement modifié',
      event_cancelled: 'Événement annulé',
      event_reminder: 'Rappel d\'événement',
      attendance_marked: 'Présence marquée',
      user_joined: 'Nouveau membre'
    };
    return labels[type];
  };

  const getStatusBadge = (status: EventTrigger['status']) => {
    const badges = {
      active: <Badge variant="default" className="bg-green-600">Actif</Badge>,
      paused: <Badge variant="secondary">En pause</Badge>,
      draft: <Badge variant="secondary">Brouillon</Badge>
    };
    return badges[status];
  };

  const getAudienceLabel = (audience: string) => {
    const labels = {
      participants: 'Participants',
      organizers: 'Organisateurs',
      all: 'Tous les membres',
      non_participants: 'Non-participants'
    };
    return labels[audience as keyof typeof labels] || audience;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campagnes déclenchées par événements</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automatisez vos communications en fonction des événements
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau déclencheur
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {triggers.map(trigger => (
          <Card key={trigger.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{trigger.name}</h3>
                    {getStatusBadge(trigger.status)}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{trigger.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        Type: <span className="font-medium">{getEventTypeLabel(trigger.eventType)}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        Audience: <span className="font-medium">{getAudienceLabel(trigger.conditions.targetAudience)}</span>
                      </span>
                    </div>

                    {trigger.conditions.daysBeforeEvent && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">
                          Délai: <span className="font-medium">{trigger.conditions.daysBeforeEvent} jour(s) avant</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">
                        Sujet: <span className="font-medium">{trigger.campaign.subject}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600 border-t pt-3">
                    <div>
                      <span className="font-semibold text-gray-900">{trigger.stats.triggered}</span> déclenchés
                    </div>
                    <div>
                      <span className="font-semibold text-green-600">{trigger.stats.sent}</span> envoyés
                    </div>
                    {trigger.stats.failed > 0 && (
                      <div>
                        <span className="font-semibold text-red-600">{trigger.stats.failed}</span> échecs
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {trigger.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(trigger.id)}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(trigger.id)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => console.log('Edit trigger', trigger.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(trigger.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {triggers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                Aucun déclencheur configuré
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier déclencheur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

