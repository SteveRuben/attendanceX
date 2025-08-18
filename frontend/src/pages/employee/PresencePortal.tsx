/**
 * Portail de présence pour les employés
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  Alert,
  AlertDescription
} from '@/components/ui';
import {
  Clock,
  Calendar,
  User,
  TrendingUp,
  FileText,
  Settings,
  Bell,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { PresenceTracker } from '@/components/presence/PresenceTracker';
import { ScheduleViewer } from '@/components/presence/ScheduleViewer';
import { LeaveRequestForm } from '@/components/presence/LeaveRequestForm';
import { PresenceHistory } from '@/components/presence/PresenceHistory';
import { PresenceStats } from '@/components/presence/PresenceStats';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';

export const PresencePortal: React.FC = () => {
  const { user } = useAuth();
  const { currentStatus, todayEntry, error: presenceError } = usePresence();
  const { leaveRequests, getLeaveStats } = useLeaveRequests();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  const leaveStats = getLeaveStats();

  // Obtenir le message de bienvenue selon l'heure
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Obtenir les notifications importantes
  const getImportantNotifications = () => {
    const notifications = [];

    // Vérifier si l'employé a oublié de pointer
    if (!todayEntry?.clockInTime && new Date().getHours() > 9) {
      notifications.push({
        type: 'warning',
        message: 'N\'oubliez pas de pointer votre arrivée',
        action: 'Pointer maintenant'
      });
    }

    // Vérifier les demandes de congé en attente
    if (leaveStats.pending > 0) {
      notifications.push({
        type: 'info',
        message: `Vous avez ${leaveStats.pending} demande(s) de congé en attente`,
        action: 'Voir les demandes'
      });
    }

    return notifications;
  };

  const notifications = getImportantNotifications();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête de bienvenue */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {getWelcomeMessage()}, {user?.displayName || user?.email}
          </h1>
          <p className="text-muted-foreground">
            Gérez votre présence et vos congés en toute simplicité
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationCenter />
          <Badge variant={currentStatus?.status === 'working' ? 'success' : 'secondary'}>
            {currentStatus?.status === 'working' ? 'Au travail' : 
             currentStatus?.status === 'on_break' ? 'En pause' :
             currentStatus?.status === 'completed' ? 'Journée terminée' : 'Pas encore pointé'}
          </Badge>
        </div>
      </div>

      {/* Notifications importantes */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification, index) => (
            <Alert key={index} variant={notification.type === 'warning' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{notification.message}</span>
                <Button variant="outline" size="sm">
                  {notification.action}
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Erreurs */}
      {presenceError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{presenceError}</AlertDescription>
        </Alert>
      )}

      {/* Contenu principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Mon horaire
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Historique
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Congés
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profil
          </TabsTrigger>
        </TabsList>

        {/* Tableau de bord */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pointage */}
            <div className="lg:col-span-2">
              <PresenceTracker />
            </div>

            {/* Statistiques rapides */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Aujourd'hui</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Heures travaillées</span>
                    <span className="font-medium">
                      {todayEntry?.totalHours?.toFixed(2) || '0.0'}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pauses prises</span>
                    <span className="font-medium">
                      {todayEntry?.breakEntries?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <Badge variant={
                      currentStatus?.status === 'working' ? 'success' :
                      currentStatus?.status === 'on_break' ? 'warning' :
                      currentStatus?.status === 'completed' ? 'default' : 'secondary'
                    }>
                      {currentStatus?.status === 'working' ? 'Présent' :
                       currentStatus?.status === 'on_break' ? 'En pause' :
                       currentStatus?.status === 'completed' ? 'Terminé' : 'Absent'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cette semaine</CardTitle>
                </CardHeader>
                <CardContent>
                  <PresenceStats period="week" compact />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Congés</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">En attente</span>
                    <Badge variant="warning">{leaveStats.pending}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Approuvés</span>
                    <Badge variant="success">{leaveStats.approved}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jours pris</span>
                    <span className="font-medium">{leaveStats.approvedDays}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setActiveTab('leave')}
                  >
                    Demander un congé
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Mon horaire */}
        <TabsContent value="schedule" className="space-y-6">
          <ScheduleViewer employeeId={user?.employeeId} />
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history" className="space-y-6">
          <PresenceHistory employeeId={user?.employeeId} />
        </TabsContent>

        {/* Congés */}
        <TabsContent value="leave" className="space-y-6">
          {showLeaveForm ? (
            <LeaveRequestForm
              onSuccess={() => {
                setShowLeaveForm(false);
                // Actualiser les données
              }}
              onCancel={() => setShowLeaveForm(false)}
            />
          ) : (
            <div className="space-y-6">
              {/* Actions rapides */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Gestion des congés</span>
                    <Button onClick={() => setShowLeaveForm(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Nouvelle demande
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {leaveStats.pending}
                        </div>
                        <div className="text-sm text-muted-foreground">En attente</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {leaveStats.approved}
                        </div>
                        <div className="text-sm text-muted-foreground">Approuvés</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {leaveStats.rejected}
                        </div>
                        <div className="text-sm text-muted-foreground">Refusés</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {leaveStats.approvedDays}
                        </div>
                        <div className="text-sm text-muted-foreground">Jours pris</div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Liste des demandes */}
              <Card>
                <CardHeader>
                  <CardTitle>Mes demandes de congé</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaveRequests.length > 0 ? (
                    <div className="space-y-4">
                      {leaveRequests.slice(0, 5).map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">
                              {request.type === 'vacation' ? 'Congés payés' :
                               request.type === 'sick' ? 'Congé maladie' :
                               request.type === 'personal' ? 'Congé personnel' : request.type}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Du {new Date(request.startDate).toLocaleDateString('fr-FR')} au{' '}
                              {new Date(request.endDate).toLocaleDateString('fr-FR')}
                              {' '}({request.daysRequested} jour{request.daysRequested > 1 ? 's' : ''})
                            </div>
                          </div>
                          <Badge
                            variant={
                              request.status === 'approved' ? 'success' :
                              request.status === 'rejected' ? 'destructive' :
                              request.status === 'cancelled' ? 'secondary' : 'warning'
                            }
                          >
                            {request.status === 'approved' ? 'Approuvé' :
                             request.status === 'rejected' ? 'Refusé' :
                             request.status === 'cancelled' ? 'Annulé' : 'En attente'}
                          </Badge>
                        </div>
                      ))}
                      
                      {leaveRequests.length > 5 && (
                        <div className="text-center">
                          <Button variant="outline">
                            Voir toutes les demandes ({leaveRequests.length})
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p>Aucune demande de congé</p>
                      <p className="text-sm">Cliquez sur "Nouvelle demande" pour commencer</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Profil */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nom</label>
                  <div className="font-medium">{user?.displayName || 'Non renseigné'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="font-medium">{user?.email}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID Employé</label>
                  <div className="font-medium">{user?.employeeId || 'Non assigné'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Département</label>
                  <div className="font-medium">{user?.department || 'Non renseigné'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Préférences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Notifications push</div>
                  <div className="text-sm text-muted-foreground">
                    Recevoir des notifications pour les rappels de pointage
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Géolocalisation</div>
                  <div className="text-sm text-muted-foreground">
                    Utiliser la géolocalisation pour le pointage
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};