/**
 * Service de notifications push pour mobile
 */

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.permission = Notification.permission;
    this.initializeServiceWorker();
  }

  /**
   * Initialiser le service worker
   */
  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    if (this.permission !== 'denied') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  /**
   * Vérifier si les notifications sont supportées
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Vérifier si les notifications sont autorisées
   */
  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Envoyer une notification locale
   */
  async sendLocalNotification(options: PushNotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications not supported');
      return;
    }

    if (!this.isPermissionGranted()) {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }
    }

    try {
      if (this.registration) {
        await this.registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/badge-72x72.png',
          tag: options.tag,
          data: options.data,
          actions: options.actions,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
          vibrate: [200, 100, 200],
          timestamp: Date.now()
        });
      } else {
        // Fallback pour les navigateurs sans service worker
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Notifications spécifiques à la présence
   */
  async sendPresenceReminder(): Promise<void> {
    await this.sendLocalNotification({
      title: 'Rappel de pointage',
      body: 'N\'oubliez pas de pointer votre arrivée !',
      tag: 'presence-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'clock-in',
          title: 'Pointer maintenant'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ],
      data: {
        type: 'presence-reminder',
        timestamp: Date.now()
      }
    });
  }

  async sendClockOutReminder(): Promise<void> {
    await this.sendLocalNotification({
      title: 'Rappel de départ',
      body: 'Il est temps de pointer votre départ !',
      tag: 'clock-out-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'clock-out',
          title: 'Pointer le départ'
        },
        {
          action: 'dismiss',
          title: 'Plus tard'
        }
      ],
      data: {
        type: 'clock-out-reminder',
        timestamp: Date.now()
      }
    });
  }

  async sendBreakReminder(): Promise<void> {
    await this.sendLocalNotification({
      title: 'Rappel de pause',
      body: 'Vous êtes en pause depuis longtemps. Pensez à reprendre le travail !',
      tag: 'break-reminder',
      actions: [
        {
          action: 'end-break',
          title: 'Reprendre le travail'
        },
        {
          action: 'dismiss',
          title: 'Continuer la pause'
        }
      ],
      data: {
        type: 'break-reminder',
        timestamp: Date.now()
      }
    });
  }

  async sendOvertimeAlert(overtimeMinutes: number): Promise<void> {
    await this.sendLocalNotification({
      title: 'Alerte heures supplémentaires',
      body: `Vous avez déjà ${overtimeMinutes} minutes d'heures supplémentaires aujourd'hui.`,
      tag: 'overtime-alert',
      requireInteraction: true,
      data: {
        type: 'overtime-alert',
        overtimeMinutes,
        timestamp: Date.now()
      }
    });
  }

  async sendLeaveRequestUpdate(status: 'approved' | 'rejected', leaveType: string): Promise<void> {
    const statusText = status === 'approved' ? 'approuvée' : 'refusée';
    
    await this.sendLocalNotification({
      title: 'Demande de congé mise à jour',
      body: `Votre demande de ${leaveType} a été ${statusText}.`,
      tag: 'leave-request-update',
      requireInteraction: true,
      data: {
        type: 'leave-request-update',
        status,
        leaveType,
        timestamp: Date.now()
      }
    });
  }

  async sendScheduleChange(): Promise<void> {
    await this.sendLocalNotification({
      title: 'Changement d\'horaire',
      body: 'Votre planning a été modifié. Consultez l\'application pour plus de détails.',
      tag: 'schedule-change',
      requireInteraction: true,
      data: {
        type: 'schedule-change',
        timestamp: Date.now()
      }
    });
  }

  /**
   * Programmer des notifications récurrentes
   */
  scheduleRecurringNotifications() {
    // Rappel de pointage le matin (8h00)
    this.scheduleNotification('08:00', () => {
      this.sendPresenceReminder();
    });

    // Rappel de départ le soir (17h30)
    this.scheduleNotification('17:30', () => {
      this.sendClockOutReminder();
    });
  }

  /**
   * Programmer une notification à une heure spécifique
   */
  private scheduleNotification(time: string, callback: () => void) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);

    // Si l'heure est déjà passée aujourd'hui, programmer pour demain
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      callback();
      // Reprogrammer pour le lendemain
      setInterval(callback, 24 * 60 * 60 * 1000);
    }, timeUntilNotification);
  }

  /**
   * Gérer les actions des notifications
   */
  handleNotificationAction(event: any) {
    const { action, notification } = event;
    const data = notification.data;

    switch (action) {
      case 'clock-in':
        // Rediriger vers l'application pour pointer
        event.waitUntil(
          self.clients.openWindow('/presence?action=clock-in')
        );
        break;

      case 'clock-out':
        event.waitUntil(
          self.clients.openWindow('/presence?action=clock-out')
        );
        break;

      case 'end-break':
        event.waitUntil(
          self.clients.openWindow('/presence?action=end-break')
        );
        break;

      case 'dismiss':
        // Ne rien faire, juste fermer la notification
        break;

      default:
        // Action par défaut : ouvrir l'application
        event.waitUntil(
          self.clients.openWindow('/presence')
        );
    }

    notification.close();
  }

  /**
   * Nettoyer les anciennes notifications
   */
  async clearOldNotifications() {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      notifications.forEach(notification => {
        if (notification.timestamp && notification.timestamp < oneDayAgo) {
          notification.close();
        }
      });
    }
  }

  /**
   * Désactiver toutes les notifications
   */
  async clearAllNotifications() {
    if (this.registration) {
      const notifications = await this.registration.getNotifications();
      notifications.forEach(notification => notification.close());
    }
  }
}

export const pushNotificationService = new PushNotificationService();