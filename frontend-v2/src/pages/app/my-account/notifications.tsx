import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Volume2, 
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  Save,
  Settings
} from 'lucide-react';

export default function NotificationsPage() {
  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      eventReminders: false,
      attendanceAlerts: false,
      teamUpdates: false,
      systemNotifications: false,
      weeklyReports: false,
      marketingEmails: false
    },
    push: {
      eventReminders: false,
      attendanceAlerts: false,
      teamUpdates: false,
      systemNotifications: false,
      urgentAlerts: false
    },
    sound: {
      enabled: false,
      volume: 50,
      urgentOnly: true
    },
    schedule: {
      quietHours: false,
      startTime: '22:00',
      endTime: '08:00',
      weekendsOnly: false
    }
  });

  const [recentNotifications] = useState([]);

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setNotificationSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    // Logique de sauvegarde des paramètres
    console.log('Saving notification settings:', notificationSettings);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'attendance':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'team':
        return <Users className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationBadge = (read: boolean) => {
    return read ? null : (
      <Badge className="bg-blue-100 text-blue-800 text-xs">
        Nouveau
      </Badge>
    );
  };

  return (
    <AppShell title="Notifications">
      <div className="h-full overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 max-w-4xl mx-auto pb-20">
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-10 pb-4 mb-2">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Bell className="h-6 w-6" />
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez vos préférences de notifications et consultez l'historique
              </p>
            </div>
          </div>

          {/* Notifications par Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notifications par Email
              </CardTitle>
              <CardDescription>
                Configurez les types d'emails que vous souhaitez recevoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="eventReminders">Rappels d'événements</Label>
                    <p className="text-sm text-muted-foreground">Notifications avant le début des événements</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="eventReminders" 
                    className="rounded"
                    checked={notificationSettings.email.eventReminders}
                    onChange={(e) => handleSettingChange('email', 'eventReminders', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="attendanceAlerts">Alertes de présence</Label>
                    <p className="text-sm text-muted-foreground">Check-in manqués, retards, etc.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="attendanceAlerts" 
                    className="rounded"
                    checked={notificationSettings.email.attendanceAlerts}
                    onChange={(e) => handleSettingChange('email', 'attendanceAlerts', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="teamUpdates">Mises à jour d'équipe</Label>
                    <p className="text-sm text-muted-foreground">Invitations, changements de rôle, etc.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="teamUpdates" 
                    className="rounded"
                    checked={notificationSettings.email.teamUpdates}
                    onChange={(e) => handleSettingChange('email', 'teamUpdates', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="systemNotifications">Notifications système</Label>
                    <p className="text-sm text-muted-foreground">Maintenance, mises à jour, etc.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="systemNotifications" 
                    className="rounded"
                    checked={notificationSettings.email.systemNotifications}
                    onChange={(e) => handleSettingChange('email', 'systemNotifications', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyReports">Rapports hebdomadaires</Label>
                    <p className="text-sm text-muted-foreground">Résumé de votre activité</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="weeklyReports" 
                    className="rounded"
                    checked={notificationSettings.email.weeklyReports}
                    onChange={(e) => handleSettingChange('email', 'weeklyReports', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketingEmails">Emails marketing</Label>
                    <p className="text-sm text-muted-foreground">Nouvelles fonctionnalités, conseils, etc.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="marketingEmails" 
                    className="rounded"
                    checked={notificationSettings.email.marketingEmails}
                    onChange={(e) => handleSettingChange('email', 'marketingEmails', e.target.checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Push */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Notifications Push
              </CardTitle>
              <CardDescription>
                Notifications instantanées sur votre navigateur ou appareil mobile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushEventReminders">Rappels d'événements</Label>
                    <p className="text-sm text-muted-foreground">Notifications push avant les événements</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="pushEventReminders" 
                    className="rounded"
                    checked={notificationSettings.push.eventReminders}
                    onChange={(e) => handleSettingChange('push', 'eventReminders', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushAttendanceAlerts">Alertes de présence</Label>
                    <p className="text-sm text-muted-foreground">Rappels de check-in/out</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="pushAttendanceAlerts" 
                    className="rounded"
                    checked={notificationSettings.push.attendanceAlerts}
                    onChange={(e) => handleSettingChange('push', 'attendanceAlerts', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushTeamUpdates">Mises à jour d'équipe</Label>
                    <p className="text-sm text-muted-foreground">Notifications instantanées d'équipe</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="pushTeamUpdates" 
                    className="rounded"
                    checked={notificationSettings.push.teamUpdates}
                    onChange={(e) => handleSettingChange('push', 'teamUpdates', e.target.checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="urgentAlerts">Alertes urgentes</Label>
                    <p className="text-sm text-muted-foreground">Notifications critiques uniquement</p>
                  </div>
                  <input 
                    type="checkbox" 
                    id="urgentAlerts" 
                    className="rounded"
                    checked={notificationSettings.push.urgentAlerts}
                    onChange={(e) => handleSettingChange('push', 'urgentAlerts', e.target.checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Sonores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Notifications Sonores
              </CardTitle>
              <CardDescription>
                Configuration des alertes sonores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="soundEnabled">Activer les sons</Label>
                  <p className="text-sm text-muted-foreground">Sons pour les notifications</p>
                </div>
                <input 
                  type="checkbox" 
                  id="soundEnabled" 
                  className="rounded"
                  checked={notificationSettings.sound.enabled}
                  onChange={(e) => handleSettingChange('sound', 'enabled', e.target.checked)}
                />
              </div>

              {notificationSettings.sound.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="volume">Volume ({notificationSettings.sound.volume}%)</Label>
                    <input
                      type="range"
                      id="volume"
                      min="0"
                      max="100"
                      value={notificationSettings.sound.volume}
                      onChange={(e) => handleSettingChange('sound', 'volume', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="urgentOnly" 
                      className="rounded"
                      checked={notificationSettings.sound.urgentOnly}
                      onChange={(e) => handleSettingChange('sound', 'urgentOnly', e.target.checked)}
                    />
                    <Label htmlFor="urgentOnly">Sons uniquement pour les alertes urgentes</Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Heures de Silence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Heures de Silence
              </CardTitle>
              <CardDescription>
                Définissez des périodes sans notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="quietHours">Activer les heures de silence</Label>
                  <p className="text-sm text-muted-foreground">Désactiver les notifications pendant certaines heures</p>
                </div>
                <input 
                  type="checkbox" 
                  id="quietHours" 
                  className="rounded"
                  checked={notificationSettings.schedule.quietHours}
                  onChange={(e) => handleSettingChange('schedule', 'quietHours', e.target.checked)}
                />
              </div>

              {notificationSettings.schedule.quietHours && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Début</Label>
                    <input
                      type="time"
                      id="startTime"
                      value={notificationSettings.schedule.startTime}
                      onChange={(e) => handleSettingChange('schedule', 'startTime', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Fin</Label>
                    <input
                      type="time"
                      id="endTime"
                      value={notificationSettings.schedule.endTime}
                      onChange={(e) => handleSettingChange('schedule', 'endTime', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications Récentes */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications Récentes</CardTitle>
              <CardDescription>
                Historique de vos dernières notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentNotifications.length > 0 ? (
                <div className="space-y-3">
                  {recentNotifications.map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="p-2 bg-muted rounded-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{notification.title}</h4>
                          {getNotificationBadge(notification.read)}
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune notification</h3>
                  <p className="text-muted-foreground">
                    Vous n'avez pas encore reçu de notifications.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline">
              Réinitialiser
            </Button>
            <Button onClick={handleSaveSettings}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les paramètres
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}