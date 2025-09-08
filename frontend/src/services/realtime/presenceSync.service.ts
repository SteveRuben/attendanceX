/**
 * Service de synchronisation temps réel pour la présence
 */

import { presenceIntegrationApi } from '../api/presence-integration.api';
import { PresenceEntry, Employee } from '../../shared';

interface SyncEvent {
  type: 'presence_update' | 'schedule_change' | 'leave_update' | 'anomaly_alert' | 'team_update';
  data: any;
  timestamp: number;
  employeeId: string;
}

interface SyncSubscription {
  id: string;
  callback: (event: SyncEvent) => void;
  filter?: (event: SyncEvent) => boolean;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
}

class PresenceSyncService {
  private subscriptions: Map<string, SyncSubscription> = new Map();
  private connectionState: ConnectionState = {
    status: 'disconnected',
    reconnectAttempts: 0
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Configuration des écouteurs d'événements
   */
  private setupEventListeners() {
    // Écouter les changements de connexion réseau
    window.addEventListener('online', () => {
      console.log('Network back online, reconnecting...');
      this.reconnect();
    });

    window.addEventListener('offline', () => {
      console.log('Network offline, pausing sync...');
      this.disconnect();
    });

    // Écouter les changements de visibilité de la page
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.resumeSync();
      } else {
        this.pauseSync();
      }
    });
  }

  /**
   * Se connecter au service de synchronisation
   */
  async connect(employeeId: string): Promise<void> {
    if (this.connectionState.status === 'connected' || this.connectionState.status === 'connecting') {
      return;
    }

    this.connectionState.status = 'connecting';
    this.connectionState.error = undefined;

    try {
      // Établir la connexion temps réel
      presenceIntegrationApi.connectRealTime(employeeId, (update) => {
        this.handleRealTimeUpdate(update);
      });

      this.connectionState.status = 'connected';
      this.connectionState.lastConnected = Date.now();
      this.connectionState.reconnectAttempts = 0;

      // Démarrer le heartbeat
      this.startHeartbeat();

      console.log('Presence sync connected');
      this.notifySubscribers({
        type: 'presence_update',
        data: { connected: true },
        timestamp: Date.now(),
        employeeId
      });

    } catch (error) {
      this.connectionState.status = 'error';
      this.connectionState.error = error instanceof Error ? error.message : 'Connection failed';
      
      console.error('Failed to connect presence sync:', error);
      this.scheduleReconnect(employeeId);
    }
  }

  /**
   * Se déconnecter du service
   */
  disconnect(): void {
    presenceIntegrationApi.disconnectRealTime();
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    this.connectionState.status = 'disconnected';
    this.connectionState.error = undefined;
    
    console.log('Presence sync disconnected');
  }

  /**
   * Reconnecter automatiquement
   */
  private async reconnect(): Promise<void> {
    if (this.connectionState.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.connectionState.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.connectionState.reconnectAttempts}/${this.maxReconnectAttempts}`);

    // Récupérer l'employeeId depuis le dernier appel (à améliorer)
    const employeeId = this.getStoredEmployeeId();
    if (employeeId) {
      await this.connect(employeeId);
    }
  }

  /**
   * Programmer une reconnexion
   */
  private scheduleReconnect(employeeId: string): void {
    this.clearReconnectTimer();
    
    const delay = this.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(employeeId);
    }, delay);
  }

  /**
   * Annuler le timer de reconnexion
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Démarrer le heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // Heartbeat toutes les 30 secondes
  }

  /**
   * Arrêter le heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Envoyer un heartbeat
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      await presenceIntegrationApi.healthCheck();
      this.lastHeartbeat = Date.now();
    } catch (error) {
      console.warn('Heartbeat failed:', error);
      
      // Si le heartbeat échoue, considérer la connexion comme perdue
      if (this.connectionState.status === 'connected') {
        this.connectionState.status = 'error';
        this.connectionState.error = 'Heartbeat failed';
        
        const employeeId = this.getStoredEmployeeId();
        if (employeeId) {
          this.scheduleReconnect(employeeId);
        }
      }
    }
  }

  /**
   * Gérer les mises à jour temps réel
   */
  private handleRealTimeUpdate(update: any): void {
    const syncEvent: SyncEvent = {
      type: update.type,
      data: update.data,
      timestamp: update.timestamp,
      employeeId: update.employeeId
    };

    this.notifySubscribers(syncEvent);
  }

  /**
   * Notifier tous les abonnés
   */
  private notifySubscribers(event: SyncEvent): void {
    this.subscriptions.forEach((subscription) => {
      try {
        // Appliquer le filtre si défini
        if (subscription.filter && !subscription.filter(event)) {
          return;
        }

        subscription.callback(event);
      } catch (error) {
        console.error('Error in sync subscription callback:', error);
      }
    });
  }

  /**
   * S'abonner aux mises à jour
   */
  subscribe(
    callback: (event: SyncEvent) => void,
    filter?: (event: SyncEvent) => boolean
  ): string {
    const id = this.generateSubscriptionId();
    
    this.subscriptions.set(id, {
      id,
      callback,
      filter
    });

    return id;
  }

  /**
   * Se désabonner
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * S'abonner aux mises à jour de présence d'un employé spécifique
   */
  subscribeToEmployee(
    employeeId: string,
    callback: (event: SyncEvent) => void
  ): string {
    return this.subscribe(callback, (event) => event.employeeId === employeeId);
  }

  /**
   * S'abonner aux mises à jour d'équipe
   */
  subscribeToTeam(
    teamId: string,
    callback: (event: SyncEvent) => void
  ): string {
    return this.subscribe(callback, (event) => {
      // Logique pour filtrer par équipe (à adapter selon la structure des données)
      return event.data?.teamId === teamId || event.type === 'team_update';
    });
  }

  /**
   * S'abonner aux anomalies
   */
  subscribeToAnomalies(callback: (event: SyncEvent) => void): string {
    return this.subscribe(callback, (event) => event.type === 'anomaly_alert');
  }

  /**
   * Synchroniser manuellement les données
   */
  async manualSync(employeeId: string): Promise<void> {
    try {
      // Synchroniser les données hors ligne
      const offlineData = this.getOfflineData();
      if (offlineData.length > 0) {
        await presenceIntegrationApi.syncOfflineData(offlineData);
        this.clearOfflineData();
      }

      // Récupérer les dernières données
      const currentPresence = await presenceIntegrationApi.getCurrentPresence(employeeId);
      
      this.notifySubscribers({
        type: 'presence_update',
        data: { presence: currentPresence, synced: true },
        timestamp: Date.now(),
        employeeId
      });

    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    }
  }

  /**
   * Mettre en pause la synchronisation
   */
  pauseSync(): void {
    this.stopHeartbeat();
    console.log('Presence sync paused');
  }

  /**
   * Reprendre la synchronisation
   */
  resumeSync(): void {
    if (this.connectionState.status === 'connected') {
      this.startHeartbeat();
      console.log('Presence sync resumed');
    }
  }

  /**
   * Obtenir l'état de la connexion
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Vérifier si la connexion est active
   */
  isConnected(): boolean {
    return this.connectionState.status === 'connected';
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  getSyncStats(): {
    connectionState: ConnectionState;
    subscriptionCount: number;
    lastHeartbeat: number;
    uptime: number;
  } {
    return {
      connectionState: this.getConnectionState(),
      subscriptionCount: this.subscriptions.size,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.connectionState.lastConnected 
        ? Date.now() - this.connectionState.lastConnected 
        : 0
    };
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStoredEmployeeId(): string | null {
    // Récupérer l'ID employé depuis le localStorage ou le contexte
    return localStorage.getItem('currentEmployeeId');
  }

  private getOfflineData(): any[] {
    try {
      const stored = localStorage.getItem('offline_presence_queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private clearOfflineData(): void {
    localStorage.removeItem('offline_presence_queue');
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    this.disconnect();
    this.subscriptions.clear();
  }
}

// Instance singleton
export const presenceSyncService = new PresenceSyncService();

// Hook React pour utiliser la synchronisation
export const usePresenceSync = (employeeId?: string) => {
  const [connectionState, setConnectionState] = React.useState(
    presenceSyncService.getConnectionState()
  );

  React.useEffect(() => {
    // S'abonner aux changements d'état de connexion
    const subscriptionId = presenceSyncService.subscribe((event) => {
      if (event.type === 'presence_update' && event.data.connected !== undefined) {
        setConnectionState(presenceSyncService.getConnectionState());
      }
    });

    // Se connecter si un employeeId est fourni
    if (employeeId && !presenceSyncService.isConnected()) {
      presenceSyncService.connect(employeeId);
    }

    return () => {
      presenceSyncService.unsubscribe(subscriptionId);
    };
  }, [employeeId]);

  return {
    connectionState,
    isConnected: presenceSyncService.isConnected(),
    connect: presenceSyncService.connect.bind(presenceSyncService),
    disconnect: presenceSyncService.disconnect.bind(presenceSyncService),
    subscribe: presenceSyncService.subscribe.bind(presenceSyncService),
    unsubscribe: presenceSyncService.unsubscribe.bind(presenceSyncService),
    manualSync: presenceSyncService.manualSync.bind(presenceSyncService),
    getSyncStats: presenceSyncService.getSyncStats.bind(presenceSyncService)
  };
};