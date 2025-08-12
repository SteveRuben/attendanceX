// src/services/offlineSync.service.ts - Service de synchronisation hors ligne

import { openDB, IDBPDatabase } from 'idb';

interface OfflineAttendanceRecord {
  id: string;
  eventId: string;
  userId: string;
  method: string;
  timestamp: Date;
  qrCodeData?: string;
  location?: { latitude: number; longitude: number };
  deviceInfo?: any;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: Date;
  error?: string;
}

interface OfflineEventData {
  id: string;
  title: string;
  startDateTime: Date;
  endDateTime: Date;
  qrCode?: string;
  participants: string[];
  lastUpdated: Date;
}

class OfflineSyncService {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'AttendanceXOffline';
  private readonly DB_VERSION = 1;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialiser la base de données hors ligne
   */
  async initialize(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Store pour les présences hors ligne
          if (!db.objectStoreNames.contains('attendances')) {
            const attendanceStore = db.createObjectStore('attendances', { keyPath: 'id' });
            attendanceStore.createIndex('eventId', 'eventId');
            attendanceStore.createIndex('synced', 'synced');
            attendanceStore.createIndex('timestamp', 'timestamp');
          }

          // Store pour les données d'événements en cache
          if (!db.objectStoreNames.contains('events')) {
            const eventStore = db.createObjectStore('events', { keyPath: 'id' });
            eventStore.createIndex('lastUpdated', 'lastUpdated');
          }

          // Store pour les QR codes en cache
          if (!db.objectStoreNames.contains('qrCodes')) {
            const qrStore = db.createObjectStore('qrCodes', { keyPath: 'eventId' });
            qrStore.createIndex('expiresAt', 'expiresAt');
          }

          // Store pour les utilisateurs en cache
          if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'id' });
          }
        },
      });

      // Démarrer la synchronisation automatique
      this.startAutoSync();
    } catch (error) {
      console.error('Error initializing offline database:', error);
      throw error;
    }
  }

  /**
   * Vérifier si on est en mode hors ligne
   */
  isOffline(): boolean {
    return !navigator.onLine;
  }

  /**
   * Enregistrer une présence hors ligne
   */
  async recordOfflineAttendance(
    eventId: string,
    userId: string,
    method: string,
    additionalData: any = {}
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Offline database not initialized');
    }

    const attendanceId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record: OfflineAttendanceRecord = {
      id: attendanceId,
      eventId,
      userId,
      method,
      timestamp: new Date(),
      synced: false,
      syncAttempts: 0,
      ...additionalData
    };

    await this.db.add('attendances', record);
    
    // Essayer de synchroniser immédiatement si on est en ligne
    if (!this.isOffline()) {
      this.syncPendingAttendances();
    }

    return attendanceId;
  }

  /**
   * Mettre en cache les données d'un événement
   */
  async cacheEventData(eventData: any): Promise<void> {
    if (!this.db) return;

    const cachedEvent: OfflineEventData = {
      id: eventData.id,
      title: eventData.title,
      startDateTime: new Date(eventData.startDateTime),
      endDateTime: new Date(eventData.endDateTime),
      qrCode: eventData.qrCode,
      participants: eventData.participants || [],
      lastUpdated: new Date()
    };

    await this.db.put('events', cachedEvent);
  }

  /**
   * Obtenir les données d'un événement depuis le cache
   */
  async getCachedEventData(eventId: string): Promise<OfflineEventData | null> {
    if (!this.db) return null;

    try {
      const event = await this.db.get('events', eventId);
      return event || null;
    } catch (error) {
      console.error('Error getting cached event data:', error);
      return null;
    }
  }

  /**
   * Mettre en cache un QR code
   */
  async cacheQRCode(eventId: string, qrCodeData: string, expiresAt?: Date): Promise<void> {
    if (!this.db) return;

    await this.db.put('qrCodes', {
      eventId,
      qrCodeData,
      expiresAt,
      cachedAt: new Date()
    });
  }

  /**
   * Valider un QR code hors ligne
   */
  async validateQRCodeOffline(qrCodeData: string): Promise<{
    isValid: boolean;
    eventId?: string;
    reason?: string;
  }> {
    if (!this.db) {
      return { isValid: false, reason: 'Offline database not available' };
    }

    try {
      // Rechercher le QR code dans le cache
      const tx = this.db.transaction('qrCodes', 'readonly');
      const store = tx.objectStore('qrCodes');
      const allQRCodes = await store.getAll();

      for (const qrCode of allQRCodes) {
        if (qrCode.qrCodeData === qrCodeData) {
          // Vérifier l'expiration
          if (qrCode.expiresAt && new Date() > new Date(qrCode.expiresAt)) {
            return { isValid: false, reason: 'QR code has expired' };
          }

          return { isValid: true, eventId: qrCode.eventId };
        }
      }

      return { isValid: false, reason: 'QR code not found in offline cache' };
    } catch (error) {
      console.error('Error validating QR code offline:', error);
      return { isValid: false, reason: 'Error validating QR code offline' };
    }
  }

  /**
   * Obtenir les présences en attente de synchronisation
   */
  async getPendingAttendances(): Promise<OfflineAttendanceRecord[]> {
    if (!this.db) return [];

    try {
      const tx = this.db.transaction('attendances', 'readonly');
      const index = tx.store.index('synced');
      return await index.getAll(false);
    } catch (error) {
      console.error('Error getting pending attendances:', error);
      return [];
    }
  }

  /**
   * Synchroniser les présences en attente
   */
  async syncPendingAttendances(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.db) {
      return { synced: 0, failed: 0, errors: ['Database not initialized'] };
    }

    const pendingAttendances = await this.getPendingAttendances();
    if (pendingAttendances.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const attendance of pendingAttendances) {
      try {
        // Incrémenter le nombre de tentatives
        attendance.syncAttempts += 1;
        attendance.lastSyncAttempt = new Date();

        // Essayer de synchroniser avec le serveur
        const response = await fetch('/api/attendance/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            offlineId: attendance.id,
            eventId: attendance.eventId,
            userId: attendance.userId,
            method: attendance.method,
            timestamp: attendance.timestamp,
            qrCodeData: attendance.qrCodeData,
            location: attendance.location,
            deviceInfo: attendance.deviceInfo
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          // Marquer comme synchronisé
          attendance.synced = true;
          attendance.error = undefined;
          
          // Mettre à jour dans la base locale
          await this.db.put('attendances', attendance);
          
          syncedCount++;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Sync failed');
        }
      } catch (error: any) {
        failedCount++;
        attendance.error = error.message;
        errors.push(`${attendance.id}: ${error.message}`);
        
        // Sauvegarder l'erreur
        await this.db.put('attendances', attendance);
        
        // Arrêter les tentatives après 5 échecs
        if (attendance.syncAttempts >= 5) {
          console.warn(`Abandoning sync for attendance ${attendance.id} after 5 attempts`);
        }
      }
    }

    return { synced: syncedCount, failed: failedCount, errors };
  }

  /**
   * Détecter et résoudre les conflits de synchronisation
   */
  async resolveConflicts(): Promise<{
    resolved: number;
    conflicts: Array<{
      offlineRecord: OfflineAttendanceRecord;
      serverRecord: any;
      resolution: 'keep_offline' | 'keep_server' | 'merge' | 'manual';
    }>;
  }> {
    if (!this.db) {
      return { resolved: 0, conflicts: [] };
    }

    const pendingAttendances = await this.getPendingAttendances();
    const conflicts = [];
    let resolvedCount = 0;

    for (const attendance of pendingAttendances) {
      try {
        // Vérifier s'il existe déjà un enregistrement sur le serveur
        const response = await fetch(`/api/attendance/check-duplicate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: attendance.eventId,
            userId: attendance.userId,
            timestamp: attendance.timestamp
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.exists) {
            const serverRecord = result.record;
            const timeDiff = Math.abs(
              new Date(serverRecord.timestamp).getTime() - attendance.timestamp.getTime()
            );

            // Si les timestamps sont très proches (< 5 minutes), considérer comme doublon
            if (timeDiff < 5 * 60 * 1000) {
              // Marquer l'enregistrement local comme synchronisé (doublon)
              attendance.synced = true;
              attendance.error = 'Duplicate - already exists on server';
              await this.db.put('attendances', attendance);
              resolvedCount++;
            } else {
              // Conflit réel - nécessite une résolution manuelle
              conflicts.push({
                offlineRecord: attendance,
                serverRecord,
                resolution: 'manual'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking for conflicts:', error);
      }
    }

    return { resolved: resolvedCount, conflicts };
  }

  /**
   * Nettoyer les anciens enregistrements synchronisés
   */
  async cleanupSyncedRecords(olderThanDays: number = 7): Promise<number> {
    if (!this.db) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const tx = this.db.transaction('attendances', 'readwrite');
      const store = tx.objectStore('attendances');
      const syncedIndex = store.index('synced');
      
      const syncedRecords = await syncedIndex.getAll(true);
      let deletedCount = 0;

      for (const record of syncedRecords) {
        if (record.timestamp < cutoffDate) {
          await store.delete(record.id);
          deletedCount++;
        }
      }

      await tx.done;
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up synced records:', error);
      return 0;
    }
  }

  /**
   * Obtenir le statut de synchronisation
   */
  async getSyncStatus(): Promise<{
    totalRecords: number;
    syncedRecords: number;
    pendingRecords: number;
    failedRecords: number;
    lastSyncAttempt?: Date;
    isOnline: boolean;
  }> {
    if (!this.db) {
      return {
        totalRecords: 0,
        syncedRecords: 0,
        pendingRecords: 0,
        failedRecords: 0,
        isOnline: !this.isOffline()
      };
    }

    try {
      const allRecords = await this.db.getAll('attendances');
      const syncedRecords = allRecords.filter(r => r.synced);
      const pendingRecords = allRecords.filter(r => !r.synced && !r.error);
      const failedRecords = allRecords.filter(r => !r.synced && r.error);
      
      const lastSyncAttempt = allRecords
        .filter(r => r.lastSyncAttempt)
        .sort((a, b) => new Date(b.lastSyncAttempt!).getTime() - new Date(a.lastSyncAttempt!).getTime())[0]
        ?.lastSyncAttempt;

      return {
        totalRecords: allRecords.length,
        syncedRecords: syncedRecords.length,
        pendingRecords: pendingRecords.length,
        failedRecords: failedRecords.length,
        lastSyncAttempt,
        isOnline: !this.isOffline()
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        totalRecords: 0,
        syncedRecords: 0,
        pendingRecords: 0,
        failedRecords: 0,
        isOnline: !this.isOffline()
      };
    }
  }

  /**
   * Forcer une synchronisation manuelle
   */
  async forceSyncAll(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    try {
      // Résoudre les conflits d'abord
      const conflictResolution = await this.resolveConflicts();
      
      // Puis synchroniser les enregistrements en attente
      const syncResult = await this.syncPendingAttendances();
      
      // Nettoyer les anciens enregistrements
      await this.cleanupSyncedRecords();

      return {
        success: syncResult.failed === 0,
        synced: syncResult.synced + conflictResolution.resolved,
        failed: syncResult.failed,
        errors: syncResult.errors
      };
    } catch (error: any) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Démarrer la synchronisation automatique
   */
  private startAutoSync(): void {
    // Synchroniser toutes les 30 secondes si en ligne
    this.syncInterval = setInterval(async () => {
      if (!this.isOffline()) {
        try {
          await this.syncPendingAttendances();
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    }, 30000);

    // Écouter les changements de statut réseau
    window.addEventListener('online', () => {
      console.log('Network back online, starting sync...');
      this.syncPendingAttendances();
    });

    window.addEventListener('offline', () => {
      console.log('Network offline, sync paused');
    });
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Nettoyer et fermer la base de données
   */
  async cleanup(): Promise<void> {
    this.stopAutoSync();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
  }> {
    if (!this.db) {
      return { synced: 0, failed: 0, errors: ['Database not initialized'] };
    }

    const pendingAttendances = await this.getPendingAttendances();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const attendance of pendingAttendances) {
      try {
        // Essayer de synchroniser avec le serveur
        const response = await fetch('/api/attendance/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: attendance.eventId,
            userId: attendance.userId,
            method: attendance.method,
            timestamp: attendance.timestamp,
            qrCodeData: attendance.qrCodeData,
            location: attendance.location,
            deviceInfo: attendance.deviceInfo
          })
        });

        if (response.ok) {
          // Marquer comme synchronisé
          await this.db.put('attendances', {
            ...attendance,
            synced: true,
            lastSyncAttempt: new Date()
          });
          synced++;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error: any) {
        // Incrémenter le nombre de tentatives
        await this.db.put('attendances', {
          ...attendance,
          syncAttempts: attendance.syncAttempts + 1,
          lastSyncAttempt: new Date(),
          error: error.message
        });
        failed++;
        errors.push(`${attendance.id}: ${error.message}`);
      }
    }

    return { synced, failed, errors };
  }

  /**
   * Démarrer la synchronisation automatique
   */
  private startAutoSync(): void {
    // Synchroniser toutes les 30 secondes si en ligne
    this.syncInterval = setInterval(async () => {
      if (!this.isOffline()) {
        await this.syncPendingAttendances();
      }
    }, 30000);

    // Écouter les changements de statut réseau
    window.addEventListener('online', () => {
      console.log('Network back online, syncing pending attendances...');
      this.syncPendingAttendances();
    });

    window.addEventListener('offline', () => {
      console.log('Network offline, switching to offline mode...');
    });
  }

  /**
   * Arrêter la synchronisation automatique
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Nettoyer les données synchronisées anciennes
   */
  async cleanupSyncedData(olderThanDays: number = 7): Promise<void> {
    if (!this.db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const tx = this.db.transaction('attendances', 'readwrite');
      const store = tx.objectStore('attendances');
      const index = store.index('synced');
      
      const syncedRecords = await index.getAll(true);
      
      for (const record of syncedRecords) {
        if (record.timestamp < cutoffDate) {
          await store.delete(record.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up synced data:', error);
    }
  }

  /**
   * Obtenir les statistiques hors ligne
   */
  async getOfflineStats(): Promise<{
    totalPending: number;
    totalSynced: number;
    oldestPending?: Date;
    lastSyncAttempt?: Date;
    failedAttempts: number;
  }> {
    if (!this.db) {
      return {
        totalPending: 0,
        totalSynced: 0,
        failedAttempts: 0
      };
    }

    try {
      const tx = this.db.transaction('attendances', 'readonly');
      const store = tx.objectStore('attendances');
      
      const allRecords = await store.getAll();
      const pending = allRecords.filter(r => !r.synced);
      const synced = allRecords.filter(r => r.synced);
      const failed = allRecords.filter(r => r.syncAttempts > 0 && !r.synced);

      const oldestPending = pending.length > 0 
        ? new Date(Math.min(...pending.map(r => r.timestamp.getTime())))
        : undefined;

      const lastSyncAttempt = allRecords.length > 0
        ? new Date(Math.max(...allRecords
            .filter(r => r.lastSyncAttempt)
            .map(r => r.lastSyncAttempt!.getTime())))
        : undefined;

      return {
        totalPending: pending.length,
        totalSynced: synced.length,
        oldestPending,
        lastSyncAttempt,
        failedAttempts: failed.length
      };
    } catch (error) {
      console.error('Error getting offline stats:', error);
      return {
        totalPending: 0,
        totalSynced: 0,
        failedAttempts: 0
      };
    }
  }
}

export const offlineSyncService = new OfflineSyncService();}


export const offlineSyncService = new OfflineSyncService();