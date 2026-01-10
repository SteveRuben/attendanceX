import { collections } from "../../config/database";
import { ValidationError, NotFoundError } from "../../utils/common/errors";
import { logger } from "firebase-functions";

export interface UserPreferences {
  // Regional preferences
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  weekStartsOn: 'monday' | 'sunday';
  
  // Appearance preferences
  theme: 'light' | 'dark' | 'system';
  
  // Attendance preferences
  gracePeriod: number;
  autoCheckOut: boolean;
  
  // Basic notification preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundNotifications: boolean;
}

export interface UserPreferencesUpdate {
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  weekStartsOn?: 'monday' | 'sunday';
  theme?: 'light' | 'dark' | 'system';
  gracePeriod?: number;
  autoCheckOut?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  soundNotifications?: boolean;
}

export interface PreferencesOptions {
  languages: Array<{ value: string; label: string }>;
  timezones: Array<{ value: string; label: string }>;
  dateFormats: Array<{ value: string; label: string }>;
  timeFormats: Array<{ value: string; label: string }>;
}

export class UserPreferencesService {
  
  /**
   * Get current user's preferences
   */
  async getMyPreferences(userId: string): Promise<UserPreferences> {
    try {
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      const preferences = userData.preferences || {};
      
      // Return preferences with defaults
      return this.mapPreferences(preferences);
      
    } catch (error: any) {
      logger.error("Error getting user preferences:", error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }
  }

  /**
   * Update current user's preferences
   */
  async updateMyPreferences(userId: string, updates: UserPreferencesUpdate): Promise<UserPreferences> {
    try {
      // Get existing user
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      const userData = userDoc.data()!;
      const currentPreferences = userData.preferences || {};
      
      // Validate updates
      this.validatePreferencesUpdate(updates);
      
      // Merge with existing preferences
      const updatedPreferences = {
        ...currentPreferences,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Update in database
      await collections.users.doc(userId).update({
        preferences: updatedPreferences,
        updatedAt: new Date()
      });
      
      logger.info(`✅ User preferences updated: ${userId}`, {
        userId,
        updatedFields: Object.keys(updates)
      });
      
      return this.mapPreferences(updatedPreferences);
      
    } catch (error: any) {
      logger.error("Error updating user preferences:", error);
      
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }
  }

  /**
   * Reset preferences to default values
   */
  async resetPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Get existing user
      const userDoc = await collections.users.doc(userId).get();
      
      if (!userDoc.exists) {
        throw new NotFoundError("User not found");
      }
      
      // Get default preferences
      const defaultPreferences = this.getDefaultPreferences();
      
      // Update in database
      await collections.users.doc(userId).update({
        preferences: {
          ...defaultPreferences,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      });
      
      logger.info(`✅ User preferences reset to defaults: ${userId}`);
      
      return this.mapPreferences(defaultPreferences);
      
    } catch (error: any) {
      logger.error("Error resetting user preferences:", error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new Error(`Failed to reset user preferences: ${error.message}`);
    }
  }

  /**
   * Get available options for preferences
   */
  async getPreferencesOptions(): Promise<PreferencesOptions> {
    return {
      languages: [
        { value: 'fr-FR', label: 'Français (France)' },
        { value: 'en-US', label: 'English (US)' },
        { value: 'en-GB', label: 'English (UK)' },
        { value: 'de-DE', label: 'Deutsch' },
        { value: 'es-ES', label: 'Español' },
        { value: 'it-IT', label: 'Italiano' },
        { value: 'pt-PT', label: 'Português' },
        { value: 'nl-NL', label: 'Nederlands' },
        { value: 'sv-SE', label: 'Svenska' },
        { value: 'da-DK', label: 'Dansk' },
        { value: 'no-NO', label: 'Norsk' },
        { value: 'fi-FI', label: 'Suomi' }
      ],
      timezones: [
        { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
        { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
        { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST)' },
        { value: 'Europe/Madrid', label: 'Europe/Madrid (CET/CEST)' },
        { value: 'Europe/Rome', label: 'Europe/Rome (CET/CEST)' },
        { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET/CEST)' },
        { value: 'Europe/Stockholm', label: 'Europe/Stockholm (CET/CEST)' },
        { value: 'Europe/Copenhagen', label: 'Europe/Copenhagen (CET/CEST)' },
        { value: 'Europe/Oslo', label: 'Europe/Oslo (CET/CEST)' },
        { value: 'Europe/Helsinki', label: 'Europe/Helsinki (EET/EEST)' },
        { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
        { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
        { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
        { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
        { value: 'America/Toronto', label: 'America/Toronto (EST/EDT)' },
        { value: 'America/Vancouver', label: 'America/Vancouver (PST/PDT)' },
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
        { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)' },
        { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
        { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
        { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
        { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT)' },
        { value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
      ],
      dateFormats: [
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
        { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2024)' },
        { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2024)' },
        { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD (2024/12/31)' }
      ],
      timeFormats: [
        { value: 'HH:mm', label: '24h (HH:mm) - 14:30' },
        { value: 'hh:mm A', label: '12h (hh:mm AM/PM) - 2:30 PM' },
        { value: 'HH:mm:ss', label: '24h with seconds (HH:mm:ss) - 14:30:45' },
        { value: 'hh:mm:ss A', label: '12h with seconds (hh:mm:ss AM/PM) - 2:30:45 PM' }
      ]
    };
  }

  /**
   * Map preferences data with defaults
   */
  private mapPreferences(data: any): UserPreferences {
    const defaults = this.getDefaultPreferences();
    
    return {
      language: data?.language ?? defaults.language,
      timezone: data?.timezone ?? defaults.timezone,
      dateFormat: data?.dateFormat ?? defaults.dateFormat,
      timeFormat: data?.timeFormat ?? defaults.timeFormat,
      weekStartsOn: data?.weekStartsOn ?? defaults.weekStartsOn,
      theme: data?.theme ?? defaults.theme,
      gracePeriod: data?.gracePeriod ?? defaults.gracePeriod,
      autoCheckOut: data?.autoCheckOut ?? defaults.autoCheckOut,
      emailNotifications: data?.emailNotifications ?? defaults.emailNotifications,
      pushNotifications: data?.pushNotifications ?? defaults.pushNotifications,
      soundNotifications: data?.soundNotifications ?? defaults.soundNotifications,
    };
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'fr-FR',
      timezone: 'Europe/Paris',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      weekStartsOn: 'monday',
      theme: 'system',
      gracePeriod: 15,
      autoCheckOut: false,
      emailNotifications: true,
      pushNotifications: false,
      soundNotifications: false,
    };
  }

  /**
   * Validate preferences update
   */
  private validatePreferencesUpdate(updates: UserPreferencesUpdate): void {
    // Validate language
    if (updates.language && !this.isValidLanguage(updates.language)) {
      throw new ValidationError("Invalid language code");
    }
    
    // Validate timezone
    if (updates.timezone && !this.isValidTimezone(updates.timezone)) {
      throw new ValidationError("Invalid timezone");
    }
    
    // Validate date format
    if (updates.dateFormat && !this.isValidDateFormat(updates.dateFormat)) {
      throw new ValidationError("Invalid date format");
    }
    
    // Validate time format
    if (updates.timeFormat && !this.isValidTimeFormat(updates.timeFormat)) {
      throw new ValidationError("Invalid time format");
    }
    
    // Validate week start
    if (updates.weekStartsOn && !['monday', 'sunday'].includes(updates.weekStartsOn)) {
      throw new ValidationError("Week start must be 'monday' or 'sunday'");
    }
    
    // Validate theme
    if (updates.theme && !['light', 'dark', 'system'].includes(updates.theme)) {
      throw new ValidationError("Theme must be 'light', 'dark', or 'system'");
    }
    
    // Validate grace period
    if (updates.gracePeriod !== undefined) {
      if (!Number.isInteger(updates.gracePeriod) || updates.gracePeriod < 0 || updates.gracePeriod > 60) {
        throw new ValidationError("Grace period must be an integer between 0 and 60 minutes");
      }
    }
    
    // Validate boolean fields
    if (updates.autoCheckOut !== undefined && typeof updates.autoCheckOut !== 'boolean') {
      throw new ValidationError("autoCheckOut must be a boolean");
    }
    
    if (updates.emailNotifications !== undefined && typeof updates.emailNotifications !== 'boolean') {
      throw new ValidationError("emailNotifications must be a boolean");
    }
    
    if (updates.pushNotifications !== undefined && typeof updates.pushNotifications !== 'boolean') {
      throw new ValidationError("pushNotifications must be a boolean");
    }
    
    if (updates.soundNotifications !== undefined && typeof updates.soundNotifications !== 'boolean') {
      throw new ValidationError("soundNotifications must be a boolean");
    }
  }

  /**
   * Validate language code
   */
  private isValidLanguage(language: string): boolean {
    const validLanguages = ['fr-FR', 'en-US', 'en-GB', 'de-DE', 'es-ES', 'it-IT', 'pt-PT', 'nl-NL', 'sv-SE', 'da-DK', 'no-NO', 'fi-FI'];
    return validLanguages.includes(language);
  }

  /**
   * Validate timezone
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate date format
   */
  private isValidDateFormat(format: string): boolean {
    const validFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD'];
    return validFormats.includes(format);
  }

  /**
   * Validate time format
   */
  private isValidTimeFormat(format: string): boolean {
    const validFormats = ['HH:mm', 'hh:mm A', 'HH:mm:ss', 'hh:mm:ss A'];
    return validFormats.includes(format);
  }
}

export const userPreferencesService = new UserPreferencesService();