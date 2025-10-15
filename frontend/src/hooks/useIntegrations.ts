import { useState, useEffect, useCallback } from 'react';
import { integrationService, type IntegrationStats, type SyncHistory } from '../services/integrationService';
import { toast } from 'react-toastify';
import { type UserIntegration, type IntegrationProvider, IntegrationStatus } from '../shared';

export interface UseIntegrationsOptions {
    autoLoad?: boolean;
    filters?: {
        provider?: IntegrationProvider;
        status?: IntegrationStatus;
    };
}

export interface UseIntegrationsReturn {
    integrations: UserIntegration[];
    loading: boolean;
    error: string | null;
    stats: IntegrationStats | null;

    // Actions
    loadIntegrations: () => Promise<void>;
    connectIntegration: (provider: IntegrationProvider, scopes?: string[]) => Promise<string>;
    disconnectIntegration: (integrationId: string) => Promise<void>;
    updateSyncSettings: (integrationId: string, settings: Partial<UserIntegration['syncSettings']>) => Promise<void>;
    triggerSync: (integrationId: string, syncType?: 'full' | 'incremental') => Promise<void>;
    testConnection: (integrationId: string) => Promise<boolean>;
    refreshTokens: (integrationId: string) => Promise<void>;

    // Utilitaires
    getIntegrationByProvider: (provider: IntegrationProvider) => UserIntegration | undefined;
    getConnectedIntegrations: () => UserIntegration[];
    hasIntegration: (provider: IntegrationProvider) => boolean;
    isConnected: (provider: IntegrationProvider) => boolean;
}

export const useIntegrations = (options: UseIntegrationsOptions = {}): UseIntegrationsReturn => {
    const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<IntegrationStats | null>(null);

    const { autoLoad = true, filters } = options;

    // Charger les intégrations
    const loadIntegrations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [integrationsData, statsData] = await Promise.all([
                integrationService.getUserIntegrations(filters),
                integrationService.getIntegrationStats()
            ]);

            setIntegrations(integrationsData);
            setStats(statsData);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des intégrations';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Connecter une intégration
    const connectIntegration = useCallback(async (provider: IntegrationProvider, scopes?: string[]): Promise<string> => {
        try {
            const { authUrl } = await integrationService.initiateOAuth(provider, { scopes });
            return authUrl;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'initiation de la connexion';
            toast.error(errorMessage);
            throw err;
        }
    }, []);

    // Déconnecter une intégration
    const disconnectIntegration = useCallback(async (integrationId: string) => {
        try {
            await integrationService.disconnectIntegration(integrationId);

            // Mettre à jour l'état local
            setIntegrations(prev => prev.filter(integration => integration.id !== integrationId));

            toast.success('Intégration déconnectée avec succès');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la déconnexion';
            toast.error(errorMessage);
            throw err;
        }
    }, []);

    // Mettre à jour les paramètres de synchronisation
    const updateSyncSettings = useCallback(async (
        integrationId: string,
        settings: Partial<UserIntegration['syncSettings']>
    ) => {
        try {
            const updatedIntegration = await integrationService.updateSyncSettings(integrationId, settings);

            // Mettre à jour l'état local
            setIntegrations(prev => prev.map(integration =>
                integration.id === integrationId ? updatedIntegration : integration
            ));

            toast.success('Paramètres mis à jour');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
            toast.error(errorMessage);
            throw err;
        }
    }, []);

    // Déclencher une synchronisation
    const triggerSync = useCallback(async (integrationId: string, syncType: 'full' | 'incremental' = 'incremental') => {
        try {
            await integrationService.triggerSync(integrationId, { syncType });

            // Mettre à jour la date de dernière synchronisation
            setIntegrations(prev => prev.map(integration =>
                integration.id === integrationId
                    ? { ...integration, lastSyncAt: new Date() }
                    : integration
            ));

            toast.success('Synchronisation démarrée');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la synchronisation';
            toast.error(errorMessage);
            throw err;
        }
    }, []);

    // Tester la connexion
    const testConnection = useCallback(async (integrationId: string): Promise<boolean> => {
        try {
            const result = await integrationService.testConnection(integrationId);

            if (result.success) {
                toast.success('Connexion testée avec succès');
                return true;
            } else {
                toast.error(`Test de connexion échoué: ${result.message}`);
                return false;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du test de connexion';
            toast.error(errorMessage);
            return false;
        }
    }, []);

    // Rafraîchir les tokens
    const refreshTokens = useCallback(async (integrationId: string) => {
        try {
            const updatedIntegration = await integrationService.refreshTokens(integrationId);

            // Mettre à jour l'état local
            setIntegrations(prev => prev.map(integration =>
                integration.id === integrationId ? updatedIntegration : integration
            ));

            toast.success('Tokens rafraîchis');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du rafraîchissement des tokens';
            toast.error(errorMessage);
            throw err;
        }
    }, []);

    // Utilitaires
    const getIntegrationByProvider = useCallback((provider: IntegrationProvider): UserIntegration | undefined => {
        return integrations.find(integration => integration.provider === provider);
    }, [integrations]);

    const getConnectedIntegrations = useCallback((): UserIntegration[] => {
        return integrations.filter(integration => integration.status === IntegrationStatus.CONNECTED);
    }, [integrations]);

    const hasIntegration = useCallback((provider: IntegrationProvider): boolean => {
        return integrations.some(integration => integration.provider === provider);
    }, [integrations]);

    const isConnected = useCallback((provider: IntegrationProvider): boolean => {
        const integration = getIntegrationByProvider(provider);
        return integration?.status === IntegrationStatus.CONNECTED;
    }, [getIntegrationByProvider]);

    // Charger automatiquement au montage
    useEffect(() => {
        if (autoLoad) {
            loadIntegrations();
        }
    }, [autoLoad, loadIntegrations]);

    return {
        integrations,
        loading,
        error,
        stats,

        // Actions
        loadIntegrations,
        connectIntegration,
        disconnectIntegration,
        updateSyncSettings,
        triggerSync,
        testConnection,
        refreshTokens,

        // Utilitaires
        getIntegrationByProvider,
        getConnectedIntegrations,
        hasIntegration,
        isConnected
    };
};

// Hook pour l'historique de synchronisation
export interface UseSyncHistoryOptions {
    integrationId: string;
    autoLoad?: boolean;
    limit?: number;
}

export interface UseSyncHistoryReturn {
    history: SyncHistory[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    total: number;

    loadHistory: () => Promise<void>;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
}

export const useSyncHistory = (options: UseSyncHistoryOptions): UseSyncHistoryReturn => {
    const [history, setHistory] = useState<SyncHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);

    const { integrationId, autoLoad = true, limit = 20 } = options;

    const loadHistory = useCallback(async (reset = true) => {
        try {
            setLoading(true);
            setError(null);

            const currentOffset = reset ? 0 : offset;
            const result = await integrationService.getSyncHistory(integrationId, {
                limit,
                offset: currentOffset
            });

            if (reset) {
                setHistory(result.history);
                setOffset(result.history.length);
            } else {
                setHistory(prev => [...prev, ...result.history]);
                setOffset(prev => prev + result.history.length);
            }

            setHasMore(result.hasMore);
            setTotal(result.total);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement de l\'historique';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [integrationId, limit, offset]);

    const loadMore = useCallback(async () => {
        if (!hasMore || loading) return;
        await loadHistory(false);
    }, [hasMore, loading, loadHistory]);

    const refresh = useCallback(async () => {
        await loadHistory(true);
    }, [loadHistory]);

    useEffect(() => {
        if (autoLoad && integrationId) {
            loadHistory(true);
        }
    }, [autoLoad, integrationId, loadHistory]);

    return {
        history,
        loading,
        error,
        hasMore,
        total,
        loadHistory,
        loadMore,
        refresh
    };
};