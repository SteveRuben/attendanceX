// src/pages/Notifications/NotificationCenter.tsx - Centre de notifications
import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Search, 
  Filter,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Users,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { notificationService } from '@/services';
import type { Notification, NotificationType, NotificationChannel } from '../../shared';
import { toast } from 'react-toastify';

interface NotificationFilters {
  search: string;
  type: NotificationType | 'all';
  channel: NotificationChannel | 'all';
  unreadOnly: boolean;
}

const NotificationCenter = () => {
  const { user } = useAuth();
  const { canSendNotifications } = usePermissions();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<NotificationFilters>({
    search: '',
    type: 'all',
    channel: 'all',
    unreadOnly: false
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  useEffect(() => {
    loadNotifications();
  }, [filters, pagination.page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        unreadOnly: filters.unreadOnly
      };

      if (filters.type !== 'all') params.type = filters.type;
      if (filters.channel !== 'all') params.channel = filters.channel;

      const response = await notificationService.getMyNotifications(params);
      
      if (response.success && response.data) {
        setNotifications(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getTypeIcon = (type: NotificationType) => {
    const typeIcons = {
      event_reminder: Calendar,
      event_update: Calendar,
      event_cancelled: XCircle,
      attendance_reminder: CheckCircle,
      attendance_marked: CheckCircle,
      user_invitation: Users,
      system_alert: AlertCircle,
      general: Info
    };
    
    const IconComponent = typeIcons[type] || Info;
    return <IconComponent className="w-4 h-4" />;
  };

  const getChannelBadge = (channel: NotificationChannel) => {
    const channelConfig = {
      email: { variant: 'default' as const, label: 'Email', icon: Mail },
      sms: { variant: 'secondary' as const, label: 'SMS', icon: MessageSquare },
      push: { variant: 'outline' as const, label: 'Push', icon: Smartphone },
      in_app: { variant: 'outline' as const, label: 'App', icon: Bell }
    };

    const config = channelConfig[channel] || { variant: 'outline' as const, label: channel, icon: Bell };
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: NotificationType) => {
    const typeLabels = {
      event_reminder: 'Rappel d\'événement',
      event_update: 'Mise à jour d\'événement',
      event_cancelled: 'Événement annulé',
      attendance_reminder: 'Rappel de présence',
      attendance_marked: 'Présence marquée',
      user_invitation: 'Invitation utilisateur',
      system_alert: 'Alerte système',
      general: 'Général'
    };
    return typeLabels[type] || type;
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)
      );
      toast.success('Notification marquée comme lue');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification supprimée');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleBulkAction = async (action: 'read' | 'delete') => {
    if (selectedNotifications.length === 0) {
      toast.warning('Aucune notification sélectionnée');
      return;
    }

    try {
      if (action === 'read') {
        await Promise.all(selectedNotifications.map(id => notificationService.markAsRead(id)));
        setNotifications(prev => 
          prev.map(n => selectedNotifications.includes(n.id) 
            ? { ...n, readAt: new Date().toISOString() } 
            : n
          )
        );
        toast.success('Notifications marquées comme lues');
      } else {
        await Promise.all(selectedNotifications.map(id => notificationService.deleteNotification(id)));
        setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
        toast.success('Notifications supprimées');
      }
      setSelectedNotifications([]);
    } catch (error: any) {
      toast.error('Erreur lors de l\'action groupée');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Il y a quelques minutes';
    } else if (diffInHours < 24) {
      return `Il y a ${Math.floor(diffInHours)} heure(s)`;
    } else if (diffInHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.readAt).length;

  if (loading && notifications.length === 0) {
    return (
      <div className="container-fluid py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Bell className="w-8 h-8 mr-3" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-3">
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos notifications et préférences
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Préférences
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Non lues ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="events">
            Événements
          </TabsTrigger>
          <TabsTrigger value="attendance">
            Présences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Rechercher dans les notifications..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="event_reminder">Rappel d'événement</SelectItem>
                    <SelectItem value="event_update">Mise à jour d'événement</SelectItem>
                    <SelectItem value="attendance_reminder">Rappel de présence</SelectItem>
                    <SelectItem value="user_invitation">Invitation</SelectItem>
                    <SelectItem value="system_alert">Alerte système</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.channel} onValueChange={(value) => handleFilterChange('channel', value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les canaux</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="in_app">App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {selectedNotifications.length} notification(s) sélectionnée(s)
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('read')}>
                      <Check className="w-4 h-4 mr-2" />
                      Marquer comme lues
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications List */}
          <div className="space-y-4">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`card-interactive ${!notification.readAt ? 'border-l-4 border-l-primary' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNotifications(prev => [...prev, notification.id]);
                          } else {
                            setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
                          }
                        }}
                        className="mt-1"
                      />
                      
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium ${!notification.readAt ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h3>
                            {!notification.readAt && (
                              <Badge variant="destructive" className="text-xs">
                                Nouveau
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getChannelBadge(notification.channel)}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(notification.type)}
                          </Badge>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.readAt && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Marquer comme lu
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Aucune notification
                  </h3>
                  <p className="text-muted-foreground">
                    Vous n'avez pas encore reçu de notifications.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} notifications
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Other tabs content would be similar with filtered data */}
        <TabsContent value="unread">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Filtrage par notifications non lues...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationCenter;