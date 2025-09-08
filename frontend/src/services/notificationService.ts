// src/services/notificationService.ts - Service pour la gestion des notifications
import { apiService, type ApiResponse, type PaginatedResponse } from './apiService';
import {
  type Notification,
  type CreateNotificationRequest,
  NotificationType,
  NotificationChannel,
  type NotificationPreferences
} from '../shared';

export interface NotificationSearchFilters {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  channel?: NotificationChannel;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface BulkNotificationRequest {
  recipients: string[];
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: string;
}

export interface PushConfigRequest {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
}

class NotificationService {
  // Get my notifications
  async getMyNotifications(filters: NotificationSearchFilters = {}): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    return apiService.get<PaginatedResponse<Notification>>('/notifications/my-notifications', filters);
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/notifications/mark-read/${id}`);
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/mark-all-read');
  }

  // Delete notification
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/notifications/${id}`);
  }

  // Get notification preferences
  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.get<NotificationPreferences>('/notifications/preferences');
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.put<NotificationPreferences>('/notifications/preferences', preferences);
  }

  // Configure push notifications
  async configurePushNotifications(config: PushConfigRequest): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/push/configure', config);
  }

  // Send notification (admin/organizer)
  async sendNotification(data: CreateNotificationRequest): Promise<ApiResponse<Notification>> {
    return apiService.post<Notification>('/notifications/send', data);
  }

  // Send bulk notification
  async sendBulkNotification(data: BulkNotificationRequest): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/send-bulk', data);
  }

  // Send specific notification types
  async sendEmailNotification(data: {
    recipients: string[];
    subject: string;
    htmlContent: string;
    textContent?: string;
    attachments?: Array<{ filename: string; content: string; type: string }>;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/send-email', data);
  }

  async sendSmsNotification(data: {
    recipients: string[];
    message: string;
    templateId?: string;
    variables?: Record<string, string>;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/send-sms', data);
  }

  async sendPushNotification(data: {
    recipients: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    badge?: number;
    sound?: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/send-push', data);
  }

  // Get notification statistics
  async getNotificationStats(filters: {
    userId?: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ApiResponse<NotificationStats>> {
    return apiService.get<NotificationStats>('/notifications/stats', filters);
  }

  // Get delivery status
  async getDeliveryStatus(id: string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`/notifications/${id}/delivery-status`);
  }

  // Template management
  async getNotificationTemplates(filters: {
    type?: NotificationType;
    language?: 'fr' | 'en' | 'es' | 'de';
  } = {}): Promise<ApiResponse<any[]>> {
    return apiService.get<any[]>('/notifications/templates', filters);
  }

  async createNotificationTemplate(data: any): Promise<ApiResponse<any>> {
    return apiService.post<any>('/notifications/templates', data);
  }

  async updateNotificationTemplate(id: string, data: any): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/notifications/templates/${id}`, data);
  }

  async deleteNotificationTemplate(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/notifications/templates/${id}`);
  }

  // Test notification
  async testNotification(data: {
    type: NotificationType;
    channel: NotificationChannel;
    testData?: Record<string, any>;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/test', data);
  }

  // Event-specific notifications
  async sendEventReminders(eventId: string, data: {
    reminderType: '24h' | '1h' | '15min' | 'custom';
    customMinutes?: number;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/notifications/events/${eventId}/reminders`, data);
  }

  // Webhook handler (for delivery status updates)
  async handleDeliveryWebhook(provider: 'sendgrid' | 'twilio' | 'fcm' | 'mailgun', data: any): Promise<ApiResponse<void>> {
    return apiService.post<void>(`/notifications/webhooks/${provider}`, data);
  }
}

export const notificationService = new NotificationService();