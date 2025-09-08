import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  Clock,
  Mail,
  MessageSquare,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Calendar
} from 'lucide-react';
import { notificationService } from '@/services';
import type { Notification, NotificationType } from '../../shared';
import { toast } from 'react-toastify';

interface NotificationCenterProps {
  organizationId: string;
}

const NOTIFICATION_ICONS = {
  event_reminder: Clock,
  event_update: Calendar,
  attendance_required: AlertCircle,
  system_update: Info,
  invitation: Mail,
  message: MessageSquare,
  alert: AlertCircle,
  info: Info,
  success: CheckCircle,
  warning: AlertCircle
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ organizationId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0
  });

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getMyNotifications({
        page: 1,
        limit: 50
      });
      
      if (response.success && response.data) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await notificationService.getNotificationStats();
      if (response.success && response.data) {
        setStats({
          total: response.data.total,
          unread: response.data.unread
        });
      }
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      setStats(prev => ({ ...prev, unread: prev.unread - 1 }));
      toast.success('Notification marquée comme lue');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setStats(prev => ({ ...prev, unread: 0 }));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
      toast.success('Notification supprimée');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const IconComponent = NOTIFICATION_ICONS[type] || Bell;
    return <IconComponent className="h-5 w-5" />;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre de Notifications</h1>
          <p className="text-gray-600">
            {stats.total} notifications • {stats.unread} non lues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={stats.unread === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </div>
      </div>

      {/* Liste des notifications */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune notification
            </h3>
            <p className="text-gray-600">
              Vous n'avez aucune notification pour le moment.
            </p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`p-4 ${!notification.isRead ? 'bg-blue-50 border-blue-200' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${
                    !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <Badge variant="default" className="text-xs">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(notification.createdAt)}</span>
                      <Badge variant="outline" className="text-xs">
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};