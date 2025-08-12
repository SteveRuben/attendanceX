// src/utils/appointmentRecovery.ts
import { AppointmentErrorHandler } from './appointmentValidation';

interface RecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Data recovery and consistency manager for appointments
 */
export class AppointmentRecoveryManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      backoffMultiplier = 2,
      onRetry,
      onMaxRetriesReached
    } = options;

    let lastError: Error;
    let delay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          if (onMaxRetriesReached) {
            onMaxRetriesReached(lastError);
          }
          throw lastError;
        }

        // Check if error is retryable
        if (!AppointmentErrorHandler.isRetryableError(lastError)) {
          throw lastError;
        }

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        // Wait before retry with exponential backoff
        await this.delay(delay);
        delay *= backoffMultiplier;
      }
    }

    throw lastError!;
  }

  /**
   * Get data with caching and fallback
   */
  async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    try {
      // Fetch fresh data
      const data = await this.withRetry(fetcher);
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });

      return data;
    } catch (error) {
      // If we have stale cached data, return it as fallback
      if (cached) {
        console.warn('Using stale cached data due to fetch error:', error);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Recover appointment data from multiple sources
   */
  async recoverAppointmentData(appointmentId: string): Promise<any> {
    const sources = [
      // Primary source: API
      () => this.fetchFromAPI(appointmentId),
      // Fallback 1: Local storage
      () => this.fetchFromLocalStorage(appointmentId),
      // Fallback 2: Session storage
      () => this.fetchFromSessionStorage(appointmentId),
      // Fallback 3: IndexedDB
      () => this.fetchFromIndexedDB(appointmentId)
    ];

    for (const source of sources) {
      try {
        const data = await source();
        if (data) {
          return data;
        }
      } catch (error) {
        console.warn('Failed to recover from source:', error);
        continue;
      }
    }

    throw new Error(`Unable to recover appointment data for ID: ${appointmentId}`);
  }

  /**
   * Sync data consistency across different storage mechanisms
   */
  async syncDataConsistency(appointmentId: string, data: any): Promise<void> {
    const syncOperations = [
      () => this.saveToLocalStorage(appointmentId, data),
      () => this.saveToSessionStorage(appointmentId, data),
      () => this.saveToIndexedDB(appointmentId, data)
    ];

    // Execute all sync operations, but don't fail if some fail
    const results = await Promise.allSettled(syncOperations.map(op => op()));
    
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.warn('Some sync operations failed:', failures);
    }
  }

  /**
   * Detect and resolve data conflicts
   */
  async resolveDataConflicts(localData: any, serverData: any): Promise<any> {
    // Simple conflict resolution strategy: server wins for most fields,
    // but preserve local changes for specific fields
    const preserveLocalFields = ['notes', 'clientNotes', 'internalNotes'];
    
    const resolved = { ...serverData };

    // Preserve local changes for specific fields if they're newer
    preserveLocalFields.forEach(field => {
      if (localData[field] && 
          localData.lastModified > serverData.lastModified) {
        resolved[field] = localData[field];
        resolved.hasLocalChanges = true;
      }
    });

    // Mark conflicts that need manual resolution
    const conflicts = [];
    if (localData.status !== serverData.status) {
      conflicts.push({
        field: 'status',
        local: localData.status,
        server: serverData.status
      });
    }

    if (conflicts.length > 0) {
      resolved.conflicts = conflicts;
    }

    return resolved;
  }

  /**
   * Backup critical appointment data
   */
  async backupAppointmentData(appointments: any[]): Promise<void> {
    try {
      const backup = {
        timestamp: Date.now(),
        data: appointments,
        version: '1.0'
      };

      // Save to multiple locations
      await Promise.all([
        this.saveToLocalStorage('appointment_backup', backup),
        this.saveToIndexedDB('appointment_backup', backup)
      ]);

      console.log('Appointment data backed up successfully');
    } catch (error) {
      console.error('Failed to backup appointment data:', error);
    }
  }

  /**
   * Restore appointment data from backup
   */
  async restoreAppointmentData(): Promise<any[] | null> {
    try {
      // Try to restore from IndexedDB first, then localStorage
      let backup = await this.fetchFromIndexedDB('appointment_backup');
      if (!backup) {
        backup = this.fetchFromLocalStorage('appointment_backup');
      }

      if (backup && backup.data) {
        console.log('Appointment data restored from backup');
        return backup.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to restore appointment data:', error);
      return null;
    }
  }

  // Private helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchFromAPI(appointmentId: string): Promise<any> {
    // TODO: Implement actual API call
    const response = await fetch(`/api/appointments/${appointmentId}`);
    if (!response.ok) {
      throw new Error(`API fetch failed: ${response.status}`);
    }
    return response.json();
  }

  private fetchFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(`appointment_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to fetch from localStorage:', error);
      return null;
    }
  }

  private fetchFromSessionStorage(key: string): any {
    try {
      const data = sessionStorage.getItem(`appointment_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to fetch from sessionStorage:', error);
      return null;
    }
  }

  private async fetchFromIndexedDB(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AppointmentDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['appointments'], 'readonly');
        const store = transaction.objectStore('appointments');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result?.data || null);
        getRequest.onerror = () => reject(getRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('appointments')) {
          db.createObjectStore('appointments', { keyPath: 'id' });
        }
      };
    });
  }

  private async saveToLocalStorage(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(`appointment_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      throw error;
    }
  }

  private async saveToSessionStorage(key: string, data: any): Promise<void> {
    try {
      sessionStorage.setItem(`appointment_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error);
      throw error;
    }
  }

  private async saveToIndexedDB(key: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AppointmentDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['appointments'], 'readwrite');
        const store = transaction.objectStore('appointments');
        const putRequest = store.put({ id: key, data, timestamp: Date.now() });
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('appointments')) {
          db.createObjectStore('appointments', { keyPath: 'id' });
        }
      };
    });
  }
}

// Singleton instance
export const appointmentRecoveryManager = new AppointmentRecoveryManager();

/**
 * React hook for data recovery operations
 */
export const useAppointmentRecovery = () => {
  const recovery = appointmentRecoveryManager;

  const recoverData = async (appointmentId: string) => {
    try {
      return await recovery.recoverAppointmentData(appointmentId);
    } catch (error) {
      console.error('Data recovery failed:', error);
      throw error;
    }
  };

  const syncData = async (appointmentId: string, data: any) => {
    try {
      await recovery.syncDataConsistency(appointmentId, data);
    } catch (error) {
      console.error('Data sync failed:', error);
    }
  };

  const backupData = async (appointments: any[]) => {
    try {
      await recovery.backupAppointmentData(appointments);
    } catch (error) {
      console.error('Data backup failed:', error);
    }
  };

  const restoreData = async () => {
    try {
      return await recovery.restoreAppointmentData();
    } catch (error) {
      console.error('Data restore failed:', error);
      return null;
    }
  };

  return {
    recoverData,
    syncData,
    backupData,
    restoreData,
    clearCache: () => recovery.clearCache(),
    invalidateCache: (key: string) => recovery.invalidateCache(key)
  };
};