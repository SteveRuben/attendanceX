import { apiService } from './apiService';
import type { UserPreferences as BaseUserPreferences } from '../shared';

// Extension des préférences utilisateur avec des options supplémentaires
export interface ExtendedUserPreferences extends Omit<BaseUserPreferences, 'theme' | 'notifications' | 'privacy'> {
    theme?: 'light' | 'dark' | 'auto';
    timezone?: string;
    notifications?: {
        email: boolean;
        push: boolean;
        sms: boolean;
        eventReminders: boolean;
        teamUpdates: boolean;
        systemAlerts: boolean;
        digest: 'daily' | 'weekly' | 'monthly' | 'never';
    };
    dashboard?: {
        defaultView: 'grid' | 'list';
        itemsPerPage: number;
        showWelcomeMessage: boolean;
    };
    privacy?: {
        profileVisibility: 'public' | 'organization' | 'private';
        showOnlineStatus: boolean;
        allowDirectMessages: boolean;
        showProfile: boolean;
        showActivity: boolean;
    };
    accessibility?: {
        highContrast: boolean;
        largeText: boolean;
        screenReader: boolean;
    };
}

// Utiliser les préférences étendues comme type principal
export type UserPreferences = ExtendedUserPreferences;

export interface OrganizationPreferences {
    branding: {
        primaryColor: string;
        secondaryColor: string;
        logo?: string;
        favicon?: string;
    };
    general: {
        timezone: string;
        dateFormat: string;
        timeFormat: '12h' | '24h';
        weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
        language: string;
    };
    features: {
        enableQRCodes: boolean;
        enableTeamManagement: boolean;
        enableAnalytics: boolean;
        enableCampaigns: boolean;
        enableIntegrations: boolean;
    };
    notifications: {
        defaultEmailNotifications: boolean;
        allowMemberNotificationOverride: boolean;
        systemNotifications: boolean;
    };
    security: {
        requireTwoFactor: boolean;
        sessionTimeout: number; // in minutes
        allowGuestAccess: boolean;
        passwordPolicy: {
            minLength: number;
            requireUppercase: boolean;
            requireLowercase: boolean;
            requireNumbers: boolean;
            requireSpecialChars: boolean;
        };
    };
}

export interface CombinedPreferences {
    user: UserPreferences;
    organization: OrganizationPreferences;
    effective: {
        theme: string;
        language: string;
        timezone: string;
        dateFormat: string;
        timeFormat: string;
    };
}

class PreferencesService {
    private userPreferencesCache: UserPreferences | null = null;
    private organizationPreferencesCache: OrganizationPreferences | null = null;

    /**
     * Récupérer les préférences utilisateur
     */
    async getUserPreferences(userId: string): Promise<UserPreferences> {
        try {
            if (this.userPreferencesCache) {
                return this.userPreferencesCache;
            }

            const response = await apiService.get(`/users/${userId}/preferences`);
            this.userPreferencesCache = response.data;
            return response.data;
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            // Retourner des préférences par défaut
            return this.getDefaultUserPreferences();
        }
    }

    /**
     * Mettre à jour les préférences utilisateur
     */
    async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        try {
            const response = await apiService.put(`/users/${userId}/preferences`, preferences);
            this.userPreferencesCache = response.data;
            return response.data;
        } catch (error) {
            console.error('Error updating user preferences:', error);
            throw error;
        }
    }

    /**
     * Récupérer les préférences de l'organisation
     */
    async getOrganizationPreferences(organizationId: string): Promise<OrganizationPreferences> {
        try {
            if (this.organizationPreferencesCache) {
                return this.organizationPreferencesCache;
            }

            const response = await apiService.get(`/organizations/${organizationId}/preferences`);
            this.organizationPreferencesCache = response.data;
            return response.data;
        } catch (error) {
            console.error('Error fetching organization preferences:', error);
            // Retourner des préférences par défaut
            return this.getDefaultOrganizationPreferences();
        }
    }

    /**
     * Mettre à jour les préférences de l'organisation
     */
    async updateOrganizationPreferences(
        organizationId: string,
        preferences: Partial<OrganizationPreferences>
    ): Promise<OrganizationPreferences> {
        try {
            const response = await apiService.put(`/organizations/${organizationId}/preferences`, preferences);
            this.organizationPreferencesCache = response.data;
            return response.data;
        } catch (error) {
            console.error('Error updating organization preferences:', error);
            throw error;
        }
    }

    /**
     * Récupérer les préférences combinées (utilisateur + organisation)
     */
    async getCombinedPreferences(userId: string, organizationId: string): Promise<CombinedPreferences> {
        try {
            const [userPrefs, orgPrefs] = await Promise.all([
                this.getUserPreferences(userId),
                this.getOrganizationPreferences(organizationId)
            ]);

            // Calculer les préférences effectives (utilisateur override organisation)
            const effective = {
                theme: userPrefs.theme === 'auto' ? 'light' : (userPrefs.theme || 'light'),
                language: userPrefs.language || orgPrefs.general.language,
                timezone: userPrefs.timezone || orgPrefs.general.timezone,
                dateFormat: orgPrefs.general.dateFormat,
                timeFormat: orgPrefs.general.timeFormat
            };

            return {
                user: userPrefs,
                organization: orgPrefs,
                effective
            };
        } catch (error) {
            console.error('Error fetching combined preferences:', error);
            throw error;
        }
    }

    /**
     * Préférences utilisateur par défaut
     */
    private getDefaultUserPreferences(): UserPreferences {
        return {
            language: 'fr',
            theme: 'auto',
            timezone: 'Europe/Paris',
            notifications: {
                email: true,
                push: true,
                sms: false,
                eventReminders: true,
                teamUpdates: true,
                systemAlerts: true,
                digest: 'daily'
            },
            dashboard: {
                defaultView: 'grid',
                itemsPerPage: 20,
                showWelcomeMessage: true
            },
            privacy: {
                profileVisibility: 'organization',
                showOnlineStatus: true,
                allowDirectMessages: true,
                showProfile: true,
                showActivity: true
            },
            accessibility: {
                highContrast: false,
                largeText: false,
                screenReader: false
            }
        };
    }

    /**
     * Préférences organisation par défaut
     */
    private getDefaultOrganizationPreferences(): OrganizationPreferences {
        return {
            branding: {
                primaryColor: '#3b82f6',
                secondaryColor: '#64748b'
            },
            general: {
                timezone: 'Europe/Paris',
                dateFormat: 'DD/MM/YYYY',
                timeFormat: '24h',
                weekStartsOn: 1,
                language: 'fr'
            },
            features: {
                enableQRCodes: true,
                enableTeamManagement: true,
                enableAnalytics: true,
                enableCampaigns: true,
                enableIntegrations: false
            },
            notifications: {
                defaultEmailNotifications: true,
                allowMemberNotificationOverride: true,
                systemNotifications: true
            },
            security: {
                requireTwoFactor: false,
                sessionTimeout: 480, // 8 heures
                allowGuestAccess: false,
                passwordPolicy: {
                    minLength: 8,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumbers: true,
                    requireSpecialChars: false
                }
            }
        };
    }

    /**
     * Vider le cache des préférences
     */
    clearCache(): void {
        this.userPreferencesCache = null;
        this.organizationPreferencesCache = null;
    }

    /**
     * Appliquer le thème basé sur les préférences
     */
    applyTheme(preferences: CombinedPreferences): void {
        const theme = preferences.effective.theme;
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Appliquer les couleurs de branding
        if (preferences.organization.branding.primaryColor) {
            root.style.setProperty('--primary', preferences.organization.branding.primaryColor);
        }
        if (preferences.organization.branding.secondaryColor) {
            root.style.setProperty('--secondary', preferences.organization.branding.secondaryColor);
        }
    }

    /**
     * Formater une date selon les préférences
     */
    formatDate(date: Date, preferences: CombinedPreferences): string {
        const locale = preferences.effective.language === 'fr' ? 'fr-FR' : 'en-US';
        const options: Intl.DateTimeFormatOptions = {
            timeZone: preferences.effective.timezone
        };

        // Appliquer le format de date
        switch (preferences.organization.general.dateFormat) {
            case 'MM/DD/YYYY':
                options.month = '2-digit';
                options.day = '2-digit';
                options.year = 'numeric';
                break;
            case 'DD/MM/YYYY':
            default:
                options.day = '2-digit';
                options.month = '2-digit';
                options.year = 'numeric';
                break;
        }

        return new Intl.DateTimeFormat(locale, options).format(date);
    }

    /**
     * Formater une heure selon les préférences
     */
    formatTime(date: Date, preferences: CombinedPreferences): string {
        const locale = preferences.effective.language === 'fr' ? 'fr-FR' : 'en-US';
        const options: Intl.DateTimeFormatOptions = {
            timeZone: preferences.effective.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: preferences.organization.general.timeFormat === '12h'
        };

        return new Intl.DateTimeFormat(locale, options).format(date);
    }
}

const preferencesService = new PreferencesService();

export { preferencesService };