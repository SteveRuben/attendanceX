// src/components/integrations/IntegrationSettings.tsx - Paramètres d'intégration

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Settings, 
  Mail, 
  Slack, 
  MessageSquare, 
  Database, 
  Calendar,
  Users,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  Trash2,
  Plus
} from 'lucide-react';
import { toast } from 'react-toastify';

interface EmailIntegration {
  id: string;
  name: string;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  settings: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    apiKey?: string;
    fromEmail: string;
    fromName: string;
  };
  isActive: boolean;
  lastUsed?: Date;
}

interface SlackIntegration {
  id: string;
  name: string;
  webhookUrl: string;
  channel: string;
  username: string;
  iconEmoji: string;
  isActive: boolean;
  events: string[];
}

interface PayrollIntegration {
  id: string;
  name: string;
  systemType: 'sage' | 'adp' | 'workday' | 'bamboohr' | 'custom';
  apiEndpoint?: string;
  apiKey?: string;
  mappingConfig: {
    employeeIdField: string;
    timeEntryFields: Record<string, string>;
    categoryMapping: Record<string, string>;
  };
  isActive: boolean;
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  lastSyncAt?: Date;
}

interface CalendarIntegration {
  id: string;
  name: string;
  provider: 'google' | 'outlook' | 'exchange';
  settings: {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    calendarId?: string;
  };
  isActive: boolean;
  syncEvents: boolean;
  createMeetings: boolean;
}

interface IntegrationSettingsProps {
  organizationId: string;
}

const IntegrationSettings = ({ organizationId }: IntegrationSettingsProps) => {
  const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegration[]>([]);
  const [slackIntegrations, setSlackIntegrations] = useState<SlackIntegration[]>([]);
  const [payrollIntegrations, setPayrollIntegrations] = useState<PayrollIntegration[]>([]);
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, [organizationId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizations/${organizationId}/integrations`);
      const data = await response.json();
      
      if (data.success) {
        setEmailIntegrations(data.data.email || []);
        setSlackIntegrations(data.data.slack || []);
        setPayrollIntegrations(data.data.payroll || []);
        setCalendarIntegrations(data.data.calendar || []);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Erreur lors du chargement des intégrations');
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (type: string, integrationId: string) => {
    try {
      setTestingIntegration(integrationId);
      const response = await fetch(`/api/integrations/${type}/${integrationId}/test`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Test d\'intégration réussi');
      } else {
        toast.error(data.error || 'Test d\'intégration échoué');
      }
    } catch (error) {
      toast.error('Erreur lors du test d\'intégration');
    } finally {
      setTestingIntegration(null);
    }
  };

  const saveEmailIntegration = async (integration: EmailIntegration) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/email${integration.id ? `/${integration.id}` : ''}`, {
        method: integration.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...integration, organizationId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadIntegrations();
        toast.success('Intégration email sauvegardée');
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const saveSlackIntegration = async (integration: SlackIntegration) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/slack${integration.id ? `/${integration.id}` : ''}`, {
        method: integration.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...integration, organizationId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadIntegrations();
        toast.success('Intégration Slack sauvegardée');
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const deleteIntegration = async (type: string, integrationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette intégration ?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/${type}/${integrationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadIntegrations();
        toast.success('Intégration supprimée');
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean, lastUsed?: Date) => {
    if (!isActive) {
      return <Badge variant="outline" className="text-gray-600">Inactive</Badge>;
    }
    
    if (lastUsed) {
      const daysSinceLastUse = Math.floor((Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastUse < 7) {
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      } else {
        return <Badge className="bg-yellow-100 text-yellow-800">Peu utilisée</Badge>;
      }
    }
    
    return <Badge className="bg-blue-100 text-blue-800">Configurée</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Intégrations
          </h2>
          <p className="text-muted-foreground">
            Configurez les intégrations avec les systèmes externes
          </p>
        </div>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="slack">Slack</TabsTrigger>
          <TabsTrigger value="payroll">Paie</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Intégrations Email</h3>
            <Button onClick={() => {
              const newIntegration: EmailIntegration = {
                id: '',
                name: 'Nouvelle intégration email',
                provider: 'smtp',
                settings: {
                  fromEmail: '',
                  fromName: ''
                },
                isActive: false
              };
              setEmailIntegrations([...emailIntegrations, newIntegration]);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          {emailIntegrations.map((integration, index) => (
            <Card key={integration.id || index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Mail className="w-5 h-5 mr-2" />
                    {integration.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(integration.isActive, integration.lastUsed)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testIntegration('email', integration.id)}
                      disabled={testingIntegration === integration.id}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      {testingIntegration === integration.id ? 'Test...' : 'Tester'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteIntegration('email', integration.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`email-name-${index}`}>Nom</Label>
                    <Input
                      id={`email-name-${index}`}
                      value={integration.name}
                      onChange={(e) => {
                        const updated = [...emailIntegrations];
                        updated[index].name = e.target.value;
                        setEmailIntegrations(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-provider-${index}`}>Fournisseur</Label>
                    <Select
                      value={integration.provider}
                      onValueChange={(value) => {
                        const updated = [...emailIntegrations];
                        updated[index].provider = value as any;
                        setEmailIntegrations(updated);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                        <SelectItem value="ses">Amazon SES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`email-from-${index}`}>Email expéditeur</Label>
                    <Input
                      id={`email-from-${index}`}
                      type="email"
                      value={integration.settings.fromEmail}
                      onChange={(e) => {
                        const updated = [...emailIntegrations];
                        updated[index].settings.fromEmail = e.target.value;
                        setEmailIntegrations(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`email-from-name-${index}`}>Nom expéditeur</Label>
                    <Input
                      id={`email-from-name-${index}`}
                      value={integration.settings.fromName}
                      onChange={(e) => {
                        const updated = [...emailIntegrations];
                        updated[index].settings.fromName = e.target.value;
                        setEmailIntegrations(updated);
                      }}
                    />
                  </div>
                </div>

                {integration.provider === 'smtp' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`smtp-host-${index}`}>Serveur SMTP</Label>
                      <Input
                        id={`smtp-host-${index}`}
                        value={integration.settings.host || ''}
                        onChange={(e) => {
                          const updated = [...emailIntegrations];
                          updated[index].settings.host = e.target.value;
                          setEmailIntegrations(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`smtp-port-${index}`}>Port</Label>
                      <Input
                        id={`smtp-port-${index}`}
                        type="number"
                        value={integration.settings.port || 587}
                        onChange={(e) => {
                          const updated = [...emailIntegrations];
                          updated[index].settings.port = parseInt(e.target.value);
                          setEmailIntegrations(updated);
                        }}
                      />
                    </div>
                  </div>
                )}

                {(integration.provider === 'sendgrid' || integration.provider === 'mailgun' || integration.provider === 'ses') && (
                  <div>
                    <Label htmlFor={`api-key-${index}`}>Clé API</Label>
                    <Input
                      id={`api-key-${index}`}
                      type="password"
                      value={integration.settings.apiKey || ''}
                      onChange={(e) => {
                        const updated = [...emailIntegrations];
                        updated[index].settings.apiKey = e.target.value;
                        setEmailIntegrations(updated);
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integration.isActive}
                      onCheckedChange={(checked) => {
                        const updated = [...emailIntegrations];
                        updated[index].isActive = checked;
                        setEmailIntegrations(updated);
                      }}
                    />
                    <Label>Activer cette intégration</Label>
                  </div>
                  
                  <Button onClick={() => saveEmailIntegration(integration)} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="slack" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Intégrations Slack</h3>
            <Button onClick={() => {
              const newIntegration: SlackIntegration = {
                id: '',
                name: 'Nouvelle intégration Slack',
                webhookUrl: '',
                channel: '#general',
                username: 'AttendanceX',
                iconEmoji: ':calendar:',
                isActive: false,
                events: []
              };
              setSlackIntegrations([...slackIntegrations, newIntegration]);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>

          {slackIntegrations.map((integration, index) => (
            <Card key={integration.id || index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Slack className="w-5 h-5 mr-2" />
                    {integration.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(integration.isActive)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testIntegration('slack', integration.id)}
                      disabled={testingIntegration === integration.id}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      {testingIntegration === integration.id ? 'Test...' : 'Tester'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteIntegration('slack', integration.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`slack-name-${index}`}>Nom</Label>
                  <Input
                    id={`slack-name-${index}`}
                    value={integration.name}
                    onChange={(e) => {
                      const updated = [...slackIntegrations];
                      updated[index].name = e.target.value;
                      setSlackIntegrations(updated);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor={`slack-webhook-${index}`}>URL Webhook</Label>
                  <Input
                    id={`slack-webhook-${index}`}
                    value={integration.webhookUrl}
                    onChange={(e) => {
                      const updated = [...slackIntegrations];
                      updated[index].webhookUrl = e.target.value;
                      setSlackIntegrations(updated);
                    }}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`slack-channel-${index}`}>Canal</Label>
                    <Input
                      id={`slack-channel-${index}`}
                      value={integration.channel}
                      onChange={(e) => {
                        const updated = [...slackIntegrations];
                        updated[index].channel = e.target.value;
                        setSlackIntegrations(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`slack-username-${index}`}>Nom d'utilisateur</Label>
                    <Input
                      id={`slack-username-${index}`}
                      value={integration.username}
                      onChange={(e) => {
                        const updated = [...slackIntegrations];
                        updated[index].username = e.target.value;
                        setSlackIntegrations(updated);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`slack-emoji-${index}`}>Emoji</Label>
                    <Input
                      id={`slack-emoji-${index}`}
                      value={integration.iconEmoji}
                      onChange={(e) => {
                        const updated = [...slackIntegrations];
                        updated[index].iconEmoji = e.target.value;
                        setSlackIntegrations(updated);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label>Événements à notifier</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      'event_created',
                      'event_updated',
                      'attendance_recorded',
                      'capacity_reached',
                      'late_arrivals',
                      'event_completed'
                    ].map(event => (
                      <div key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`${event}-${index}`}
                          checked={integration.events.includes(event)}
                          onChange={(e) => {
                            const updated = [...slackIntegrations];
                            if (e.target.checked) {
                              updated[index].events.push(event);
                            } else {
                              updated[index].events = updated[index].events.filter(e => e !== event);
                            }
                            setSlackIntegrations(updated);
                          }}
                        />
                        <Label htmlFor={`${event}-${index}`} className="text-sm">
                          {event.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integration.isActive}
                      onCheckedChange={(checked) => {
                        const updated = [...slackIntegrations];
                        updated[index].isActive = checked;
                        setSlackIntegrations(updated);
                      }}
                    />
                    <Label>Activer cette intégration</Label>
                  </div>
                  
                  <Button onClick={() => saveSlackIntegration(integration)} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Les intégrations de paie permettent de synchroniser automatiquement les heures de présence 
              avec votre système de paie pour le calcul des heures supplémentaires et compensations.
            </AlertDescription>
          </Alert>

          {payrollIntegrations.map((integration, index) => (
            <Card key={integration.id || index}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  {integration.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Configuration des intégrations de paie</p>
                  <p className="text-sm">Fonctionnalité disponible dans la version Pro</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              Les intégrations calendrier permettent de synchroniser automatiquement les événements 
              avec Google Calendar, Outlook ou Exchange.
            </AlertDescription>
          </Alert>

          {calendarIntegrations.map((integration, index) => (
            <Card key={integration.id || index}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  {integration.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Configuration des intégrations calendrier</p>
                  <p className="text-sm">Fonctionnalité disponible dans la version Pro</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationSettings;