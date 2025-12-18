import { collections } from '../../config/database';
import { Timestamp } from 'firebase-admin/firestore';

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    eventReminders: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    invitations: boolean;
  };
  push: {
    enabled: boolean;
    eventReminders: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    invitations: boolean;
  };
  sms: {
    enabled: boolean;
    eventReminders: boolean;
    attendanceAlerts: boolean;
    systemUpdates: boolean;
    weeklyReports: boolean;
    invitations: boolean;
  };
}

export interface UserPreferencesDocument {
  userId: string;
  tenantId?: string;
  notifications: NotificationPreferences;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}

class NotificationPreferencesService {
  private readonly collection = collections.user_preferences;

  /**
   * Obtenir les préférences par défaut
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      email: {
        enabled: true,
        eventReminders: true,
        attendanceAlerts: true,
        systemUpdates: false,
        weeklyReports: true,
        invitations: true
      },
      push: {
        enabled: true,
        eventReminders: true,
        attendanceAlerts: true,
        systemUpdates: false,
        weeklyReports: false,
        invitations: true
      },
      sms: {
        enabled: false,
        eventReminders: false,
        attendanceAlerts: false,
        systemUpdates: false,
        weeklyReports: false,
        invitations: false
      }
    };
  }

  /**
   * Valider la structure des préférences
   */
  private validatePreferences(preferences: any): boolean {
    const validChannels = ['email', 'push', 'sms'];
    const validTypes = ['enabled', 'eventReminders', 'attendanceAlerts', 'systemUpdates', 'weeklyReports', 'invitations'];

    try {
      for (const channel of validChannels) {
        if (!preferences[channel] || typeof preferences[channel] !== 'object') {
          return false;
        }

        for (const type of validTypes) {
          if (preferences[channel][type] !== undefined && typeof preferences[channel][type] !== 'boolean') {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir les préférences de notification d'un utilisateur
   */
  async getUserPreferences(userId: string, tenantId?: string): Promise<NotificationPreferences> {
    try {
      const doc = await this.collection.doc(userId).get();

      if (!doc.exists) {
        // Créer les préférences par défaut si elles n'existent pas
        const defaultPrefs = this.getDefaultPreferences();
        await this.createUserPreferences(userId, defaultPrefs, tenantId);
        return defaultPrefs;
      }

      const data = doc.data() as UserPreferencesDocument;
      
      // Vérifier si les préférences de notifications existent
      if (!data.notifications) {
        const defaultPrefs = this.getDefaultPreferences();
        await this.updateUserPreferences(userId, defaultPrefs, tenantId);
        return defaultPrefs;
      }

      // Valider la structure des préférences
      if (!this.validatePreferences(data.notifications)) {
        console.warn(`Invalid notification preferences structure for user ${userId}, using defaults`);
        const defaultPrefs = this.getDefaultPreferences();
        await this.updateUserPreferences(userId, defaultPrefs, tenantId);
        return defaultPrefs;
      }

      return data.notifications;
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      // Retourner les préférences par défaut en cas d'erreur
      return this.getDefaultPreferences();
    }
  }

  /**
   * Créer les préférences de notification pour un nouvel utilisateur
   */
  async createUserPreferences(
    userId: string, 
    preferences: NotificationPreferences, 
    tenantId?: string
  ): Promise<void> {
    try {
      const now = Timestamp.now();
      const document: UserPreferencesDocument = {
        userId,
        tenantId,
        notifications: preferences,
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      await this.collection.doc(userId).set(document);
      console.log(`Created notification preferences for user ${userId}`);
    } catch (error) {
      console.error('Error creating user notification preferences:', error);
      throw new Error('Failed to create notification preferences');
    }
  }

  /**
   * Mettre à jour les préférences de notification d'un utilisateur
   */
  async updateUserPreferences(
    userId: string, 
    preferences: NotificationPreferences, 
    tenantId?: string
  ): Promise<NotificationPreferences> {
    try {
      // Valider les préférences avant la sauvegarde
      if (!this.validatePreferences(preferences)) {
        throw new Error('Invalid notification preferences structure');
      }

      const now = Timestamp.now();
      
      // Vérifier si le document existe
      const doc = await this.collection.doc(userId).get();
      
      if (!doc.exists) {
        // Créer le document s'il n'existe pas
        await this.createUserPreferences(userId, preferences, tenantId);
        return preferences;
      }

      // Mettre à jour le document existant
      const currentData = doc.data() as UserPreferencesDocument;
      const updatedDocument: Partial<UserPreferencesDocument> = {
        notifications: preferences,
        updatedAt: now,
        version: (currentData.version || 0) + 1
      };

      // Ajouter tenantId si fourni
      if (tenantId) {
        updatedDocument.tenantId = tenantId;
      }

      await this.collection.doc(userId).update(updatedDocument);
      console.log(`Updated notification preferences for user ${userId}`);
      
      return preferences;
    } catch (error) {
      console.error('Error updating user notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Supprimer les préférences de notification d'un utilisateur
   */
  async deleteUserPreferences(userId: string): Promise<void> {
    try {
      const doc = await this.collection.doc(userId).get();
      
      if (doc.exists) {
        const data = doc.data() as UserPreferencesDocument;
        
        // Ne supprimer que les préférences de notifications, pas tout le document
        const updatedDocument: Partial<UserPreferencesDocument> = {
          notifications: this.getDefaultPreferences(),
          updatedAt: Timestamp.now(),
          version: (data.version || 0) + 1
        };

        await this.collection.doc(userId).update(updatedDocument);
        console.log(`Reset notification preferences for user ${userId}`);
      }
    } catch (error) {
      console.error('Error deleting user notification preferences:', error);
      throw new Error('Failed to delete notification preferences');
    }
  }

  /**
   * Obtenir les statistiques des préférences de notifications
   */
  async getPreferencesStats(tenantId?: string): Promise<{
    totalUsers: number;
    emailEnabled: number;
    pushEnabled: number;
    smsEnabled: number;
    channelStats: {
      email: { [key: string]: number };
      push: { [key: string]: number };
      sms: { [key: string]: number };
    };
  }> {
    try {
      let query = this.collection.select('notifications');
      
      if (tenantId) {
        query = query.where('tenantId', '==', tenantId);
      }

      const snapshot = await query.get();
      
      const stats = {
        totalUsers: snapshot.size,
        emailEnabled: 0,
        pushEnabled: 0,
        smsEnabled: 0,
        channelStats: {
          email: {},
          push: {},
          sms: {}
        }
      };

      snapshot.docs.forEach(doc => {
        const data = doc.data() as UserPreferencesDocument;
        const prefs = data.notifications;

        if (prefs) {
          // Compter les canaux activés
          if (prefs.email?.enabled) stats.emailEnabled++;
          if (prefs.push?.enabled) stats.pushEnabled++;
          if (prefs.sms?.enabled) stats.smsEnabled++;

          // Statistiques détaillées par type de notification
          ['email', 'push', 'sms'].forEach(channel => {
            const channelPrefs = prefs[channel as keyof NotificationPreferences];
            if (channelPrefs) {
              Object.entries(channelPrefs).forEach(([key, value]) => {
                if (key !== 'enabled' && value === true) {
                  if (!stats.channelStats[channel as keyof typeof stats.channelStats][key]) {
                    stats.channelStats[channel as keyof typeof stats.channelStats][key] = 0;
                  }
                  stats.channelStats[channel as keyof typeof stats.channelStats][key]++;
                }
              });
            }
          });
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting notification preferences stats:', error);
      throw new Error('Failed to get notification preferences statistics');
    }
  }

  /**
   * Migrer les anciennes préférences vers le nouveau format
   */
  async migrateOldPreferences(userId: string): Promise<void> {
    try {
      const doc = await this.collection.doc(userId).get();
      
      if (!doc.exists) {
        return;
      }

      const data = doc.data();
      
      // Vérifier s'il y a des anciennes préférences à migrer
      if (data && !data.notifications && (data.emailNotifications || data.pushNotifications)) {
        console.log(`Migrating old notification preferences for user ${userId}`);
        
        const newPreferences: NotificationPreferences = {
          email: {
            enabled: data.emailNotifications?.enabled ?? true,
            eventReminders: data.emailNotifications?.eventReminders ?? true,
            attendanceAlerts: data.emailNotifications?.attendanceAlerts ?? true,
            systemUpdates: data.emailNotifications?.systemUpdates ?? false,
            weeklyReports: true,
            invitations: true
          },
          push: {
            enabled: data.pushNotifications?.enabled ?? true,
            eventReminders: data.pushNotifications?.eventReminders ?? true,
            attendanceAlerts: data.pushNotifications?.attendanceAlerts ?? true,
            systemUpdates: data.pushNotifications?.systemUpdates ?? false,
            weeklyReports: false,
            invitations: true
          },
          sms: {
            enabled: false,
            eventReminders: false,
            attendanceAlerts: false,
            systemUpdates: false,
            weeklyReports: false,
            invitations: false
          }
        };

        await this.updateUserPreferences(userId, newPreferences, data.tenantId);
        console.log(`Successfully migrated preferences for user ${userId}`);
      }
    } catch (error) {
      console.error('Error migrating old notification preferences:', error);
      // Ne pas faire échouer l'opération si la migration échoue
    }
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();