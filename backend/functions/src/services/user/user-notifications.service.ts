import { collections, db } from "../../config/database";
import { ValidationError, NotFoundError } from "../../utils/common/errors";
import { logger } from "firebase-functions";

export interface NotificationSettings {
  email: {
    eventReminders: boolean;
    attendanceAlerts: boolean;
    teamUpdates: boolean;
    systemNotifications: boolean;
    weeklyReports: boolean;
    marketingEmails: boolean;
  };
  push: {
    eventReminders: boolean;
    attendanceAlerts: boolean;
    teamUpdates: boolean;
    systemNotifications: boolean;
    urgentAlerts: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number;
    urgentOnly: boolean;
  };
  schedule: {
    quietHours: boolean;
    startTime: string;
    endTime: string;
    weekendsOnly: boolean;
  };
}

export interface NotificationSettingsUpdate {
  email?: Partial<NotificationSettings['email']>;
  push?: Partial<NotificationSettings['push']>;
  sound?: Partial<NotificationSettings['sound']>;
  schedule?: Partial<NotificationSettings['schedule']>;
}

export interface UserNotification {
  id: string;
  type: 'event' | 'attendance' | 'team' | 'system' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

export class UserNotificationsService {
  
  /**
   * Get current user's notification settings
   */
  async getMyNotificationSettings(userId: string, tenantId: string): Promise<NotificationSettings> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Verify user belongs to tenant
      if (userData.tenantId !== tenantId && !userData.tenantMemberships?.some((m: any) => m.tenantId === tenantId)) {
        throw new NotFoundError("User not found in tenant context");
      }
      
      const notificationSettings = userData.notificationSettings || {};
      
      // Return settings with defaults
      return this.mapNotificationSettings(notificationSettings);
      
    } catch (error: any) {
      logger.error("Error getting notification settings:", error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to get notification settings: ${error.message}`);
    }
  }

  /**
   * Update current user's notification settings
   */
  async updateMyNotificationSettings(userId: string, tenantId: string, updates: NotificationSettingsUpdate): Promise<NotificationSettings> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      // Get existing user
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Verify user belongs to tenant
      if (userData.tenantId !== tenantId && !userData.tenantMemberships?.some((m: any) => m.tenantId === tenantId)) {
        throw new NotFoundError("User not found in tenant context");
      }
      
      const currentSettings = userData.notificationSettings || {};
      
      // Validate updates
      this.validateNotificationSettingsUpdate(updates);
      
      // Merge with existing settings
      const updatedSettings = {
        ...currentSettings,
        email: { ...currentSettings.email, ...updates.email },
        push: { ...currentSettings.push, ...updates.push },
        sound: { ...currentSettings.sound, ...updates.sound },
        schedule: { ...currentSettings.schedule, ...updates.schedule },
        updatedAt: new Date().toISOString()
      };
      
      // Update in database
      await collections.users.doc(userId).update({
        notificationSettings: updatedSettings,
        updatedAt: new Date()
      });
      
      logger.info(`✅ Notification settings updated: ${userId}`, {
        userId,
        tenantId,
        updatedFields: Object.keys(updates)
      });
      
      return this.mapNotificationSettings(updatedSettings);
      
    } catch (error: any) {
      logger.error("Error updating notification settings:", error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to update notification settings: ${error.message}`);
    }
  }

  /**
   * Reset notification settings to default values
   */
  async resetNotificationSettings(userId: string, tenantId: string): Promise<NotificationSettings> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      // Get existing user
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Verify user belongs to tenant
      if (userData.tenantId !== tenantId && !userData.tenantMemberships?.some((m: any) => m.tenantId === tenantId)) {
        throw new NotFoundError("User not found in tenant context");
      }
      
      // Get default settings
      const defaultSettings = this.getDefaultNotificationSettings();
      
      // Update in database
      await collections.users.doc(userId).update({
        notificationSettings: {
          ...defaultSettings,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      });
      
      logger.info(`✅ Notification settings reset to defaults: ${userId}`, {
        userId,
        tenantId
      });
      
      return this.mapNotificationSettings(defaultSettings);
      
    } catch (error: any) {
      logger.error("Error resetting notification settings:", error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to reset notification settings: ${error.message}`);
    }
  }

  /**
   * Get current user's notifications
   */
  async getMyNotifications(userId: string, tenantId: string, params: GetNotificationsParams = {}): Promise<{
    items: UserNotification[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const { page = 1, limit = 20, unreadOnly = false, type } = params;
      
      // Build query - scope by user and tenant
      let query = collections.userNotifications
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .orderBy('createdAt', 'desc');
      
      if (unreadOnly) {
        query = query.where('read', '==', false);
      }
      
      if (type) {
        query = query.where('type', '==', type);
      }
      
      // Get total count for pagination
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;
      
      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query.offset(offset).limit(limit);
      
      const snapshot = await paginatedQuery.get();
      
      const items: UserNotification[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'general',
          title: data.title || '',
          message: data.message || '',
          read: Boolean(data.read),
          createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toISOString(),
          data: data.data,
          actionUrl: data.actionUrl
        };
      });
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      };
      
    } catch (error: any) {
      logger.error("Error getting user notifications:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to get user notifications: ${error.message}`);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string, tenantId: string): Promise<NotificationStats> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const snapshot = await collections.userNotifications
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .get();
      
      let total = 0;
      let unread = 0;
      const byType: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        total++;
        
        if (!data.read) {
          unread++;
        }
        
        const type = data.type || 'general';
        byType[type] = (byType[type] || 0) + 1;
      });
      
      return { total, unread, byType };
      
    } catch (error: any) {
      logger.error("Error getting notification stats:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to get notification stats: ${error.message}`);
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsRead(userId: string, tenantId: string, notificationIds: string[]): Promise<void> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const batch = db.batch();
      
      for (const notificationId of notificationIds) {
        const notificationRef = collections.userNotifications.doc(notificationId);
        
        // Verify notification belongs to user and tenant
        const notificationDoc = await notificationRef.get();
        if (notificationDoc.exists) {
          const data = notificationDoc.data()!;
          if (data.userId === userId && data.tenantId === tenantId) {
            batch.update(notificationRef, {
              read: true,
              readAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      await batch.commit();
      
      logger.info(`✅ Notifications marked as read: ${userId}`, {
        userId,
        tenantId,
        count: notificationIds.length
      });
      
    } catch (error: any) {
      logger.error("Error marking notifications as read:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(userId: string, tenantId: string): Promise<number> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const snapshot = await collections.userNotifications
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .where('read', '==', false)
        .get();
      
      if (snapshot.empty) {
        return 0;
      }
      
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      
      const count = snapshot.size;
      
      logger.info(`✅ All notifications marked as read: ${userId}`, {
        userId,
        tenantId,
        count
      });
      
      return count;
      
    } catch (error: any) {
      logger.error("Error marking all notifications as read:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(userId: string, tenantId: string, notificationIds: string[]): Promise<void> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const batch = db.batch();
      
      for (const notificationId of notificationIds) {
        const notificationRef = collections.userNotifications.doc(notificationId);
        
        // Verify notification belongs to user and tenant
        const notificationDoc = await notificationRef.get();
        if (notificationDoc.exists) {
          const data = notificationDoc.data()!;
          if (data.userId === userId && data.tenantId === tenantId) {
            batch.delete(notificationRef);
          }
        }
      }
      
      await batch.commit();
      
      logger.info(`✅ Notifications deleted: ${userId}`, {
        userId,
        tenantId,
        count: notificationIds.length
      });
      
    } catch (error: any) {
      logger.error("Error deleting notifications:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to delete notifications: ${error.message}`);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(userId: string, tenantId: string): Promise<number> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      const snapshot = await collections.userNotifications
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .get();
      
      if (snapshot.empty) {
        return 0;
      }
      
      const batch = db.batch();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      const count = snapshot.size;
      
      logger.info(`✅ All notifications cleared: ${userId}`, {
        userId,
        tenantId,
        count
      });
      
      return count;
      
    } catch (error: any) {
      logger.error("Error clearing all notifications:", error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to clear all notifications: ${error.message}`);
    }
  }

  /**
   * Test notification settings
   */
  async testNotificationSettings(userId: string, tenantId: string, type: 'email' | 'push' | 'sms'): Promise<void> {
    try {
      if (!tenantId) {
        throw new ValidationError("Tenant context is required");
      }

      // Get user data
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      
      // Verify user belongs to tenant
      if (userData.tenantId !== tenantId && !userData.tenantMemberships?.some((m: any) => m.tenantId === tenantId)) {
        throw new NotFoundError("User not found in tenant context");
      }
      
      // Create test notification
      const testNotification = {
        userId,
        tenantId,
        type: 'system',
        title: `Test ${type.toUpperCase()} Notification`,
        message: `This is a test ${type} notification to verify your settings are working correctly.`,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          isTest: true,
          testType: type
        }
      };
      
      // Save test notification
      await collections.userNotifications.add(testNotification);
      
      // TODO: Implement actual notification sending based on type
      // For now, we just create the notification record
      
      logger.info(`✅ Test ${type} notification created: ${userId}`, {
        userId,
        tenantId,
        type
      });
      
    } catch (error: any) {
      logger.error(`Error sending test ${type} notification:`, error);
      
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error(`Failed to send test ${type} notification: ${error.message}`);
    }
  }

  /**
   * Map notification settings with defaults
   */
  private mapNotificationSettings(data: any): NotificationSettings {
    const defaults = this.getDefaultNotificationSettings();
    
    return {
      email: {
        eventReminders: data?.email?.eventReminders ?? defaults.email.eventReminders,
        attendanceAlerts: data?.email?.attendanceAlerts ?? defaults.email.attendanceAlerts,
        teamUpdates: data?.email?.teamUpdates ?? defaults.email.teamUpdates,
        systemNotifications: data?.email?.systemNotifications ?? defaults.email.systemNotifications,
        weeklyReports: data?.email?.weeklyReports ?? defaults.email.weeklyReports,
        marketingEmails: data?.email?.marketingEmails ?? defaults.email.marketingEmails,
      },
      push: {
        eventReminders: data?.push?.eventReminders ?? defaults.push.eventReminders,
        attendanceAlerts: data?.push?.attendanceAlerts ?? defaults.push.attendanceAlerts,
        teamUpdates: data?.push?.teamUpdates ?? defaults.push.teamUpdates,
        systemNotifications: data?.push?.systemNotifications ?? defaults.push.systemNotifications,
        urgentAlerts: data?.push?.urgentAlerts ?? defaults.push.urgentAlerts,
      },
      sound: {
        enabled: data?.sound?.enabled ?? defaults.sound.enabled,
        volume: data?.sound?.volume ?? defaults.sound.volume,
        urgentOnly: data?.sound?.urgentOnly ?? defaults.sound.urgentOnly,
      },
      schedule: {
        quietHours: data?.schedule?.quietHours ?? defaults.schedule.quietHours,
        startTime: data?.schedule?.startTime ?? defaults.schedule.startTime,
        endTime: data?.schedule?.endTime ?? defaults.schedule.endTime,
        weekendsOnly: data?.schedule?.weekendsOnly ?? defaults.schedule.weekendsOnly,
      },
    };
  }

  /**
   * Get default notification settings
   */
  private getDefaultNotificationSettings(): NotificationSettings {
    return {
      email: {
        eventReminders: true,
        attendanceAlerts: true,
        teamUpdates: false,
        systemNotifications: true,
        weeklyReports: false,
        marketingEmails: false,
      },
      push: {
        eventReminders: true,
        attendanceAlerts: true,
        teamUpdates: false,
        systemNotifications: true,
        urgentAlerts: true,
      },
      sound: {
        enabled: false,
        volume: 50,
        urgentOnly: true,
      },
      schedule: {
        quietHours: false,
        startTime: '22:00',
        endTime: '08:00',
        weekendsOnly: false,
      },
    };
  }

  /**
   * Validate notification settings update
   */
  private validateNotificationSettingsUpdate(updates: NotificationSettingsUpdate): void {
    // Validate email settings
    if (updates.email) {
      Object.entries(updates.email).forEach(([key, value]) => {
        if (typeof value !== 'boolean') {
          throw new ValidationError(`Email setting '${key}' must be a boolean`);
        }
      });
    }
    
    // Validate push settings
    if (updates.push) {
      Object.entries(updates.push).forEach(([key, value]) => {
        if (typeof value !== 'boolean') {
          throw new ValidationError(`Push setting '${key}' must be a boolean`);
        }
      });
    }
    
    // Validate sound settings
    if (updates.sound) {
      if (updates.sound.enabled !== undefined && typeof updates.sound.enabled !== 'boolean') {
        throw new ValidationError("Sound enabled must be a boolean");
      }
      
      if (updates.sound.volume !== undefined) {
        if (!Number.isInteger(updates.sound.volume) || updates.sound.volume < 0 || updates.sound.volume > 100) {
          throw new ValidationError("Sound volume must be an integer between 0 and 100");
        }
      }
      
      if (updates.sound.urgentOnly !== undefined && typeof updates.sound.urgentOnly !== 'boolean') {
        throw new ValidationError("Sound urgentOnly must be a boolean");
      }
    }
    
    // Validate schedule settings
    if (updates.schedule) {
      if (updates.schedule.quietHours !== undefined && typeof updates.schedule.quietHours !== 'boolean') {
        throw new ValidationError("Schedule quietHours must be a boolean");
      }
      
      if (updates.schedule.startTime && !this.isValidTime(updates.schedule.startTime)) {
        throw new ValidationError("Invalid start time format. Use HH:mm format");
      }
      
      if (updates.schedule.endTime && !this.isValidTime(updates.schedule.endTime)) {
        throw new ValidationError("Invalid end time format. Use HH:mm format");
      }
      
      if (updates.schedule.weekendsOnly !== undefined && typeof updates.schedule.weekendsOnly !== 'boolean') {
        throw new ValidationError("Schedule weekendsOnly must be a boolean");
      }
    }
  }

  /**
   * Validate time format (HH:mm)
   */
  private isValidTime(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }
}

export const userNotificationsService = new UserNotificationsService();