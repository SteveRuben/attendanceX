// src/services/notificationService.ts - Service pour la gestion des notifications
import { apiService, type ApiResponse, type PaginatedResponse } from './api';
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

  // Grace Period specific notifications
  async sendGracePeriodWelcome(userId: string, gracePeriodData: {
    durationDays: number;
    expirationDate: string;
    daysRemaining: number;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/grace-period/welcome', {
      userId,
      ...gracePeriodData
    });
  }

  async sendGracePeriodReminder(userId: string, reminderData: {
    daysRemaining: number;
    expirationDate: string;
    reminderType: '7_days' | '3_days' | '1_day';
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/grace-period/reminder', {
      userId,
      ...reminderData
    });
  }

  async sendGracePeriodExpiration(userId: string, expirationData: {
    expirationDate: string;
    daysUntilDeletion: number;
    deletionDate: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/grace-period/expiration', {
      userId,
      ...expirationData
    });
  }

  async sendGracePeriodConversionSuccess(userId: string, conversionData: {
    planName: string;
    monthlyPrice: number;
    nextBillingDate: string;
    promoApplied?: boolean;
    promoCode?: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/grace-period/conversion-success', {
      userId,
      ...conversionData
    });
  }

  // Promo Code specific notifications
  async sendPromoCodeConfirmation(userId: string, promoData: {
    promoCode: string;
    discountPercentage: number;
    savingsAmount: number;
    planName: string;
    originalPrice: number;
    finalPrice: number;
    promoDuration: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/promo-codes/confirmation', {
      userId,
      ...promoData
    });
  }

  async sendPromoCodeExpirationWarning(userId: string, expirationData: {
    promoCode: string;
    daysRemaining: number;
    expirationDate: string;
    currentSavings: number;
    discountPercentage: number;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/promo-codes/expiration-warning', {
      userId,
      ...expirationData
    });
  }

  async sendNewPromoAvailable(userIds: string[], promoData: {
    promotionTitle: string;
    promoCode: string;
    discountPercentage: number;
    expirationDate: string;
    maxSavings: number;
    promotionDescription: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/promo-codes/new-promotion', {
      userIds,
      ...promoData
    });
  }

  // Billing specific notifications
  async sendBillingNotification(userId: string, billingData: {
    type: 'subscription_created' | 'subscription_updated' | 'payment_success' | 'payment_failed' | 'invoice_ready';
    subscriptionId?: string;
    invoiceId?: string;
    amount?: number;
    nextBillingDate?: string;
    planName?: string;
  }): Promise<ApiResponse<void>> {
    return apiService.post<void>('/notifications/billing', {
      userId,
      ...billingData
    });
  }

  // Get grace period notification preferences
  async getGracePeriodPreferences(userId?: string): Promise<ApiResponse<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    reminderDays: number[];
  }>> {
    const params = userId ? { userId } : {};
    return apiService.get<any>('/notifications/grace-period/preferences', params);
  }

  // Update grace period notification preferences
  async updateGracePeriodPreferences(preferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    reminderDays: number[];
  }, userId?: string): Promise<ApiResponse<void>> {
    const data = userId ? { ...preferences, userId } : preferences;
    return apiService.put<void>('/notifications/grace-period/preferences', data);
  }

  // Get promo code notification preferences
  async getPromoCodePreferences(userId?: string): Promise<ApiResponse<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    marketingEnabled: boolean;
    expirationWarnings: boolean;
  }>> {
    const params = userId ? { userId } : {};
    return apiService.get<any>('/notifications/promo-codes/preferences', params);
  }

  // Update promo code notification preferences
  async updatePromoCodePreferences(preferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    marketingEnabled: boolean;
    expirationWarnings: boolean;
  }, userId?: string): Promise<ApiResponse<void>> {
    const data = userId ? { ...preferences, userId } : preferences;
    return apiService.put<void>('/notifications/promo-codes/preferences', data);
  }

  // Batch operations for grace period notifications
  async sendBatchGracePeriodReminders(reminderType: '7_days' | '3_days' | '1_day'): Promise<ApiResponse<{
    sent: number;
    failed: number;
    errors: string[];
  }>> {
    return apiService.post<any>('/notifications/grace-period/batch-reminders', {
      reminderType
    });
  }

  // Batch operations for promo code expiration warnings
  async sendBatchPromoExpirationWarnings(daysBeforeExpiration: number): Promise<ApiResponse<{
    sent: number;
    failed: number;
    errors: string[];
  }>> {
    return apiService.post<any>('/notifications/promo-codes/batch-expiration-warnings', {
      daysBeforeExpiration
    });
  }
}

export const notificationService = new NotificationService();