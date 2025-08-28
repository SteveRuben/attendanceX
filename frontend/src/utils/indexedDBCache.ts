// src/utils/indexedDBCache.ts
interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  version: string;
}

interface IndexedDBCacheOptions {
  dbName: string;
  version: number;
  storeName: string;
  defaultTTL: number;
}

export class IndexedDBCache {
  private dbName: string;
  private version: number;
  private storeName: string;
  private defaultTTL: number;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(options: IndexedDBCacheOptions) {
    this.dbName = options.dbName;
    this.version = options.version;
    this.storeName = options.storeName;
    this.defaultTTL = options.defaultTTL;
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async set(key: string, data: any, ttl?: number): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      version: '1.0'
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to set cache entry: ${request.error}`));
    });
  }

  async get(key: string): Promise<any | null> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // Check if entry has expired
        const isExpired = Date.now() - entry.timestamp > entry.ttl;
        if (isExpired) {
          // Remove expired entry
          this.delete(key);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };

      request.onerror = () => reject(new Error(`Failed to get cache entry: ${request.error}`));
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete cache entry: ${request.error}`));
    });
  }

  async clear(): Promise<void> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear cache: ${request.error}`));
    });
  }

  async getAllKeys(): Promise<string[]> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error(`Failed to get all keys: ${request.error}`));
    });
  }

  async cleanupExpired(): Promise<number> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          const isExpired = Date.now() - entry.timestamp > entry.ttl;
          
          if (isExpired) {
            cursor.delete();
            deletedCount++;
          }
          
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(new Error(`Failed to cleanup expired entries: ${request.error}`));
    });
  }

  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    totalSize: number;
  }> {
    await this.init();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();
      
      let totalEntries = 0;
      let expiredEntries = 0;
      let totalSize = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          totalEntries++;
          
          const isExpired = Date.now() - entry.timestamp > entry.ttl;
          if (isExpired) {
            expiredEntries++;
          }
          
          // Estimate size (rough calculation)
          totalSize += JSON.stringify(entry).length;
          
          cursor.continue();
        } else {
          resolve({
            totalEntries,
            expiredEntries,
            totalSize
          });
        }
      };

      request.onerror = () => reject(new Error(`Failed to get stats: ${request.error}`));
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Specialized cache for appointments
export class AppointmentIndexedDBCache extends IndexedDBCache {
  constructor() {
    super({
      dbName: 'AppointmentCache',
      version: 1,
      storeName: 'appointments',
      defaultTTL: 5 * 60 * 1000 // 5 minutes
    });
  }

  async cacheAppointments(appointments: any[], filters?: any): Promise<void> {
    const key = `appointments-${JSON.stringify(filters || {})}`;
    await this.set(key, appointments);
  }

  async getCachedAppointments(filters?: any): Promise<any[] | null> {
    const key = `appointments-${JSON.stringify(filters || {})}`;
    return this.get(key);
  }

  async cacheAppointmentDetails(appointmentId: string, details: any): Promise<void> {
    const key = `appointment-${appointmentId}`;
    await this.set(key, details, 10 * 60 * 1000); // 10 minutes for details
  }

  async getCachedAppointmentDetails(appointmentId: string): Promise<any | null> {
    const key = `appointment-${appointmentId}`;
    return this.get(key);
  }

  async cacheAvailableSlots(
    practitionerId: string, 
    date: string, 
    serviceId: string, 
    slots: any[]
  ): Promise<void> {
    const key = `slots-${practitionerId}-${date}-${serviceId}`;
    await this.set(key, slots, 1 * 60 * 1000); // 1 minute for time-sensitive data
  }

  async getCachedAvailableSlots(
    practitionerId: string, 
    date: string, 
    serviceId: string
  ): Promise<any[] | null> {
    const key = `slots-${practitionerId}-${date}-${serviceId}`;
    return this.get(key);
  }

  async invalidateAppointmentCache(): Promise<void> {
    const keys = await this.getAllKeys();
    const appointmentKeys = keys.filter(key => key.startsWith('appointments-'));
    
    await Promise.all(appointmentKeys.map(key => this.delete(key)));
  }

  async invalidateSlotCache(practitionerId?: string, date?: string): Promise<void> {
    const keys = await this.getAllKeys();
    let slotsKeys = keys.filter(key => key.startsWith('slots-'));
    
    if (practitionerId) {
      slotsKeys = slotsKeys.filter(key => key.includes(`-${practitionerId}-`));
    }
    
    if (date) {
      slotsKeys = slotsKeys.filter(key => key.includes(`-${date}-`));
    }
    
    await Promise.all(slotsKeys.map(key => this.delete(key)));
  }
}

// Global instance
export const appointmentCache = new AppointmentIndexedDBCache();

// Cleanup expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(async () => {
    try {
      const deletedCount = await appointmentCache.cleanupExpired();
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup expired cache entries:', error);
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  // Close database connection when page unloads
  window.addEventListener('beforeunload', () => {
    appointmentCache.close();
  });
}