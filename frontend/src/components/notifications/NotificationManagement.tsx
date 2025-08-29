// src/components/notifications/NotificationManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Clock, 
  Send, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Calendar,
  User,
  Settings
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms';
  trigger: 'reminder' | 'confirmation' | 'cancellation' | 'rescheduling';
  subject?: string; // For email only
  content: string;
  variables: string[];
  enabled: boolean;
  timing?: number; // Hours before appointment for reminders
  createdAt: string;
  updatedAt: string;
}

interface NotificationHistory {
  id: string;
  templateId: string;
  templateName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  appointmentId: string;
  clientName: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  type: 'email' | 'sms';
  sentAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

interface ReminderConfiguration {
  enabled: boolean;
  emailReminders: {
    enabled: boolean;
    timings: number[]; // Hours before appointment
  };
  smsReminders: {
    enabled: boolean;
    timings: number[]; // Hours before appointment
  };
  confirmationRequired: boolean;
  maxRetries: number;
}

const AVAILABLE_VARIABLES = [
  '{{clientName}}',
  '{{appointmentDate}}',
  '{{appointmentTime}}',
  '{{serviceName}}',
  '{{practitionerName}}',
  '{{organizationName}}',
  '{{confirmationLink}}',
  '{{cancellationLink}}',
  '{{rescheduleLink}}'
];

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Rappel email 24h',
    type: 'email',
    trigger: 'reminder',
    subject: 'Rappel de votre rendez-vous demain',
    content: `Bonjour {{clientName}},

Nous vous rappelons que vous avez un rendez-vous demain :

📅 Date : {{appointmentDate}}
🕐 Heure : {{appointmentTime}}
👨‍⚕️ Praticien : {{practitionerName}}
🏥 Service : {{serviceName}}

Si vous ne pouvez pas vous présenter, merci de nous prévenir au moins 24h à l'avance.

Cordialement,
L'équipe {{organizationName}}`,
    variables: ['clientName', 'appointmentDate', 'appointmentTime', 'practitionerName', 'serviceName', 'organizationName'],
    enabled: true,
    timing: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const NotificationManagement: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(DEFAULT_TEMPLATES);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [reminderConfig, setReminderConfig] = useState<ReminderConfiguration>({
    enabled: true,
    emailReminders: {
      enabled: true,
      timings: [24, 2] // 24h and 2h before
    },
    smsReminders: {
      enabled: false,
      timings: [2] // 2h before
    },
    confirmationRequired: true,
    maxRetries: 3
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<NotificationTemplate>>({
    type: 'email',
    trigger: 'reminder',
    enabled: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API calls
      // const [templatesRes, historyRes, configRes] = await Promise.all([
      //   notificationService.getTemplates(),
      //   notificationService.getHistory(),
      //   notificationService.getReminderConfig()
      // ]);
      
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load mock history data
      const mockHistory: NotificationHistory[] = [
        {
          id: '1',
          templateId: '1',
          templateName: 'Rappel email 24h',
          recipientEmail: 'client@example.com',
          appointmentId: 'apt-1',
          clientName: 'Jean Dupont',
          status: 'delivered',
          type: 'email',
          sentAt: new Date(Date.now() - 86400000).toISOString(),
          deliveredAt: new Date(Date.now() - 86300000).toISOString()
        }
      ];
      
      setHistory(mockHistory);
    } catch (err: any) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: NotificationTemplate) => {
    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await notificationService.saveTemplate(template);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (editingTemplate) {
        setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
      } else {
        setTemplates(prev => [...prev, { ...template, id: Date.now().toString() }]);
      }
      
      setEditingTemplate(null);
      setNewTemplate({ type: 'email', trigger: 'reminder', enabled: true });
      setSuccess('Template sauvegardé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      // TODO: Replace with actual API call
      // await notificationService.deleteTemplate(templateId);
      
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      setSuccess('Template supprimé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de la suppression');
    }
  };

  const sendTestNotification = async (template: NotificationTemplate) => {
    try {
      setSaving(true);
      // TODO: Replace with actual API call
      // await notificationService.sendTest(template.id);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Notification de test envoyée');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Erreur lors de l\'envoi du test');
    } finally {
      setSaving(false);
    }
  };

  const getPreviewContent = (template: NotificationTemplate) => {
    let content = template.content;
    const sampleData = {
      '{{clientName}}': 'Jean Dupont',
      '{{appointmentDate}}': '15 janvier 2024',
      '{{appointmentTime}}': '14:30',
      '{{serviceName}}': 'Consultation générale',
      '{{practitionerName}}': 'Dr. Martin',
      '{{organizationName}}': 'Cabinet Médical',
      '{{confirmationLink}}': 'https://example.com/confirm/123',
      '{{cancellationLink}}': 'https://example.com/cancel/123',
      '{{rescheduleLink}}': 'https://example.com/reschedule/123'
    };

    Object.entries(sampleData).forEach(([variable, value]) => {
      content = content.replace(new RegExp(variable, 'g'), value);
    });

    return content;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des notifications</h1>
          <p className="text-gray-600">Configurez les rappels et notifications automatiques</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <Edit className="w-4 h-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Historique</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Configuration</span>
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Templates de notification</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Nouveau template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Créer un template de notification</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nom du template</Label>
                            <Input
                              value={newTemplate.name || ''}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Ex: Rappel 24h"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={newTemplate.type}
                              onValueChange={(value: 'email' | 'sms') => setNewTemplate(prev => ({ ...prev, type: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Déclencheur</Label>
                            <Select
                              value={newTemplate.trigger}
                              onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, trigger: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reminder">Rappel</SelectItem>
                                <SelectItem value="confirmation">Confirmation</SelectItem>
                                <SelectItem value="cancellation">Annulation</SelectItem>
                                <SelectItem value="rescheduling">Reprogrammation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {newTemplate.trigger === 'reminder' && (
                            <div>
                              <Label>Délai (heures avant)</Label>
                              <Input
                                type="number"
                                value={newTemplate.timing || ''}
                                onChange={(e) => setNewTemplate(prev => ({ ...prev, timing: parseInt(e.target.value) }))}
                                placeholder="24"
                              />
                            </div>
                          )}
                        </div>

                        {newTemplate.type === 'email' && (
                          <div>
                            <Label>Sujet</Label>
                            <Input
                              value={newTemplate.subject || ''}
                              onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                              placeholder="Sujet de l'email"
                            />
                          </div>
                        )}

                        <div>
                          <Label>Contenu</Label>
                          <Textarea
                            value={newTemplate.content || ''}
                            onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Contenu du message..."
                            rows={8}
                          />
                          <div className="mt-2">
                            <p className="text-sm text-gray-600 mb-2">Variables disponibles :</p>
                            <div className="flex flex-wrap gap-1">
                              {AVAILABLE_VARIABLES.map((variable) => (
                                <Badge
                                  key={variable}
                                  variant="outline"
                                  className="cursor-pointer text-xs"
                                  onClick={() => {
                                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                                    if (textarea) {
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const text = textarea.value;
                                      const newText = text.substring(0, start) + variable + text.substring(end);
                                      setNewTemplate(prev => ({ ...prev, content: newText }));
                                    }
                                  }}
                                >
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setNewTemplate({ type: 'email', trigger: 'reminder', enabled: true })}
                          >
                            Annuler
                          </Button>
                          <Button
                            onClick={() => {
                              if (newTemplate.name && newTemplate.content) {
                                saveTemplate({
                                  ...newTemplate,
                                  id: Date.now().toString(),
                                  variables: [],
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString()
                                } as NotificationTemplate);
                              }
                            }}
                            disabled={!newTemplate.name || !newTemplate.content || saving}
                          >
                            {saving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                            Créer
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {template.type === 'email' ? (
                            <Mail className="w-5 h-5 text-blue-600" />
                          ) : (
                            <MessageSquare className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-gray-600">
                              {template.trigger} • {template.type}
                              {template.timing && ` • ${template.timing}h avant`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={template.enabled ? "default" : "secondary"}>
                            {template.enabled ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Switch
                            checked={template.enabled}
                            onCheckedChange={(checked) => {
                              setTemplates(prev => prev.map(t => 
                                t.id === template.id ? { ...t, enabled: checked } : t
                              ));
                            }}
                          />
                        </div>
                      </div>

                      {template.subject && (
                        <p className="text-sm font-medium mb-1">Sujet: {template.subject}</p>
                      )}
                      
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {template.content.substring(0, 150)}...
                      </p>

                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(template)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Aperçu
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Aperçu - {template.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {template.subject && (
                                <div>
                                  <Label className="font-medium">Sujet:</Label>
                                  <p className="text-sm bg-gray-50 p-2 rounded">{template.subject}</p>
                                </div>
                              )}
                              <div>
                                <Label className="font-medium">Contenu:</Label>
                                <div className="text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap">
                                  {getPreviewContent(template)}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendTestNotification(template)}
                          disabled={saving}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Test
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Historique des notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.map((notification) => (
                  <div key={notification.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {notification.type === 'email' ? (
                          <Mail className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-green-600" />
                        )}
                        <div>
                          <h4 className="font-medium">{notification.templateName}</h4>
                          <p className="text-sm text-gray-600">
                            {notification.clientName} • {notification.recipientEmail || notification.recipientPhone}
                          </p>
                          <p className="text-sm text-gray-500">
                            Envoyé le {new Date(notification.sentAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(notification.status)}
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status === 'sent' && 'Envoyé'}
                          {notification.status === 'delivered' && 'Délivré'}
                          {notification.status === 'failed' && 'Échec'}
                          {notification.status === 'pending' && 'En attente'}
                        </Badge>
                      </div>
                    </div>
                    {notification.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Erreur: {notification.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
                
                {history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucune notification envoyée pour le moment</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Configuration des rappels</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Rappels automatiques</Label>
                  <p className="text-sm text-gray-600">
                    Active l'envoi automatique de rappels avant les rendez-vous
                  </p>
                </div>
                <Switch
                  checked={reminderConfig.enabled}
                  onCheckedChange={(checked) => 
                    setReminderConfig(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              {reminderConfig.enabled && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Rappels par email</Label>
                        <p className="text-sm text-gray-600">
                          Envoyer des rappels par email
                        </p>
                      </div>
                      <Switch
                        checked={reminderConfig.emailReminders.enabled}
                        onCheckedChange={(checked) => 
                          setReminderConfig(prev => ({
                            ...prev,
                            emailReminders: { ...prev.emailReminders, enabled: checked }
                          }))
                        }
                      />
                    </div>

                    {reminderConfig.emailReminders.enabled && (
                      <div>
                        <Label>Délais des rappels email (heures avant)</Label>
                        <div className="flex space-x-2 mt-2">
                          {reminderConfig.emailReminders.timings.map((timing, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <Input
                                type="number"
                                value={timing}
                                onChange={(e) => {
                                  const newTimings = [...reminderConfig.emailReminders.timings];
                                  newTimings[index] = parseInt(e.target.value);
                                  setReminderConfig(prev => ({
                                    ...prev,
                                    emailReminders: { ...prev.emailReminders, timings: newTimings }
                                  }));
                                }}
                                className="w-20"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newTimings = reminderConfig.emailReminders.timings.filter((_, i) => i !== index);
                                  setReminderConfig(prev => ({
                                    ...prev,
                                    emailReminders: { ...prev.emailReminders, timings: newTimings }
                                  }));
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReminderConfig(prev => ({
                                ...prev,
                                emailReminders: {
                                  ...prev.emailReminders,
                                  timings: [...prev.emailReminders.timings, 24]
                                }
                              }));
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Rappels par SMS</Label>
                        <p className="text-sm text-gray-600">
                          Envoyer des rappels par SMS
                        </p>
                      </div>
                      <Switch
                        checked={reminderConfig.smsReminders.enabled}
                        onCheckedChange={(checked) => 
                          setReminderConfig(prev => ({
                            ...prev,
                            smsReminders: { ...prev.smsReminders, enabled: checked }
                          }))
                        }
                      />
                    </div>

                    {reminderConfig.smsReminders.enabled && (
                      <div>
                        <Label>Délais des rappels SMS (heures avant)</Label>
                        <div className="flex space-x-2 mt-2">
                          {reminderConfig.smsReminders.timings.map((timing, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              <Input
                                type="number"
                                value={timing}
                                onChange={(e) => {
                                  const newTimings = [...reminderConfig.smsReminders.timings];
                                  newTimings[index] = parseInt(e.target.value);
                                  setReminderConfig(prev => ({
                                    ...prev,
                                    smsReminders: { ...prev.smsReminders, timings: newTimings }
                                  }));
                                }}
                                className="w-20"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newTimings = reminderConfig.smsReminders.timings.filter((_, i) => i !== index);
                                  setReminderConfig(prev => ({
                                    ...prev,
                                    smsReminders: { ...prev.smsReminders, timings: newTimings }
                                  }));
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReminderConfig(prev => ({
                                ...prev,
                                smsReminders: {
                                  ...prev.smsReminders,
                                  timings: [...prev.smsReminders.timings, 2]
                                }
                              }));
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Confirmation requise</Label>
                        <p className="text-sm text-gray-600">
                          Demander une confirmation de présence
                        </p>
                      </div>
                      <Switch
                        checked={reminderConfig.confirmationRequired}
                        onCheckedChange={(checked) => 
                          setReminderConfig(prev => ({ ...prev, confirmationRequired: checked }))
                        }
                      />
                    </div>

                    <div>
                      <Label>Nombre maximum de tentatives</Label>
                      <Input
                        type="number"
                        value={reminderConfig.maxRetries}
                        onChange={(e) => 
                          setReminderConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))
                        }
                        min="1"
                        max="10"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 border-t">
                <Button onClick={() => {
                  // TODO: Save reminder configuration
                  setSuccess('Configuration sauvegardée');
                  setTimeout(() => setSuccess(''), 3000);
                }}>
                  Sauvegarder la configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationManagement;