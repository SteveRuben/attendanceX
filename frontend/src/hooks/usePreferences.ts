import { useState, useEffect, useContext } from 'react';
import { preferencesService } from '@/services/preferencesService';
import type { CombinedPreferences, UserPreferences, OrganizationPreferences } from '@/services/preferencesService';

// Context pour partager les préférences dans l'application
import { createContext } from 'react';

export const PreferencesContext = createContext<{
  preferences: CombinedPreferences | null;
  updateUserPreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateOrganizationPreferences: (updates: Partial<OrganizationPreferences>) => Promise<void>;
  loading: boolean;
  error: string | null;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
  formatDateTime: (date: Date) => string;
  reload: () => Promise<void>;
}>({
  preferences: null,
  updateUserPreferences: async () => {},
  updateOrganizationPreferences: async () => {},
  loading: false,
  error: null,
  formatDate: () => '',
  formatTime: () => '',
  formatDateTime: () => '',
  reload: async () => {}
});

/**
 * Hook pour utiliser les préférences dans les composants
 */
export const usePreferences = (userId?: string, organizationId?: string) => {
  const [preferences, setPreferences] = useState<CombinedPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les préférences
  const loadPreferences = async () => {
    if (!userId || !organizationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const prefs = await preferencesService.getCombinedPreferences(userId, organizationId);
      setPreferences(prefs);
      
      // Appliquer le thème automatiquement
      preferencesService.applyTheme(prefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des préférences');
      console.error('Error loading preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour les préférences utilisateur
  const updateUserPreferences = async (updates: Partial<UserPreferences>) => {
    if (!userId || !preferences) return;

    try {
      const updatedUserPrefs = await preferencesService.updateUserPreferences(userId, updates);
      const newPreferences = {
        ...preferences,
        user: updatedUserPrefs,
        effective: {
          ...preferences.effective,
          theme: updatedUserPrefs.theme === 'auto' ? 'light' : (updatedUserPrefs.theme || 'light'),
          language: updatedUserPrefs.language || preferences.organization.general.language,
          timezone: updatedUserPrefs.timezone || preferences.organization.general.timezone,
        }
      };
      
      setPreferences(newPreferences);
      preferencesService.applyTheme(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des préférences');
      throw err;
    }
  };

  // Mettre à jour les préférences de l'organisation
  const updateOrganizationPreferences = async (updates: Partial<OrganizationPreferences>) => {
    if (!organizationId || !preferences) return;

    try {
      const updatedOrgPrefs = await preferencesService.updateOrganizationPreferences(organizationId, updates);
      const newPreferences = {
        ...preferences,
        organization: updatedOrgPrefs,
        effective: {
          ...preferences.effective,
          language: preferences.user.language || updatedOrgPrefs.general.language,
          timezone: preferences.user.timezone || updatedOrgPrefs.general.timezone,
          dateFormat: updatedOrgPrefs.general.dateFormat,
          timeFormat: updatedOrgPrefs.general.timeFormat
        }
      };
      
      setPreferences(newPreferences);
      preferencesService.applyTheme(newPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des préférences');
      throw err;
    }
  };

  // Formater une date selon les préférences
  const formatDate = (date: Date): string => {
    if (!preferences) return date.toLocaleDateString();
    return preferencesService.formatDate(date, preferences);
  };

  // Formater une heure selon les préférences
  const formatTime = (date: Date): string => {
    if (!preferences) return date.toLocaleTimeString();
    return preferencesService.formatTime(date, preferences);
  };

  // Formater une date et heure complète
  const formatDateTime = (date: Date): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  // Charger les préférences au montage du composant
  useEffect(() => {
    loadPreferences();
  }, [userId, organizationId]);

  return {
    preferences,
    loading,
    error,
    updateUserPreferences,
    updateOrganizationPreferences,
    formatDate,
    formatTime,
    formatDateTime,
    reload: loadPreferences
  };
};

/**
 * Hook pour utiliser les préférences depuis le contexte
 */
export const usePreferencesContext = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferencesContext must be used within a PreferencesProvider');
  }
  return context;
};