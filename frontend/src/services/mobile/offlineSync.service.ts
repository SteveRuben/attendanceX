/**
 * Service de synchronisation hors ligne pour la présence
 */

interface OfflinePresenceEntry {
  id: string;
  type: 'clock-in' | 'clock-out' | 'start-break' | 'end-break';
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  employeeId: string;
  synced: boolean;
  retryCount: number;
}

interface OfflineQueueItem {
  id: string;
  action: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineSyncService {
  private readonly STORAGE_KEY = 'offline_presence_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 secondes
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;

  constructor() {
    this.initializeEventListeners();
    this.startSyncInterval();
  }

  /**
   * Initialiser les écouteurs d'événements
   */
  private initializeEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingEntries();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Synchroniser avant la fermeture de l'application
    window.addEventListener('beforeunload', () => {
      if (this.isOnline) {
        this.syncPendingEntries();
      }
    });
  }

  /**
   * Démarrer l'intervalle de synchronisation
   */
  private startSyncInterval() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingEntries();
      }
    }, 30000); // Synchroniser toutes les 30 secondes
  }

  /**
   * Arrêter l'intervalle de synchronisation
   */
  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Ajouter une entrée à la queue hors ligne
   */
  async addToOfflineQueue(
    type: 'clock-in' | 'clock-out' | 'start-break' | 'end-break',
    employeeId: string,
    location?: { latitude: number; longitude: number; accuracy?: number }
  ): Promise<string> {
    const entry: OfflinePresenceEntry = {
      id: this.generateId(),
      type,
      timestamp: Date.now(),
      location,
      employeeId,
      synced: false,
      retryCount: 0
    };

    const queue = this.getOfflineQueue();
    queue.push(entry);
    this.saveOfflineQueue(queue);

    // Essayer de synchroniser immédiatement si en ligne
    if (this.isOnline) {
      setTimeout(() => this.syncPendingEntries(), 1000);
    }

    return entry.id;
  }

  /**
   * Obtenir la queue hors ligne
   */
  private getOfflineQueue(): OfflinePresenceEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      return [];
    }
  }

  /**
   * Sauvegarder la queue hors ligne
   */
  private saveOfflineQueue(queue: OfflinePresenceEntry[]) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Synchroniser les entrées en attente
   */
  async syncPendingEntries(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    const queue = this.getOfflineQueue();
    const pendingEntries = queue.filter(entry => !entry.synced);

    if (pendingEntries.length === 0) {
      return;
    }

    console.log(`Syncing ${pendingEntries.length} offline entries...`);

    const syncPromises = pendingEntries.map(entry => this.syncEntry(entry));
    const results = await Promise.allSettled(syncPromises);

    // Mettre à jour la queue avec les résultats
    let updatedQueue = this.getOfflineQueue();
    
    results.forEach((result, index) => {
      const entry = pendingEntries[index];
      const queueIndex = updatedQueue.findIndex(q => q.id === entry.id);
      
      if (queueIndex !== -1) {
        if (result.status === 'fulfilled') {
          // Marquer comme synchronisé
          updatedQueue[queueIndex].synced = true;
        } else {
          // Incrémenter le compteur de tentatives
          updatedQueue[queueIndex].retryCount++;
          
          // Supprimer si trop de tentatives échouées
          if (updatedQueue[queueIndex].retryCount >= this.MAX_RETRIES) {
            console.error(`Failed to sync entry ${entry.id} after ${this.MAX_RETRIES} attempts`);
            updatedQueue.splice(queueIndex, 1);
          }
        }
      }
    });

    // Nettoyer les entrées synchronisées anciennes (plus de 24h)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    updatedQueue = updatedQueue.filter(entry => 
      !entry.synced || entry.timestamp > oneDayAgo
    );

    this.saveOfflineQueue(updatedQueue);
  }

  /**
   * Synchroniser une entrée individuelle
   */
  private async syncEntry(entry: OfflinePresenceEntry): Promise<void> {
    try {
      const response = await fetch('/api/presence/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: entry.type,
          timestamp: entry.timestamp,
          location: entry.location,
          employeeId: entry.employeeId,
          offlineId: entry.id
        })
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Successfully synced entry ${entry.id}`);
    } catch (error) {
      console.error(`Failed to sync entry ${entry.id}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir le nombre d'entrées en attente de synchronisation
   */
  getPendingCount(): number {
    const queue = this.getOfflineQueue();
    return queue.filter(entry => !entry.synced).length;
  }

  /**
   * Obtenir les entrées en attente
   */
  getPendingEntries(): OfflinePresenceEntry[] {
    const queue = this.getOfflineQueue();
    return queue.filter(entry => !entry.synced);
  }

  /**
   * Vérifier si une entrée est en cours de synchronisation
   */
  isEntrySynced(entryId: string): boolean {
    const queue = this.getOfflineQueue();
    const entry = queue.find(e => e.id === entryId);
    return entry ? entry.synced : false;
  }

  /**
   * Supprimer une entrée de la queue
   */
  removeEntry(entryId: string): void {
    const queue = this.getOfflineQueue();
    const filteredQueue = queue.filter(entry => entry.id !== entryId);
    this.saveOfflineQueue(filteredQueue);
  }

  /**
   * Vider toute la queue
   */
  clearQueue(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  getSyncStats(): {
    total: number;
    synced: number;
    pending: number;
    failed: number;
  } {
    const queue = this.getOfflineQueue();
    const synced = queue.filter(e => e.synced).length;
    const pending = queue.filter(e => !e.synced && e.retryCount < this.MAX_RETRIES).length;
    const failed = queue.filter(e => !e.synced && e.retryCount >= this.MAX_RETRIES).length;

    return {
      total: queue.length,
      synced,
      pending,
      failed
    };
  }

  /**
   * Forcer la synchronisation
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingEntries();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Vérifier l'état de la connexion
   */
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimer la taille de stockage utilisée
   */
  getStorageSize(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? new Blob([stored]).size : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Nettoyer le stockage si nécessaire
   */
  cleanupStorage(): void {
    const queue = this.getOfflineQueue();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Supprimer les entrées synchronisées de plus d'une semaine
    const cleanedQueue = queue.filter(entry => 
      !entry.synced || entry.timestamp > oneWeekAgo
    );

    if (cleanedQueue.length !== queue.length) {
      this.saveOfflineQueue(cleanedQueue);
      console.log(`Cleaned up ${queue.length - cleanedQueue.length} old entries`);
    }
  }
}

export const offlineSyncService = new OfflineSyncService();