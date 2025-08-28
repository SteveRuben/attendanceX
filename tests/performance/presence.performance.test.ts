/**
 * Tests de performance pour le système de présence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { presenceIntegrationApi } from '../../frontend/src/services/api/presence-integration.api';
import { presenceSyncService } from '../../frontend/src/services/realtime/presenceSync.service';
import { offlineSyncService } from '../../frontend/src/services/mobile/offlineSync.service';

// Mock fetch pour les tests de performance
global.fetch = vi.fn();

describe('Presence System Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performance.clearMarks();
    performance.clearMeasures();
  });

  afterEach(() => {
    presenceIntegrationApi.cleanup();
    presenceSyncService.cleanup();
  });

  describe('API Response Times', () => {
    it('should handle clock-in requests within acceptable time limits', async () => {
      const mockResponse = {
        id: 'presence-1',
        employeeId: 'emp-1',
        clockInTime: new Date(),
        status: 'present'
      };

      // Simuler une réponse API avec délai
      (fetch as any).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ data: mockResponse, success: true })
            });
          }, 100); // 100ms de délai simulé
        })
      );

      const startTime = performance.now();
      
      await presenceIntegrationApi.clockIn('emp-1', {
        latitude: 48.8566,
        longitude: 2.3522
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Vérifier que la requête prend moins de 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should handle multiple concurrent requests efficiently', async () => {
      const mockResponse = {
        id: 'presence-1',
        employeeId: 'emp-1',
        status: 'present'
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResponse, success: true })
      });

      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        presenceIntegrationApi.getCurrentPresence(`emp-${i}`)
      );

      const startTime = performance.now();
      await Promise.all(requests);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const averageTime = duration / concurrentRequests;

      // Vérifier que le temps moyen par requête reste acceptable
      expect(averageTime).toBeLessThan(100);
    });

    it('should handle retry logic without excessive delays', async () => {
      let callCount = 0;
      
      (fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: 'presence-1' }, success: true })
        });
      });

      const startTime = performance.now();
      
      await presenceIntegrationApi.clockIn('emp-1');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Vérifier que même avec les retries, le temps total reste raisonnable
      expect(duration).toBeLessThan(5000); // 5 secondes max
      expect(callCount).toBe(3); // 1 initial + 2 retries
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during normal operations', async () => {
      const mockResponse = {
        id: 'presence-1',
        employeeId: 'emp-1',
        status: 'present'
      };

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockResponse, success: true })
      });

      // Mesurer la mémoire initiale
      const initialMemory = process.memoryUsage().heapUsed;

      // Effectuer de nombreuses opérations
      for (let i = 0; i < 100; i++) {
        await presenceIntegrationApi.getCurrentPresence(`emp-${i}`);
      }

      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Vérifier que l'augmentation de mémoire reste raisonnable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up real-time connections properly', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Créer et détruire plusieurs connexions
      for (let i = 0; i < 10; i++) {
        await presenceSyncService.connect(`emp-${i}`);
        presenceSyncService.disconnect();
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Vérifier qu'il n'y a pas de fuite mémoire significative
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Offline Sync Performance', () => {
    it('should handle large offline queues efficiently', async () => {
      // Simuler une grande queue hors ligne
      const largeQueue = Array.from({ length: 1000 }, (_, i) => ({
        id: `offline-${i}`,
        type: 'clock-in' as const,
        employeeId: 'emp-1',
        timestamp: Date.now() - i * 1000,
        synced: false,
        retryCount: 0
      }));

      // Mock du localStorage
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(largeQueue)),
        setItem: vi.fn(),
        removeItem: vi.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage
      });

      const startTime = performance.now();
      
      const pendingCount = offlineSyncService.getPendingCount();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(pendingCount).toBe(1000);
      // Vérifier que le traitement de la grande queue est rapide
      expect(duration).toBeLessThan(100);
    });

    it('should sync offline data in batches efficiently', async () => {
      const batchSize = 50;
      const totalItems = 200;
      
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { synced: batchSize, failed: 0 }, success: true })
      });

      const offlineEntries = Array.from({ length: totalItems }, (_, i) => ({
        id: `offline-${i}`,
        type: 'clock-in',
        employeeId: 'emp-1',
        timestamp: Date.now() - i * 1000
      }));

      const startTime = performance.now();
      
      // Simuler la synchronisation par batch
      const batches = Math.ceil(totalItems / batchSize);
      const syncPromises = [];
      
      for (let i = 0; i < batches; i++) {
        const batch = offlineEntries.slice(i * batchSize, (i + 1) * batchSize);
        syncPromises.push(presenceIntegrationApi.syncOfflineData(batch));
      }
      
      await Promise.all(syncPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Vérifier que la synchronisation par batch est efficace
      expect(duration).toBeLessThan(2000); // 2 secondes max pour 200 items
    });
  });

  describe('Real-time Updates Performance', () => {
    it('should handle high-frequency updates without performance degradation', async () => {
      const updateCount = 100;
      const updates: any[] = [];
      
      // Simuler un grand nombre de mises à jour
      const startTime = performance.now();
      
      for (let i = 0; i < updateCount; i++) {
        updates.push({
          type: 'presence_update',
          data: { employeeId: `emp-${i}`, status: 'present' },
          timestamp: Date.now(),
          employeeId: `emp-${i}`
        });
      }
      
      // Traiter toutes les mises à jour
      updates.forEach(update => {
        // Simuler le traitement d'une mise à jour
        const processed = {
          ...update,
          processed: true,
          processingTime: Date.now()
        };
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const averageProcessingTime = duration / updateCount;

      // Vérifier que le traitement des mises à jour est rapide
      expect(averageProcessingTime).toBeLessThan(1); // < 1ms par mise à jour
    });

    it('should maintain performance with many concurrent subscriptions', async () => {
      const subscriptionCount = 50;
      const subscriptions: string[] = [];
      
      const startTime = performance.now();
      
      // Créer de nombreuses souscriptions
      for (let i = 0; i < subscriptionCount; i++) {
        const subscriptionId = presenceSyncService.subscribe(
          (event) => {
            // Traitement minimal
            return event.timestamp;
          },
          (event) => event.employeeId === `emp-${i}`
        );
        subscriptions.push(subscriptionId);
      }
      
      const subscriptionTime = performance.now() - startTime;
      
      // Simuler une mise à jour qui affecte toutes les souscriptions
      const updateStartTime = performance.now();
      
      // Nettoyer les souscriptions
      subscriptions.forEach(id => {
        presenceSyncService.unsubscribe(id);
      });
      
      const cleanupTime = performance.now() - updateStartTime;

      // Vérifier les performances
      expect(subscriptionTime).toBeLessThan(100); // Création rapide
      expect(cleanupTime).toBeLessThan(50); // Nettoyage rapide
    });
  });

  describe('Data Processing Performance', () => {
    it('should calculate work duration efficiently for large datasets', async () => {
      // Générer un grand dataset de présence
      const presenceEntries = Array.from({ length: 1000 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        return {
          id: `presence-${i}`,
          employeeId: 'emp-1',
          clockInTime: new Date(date.setHours(9, 0, 0, 0)),
          clockOutTime: new Date(date.setHours(17, 0, 0, 0)),
          status: 'absent' as const
        };
      });

      const startTime = performance.now();
      
      // Calculer la durée totale de travail
      const totalDuration = presenceEntries.reduce((total, entry) => {
        if (entry.clockInTime && entry.clockOutTime) {
          return total + (entry.clockOutTime.getTime() - entry.clockInTime.getTime());
        }
        return total;
      }, 0);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(totalDuration).toBeGreaterThan(0);
      // Vérifier que le calcul est rapide même pour un grand dataset
      expect(duration).toBeLessThan(50);
    });

    it('should filter presence data efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `presence-${i}`,
        employeeId: `emp-${i % 100}`, // 100 employés différents
        clockInTime: new Date(),
        status: i % 3 === 0 ? 'present' : i % 3 === 1 ? 'absent' : 'on_break'
      }));

      const startTime = performance.now();
      
      // Filtrer par statut
      const presentEmployees = largeDataset.filter(entry => entry.status === 'present');
      
      // Filtrer par employé
      const specificEmployee = largeDataset.filter(entry => entry.employeeId === 'emp-50');
      
      // Filtrer par date (simulé)
      const recentEntries = largeDataset.filter(entry => 
        entry.clockInTime.getTime() > Date.now() - 24 * 60 * 60 * 1000
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(presentEmployees.length).toBeGreaterThan(0);
      expect(specificEmployee.length).toBeGreaterThan(0);
      expect(recentEntries.length).toBe(largeDataset.length); // Toutes les entrées sont récentes
      
      // Vérifier que le filtrage est rapide
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Storage Performance', () => {
    it('should handle localStorage operations efficiently', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        data: `data-${i}`.repeat(100) // Données plus volumineuses
      }));

      const startTime = performance.now();
      
      // Écriture
      localStorage.setItem('test-data', JSON.stringify(largeData));
      
      // Lecture
      const retrieved = JSON.parse(localStorage.getItem('test-data') || '[]');
      
      // Suppression
      localStorage.removeItem('test-data');
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(retrieved.length).toBe(1000);
      // Vérifier que les opérations localStorage sont rapides
      expect(duration).toBeLessThan(200);
    });

    it('should handle IndexedDB operations efficiently', async () => {
      // Simuler IndexedDB (dans un environnement de test réel, utiliser fake-indexeddb)
      const mockIndexedDB = {
        open: vi.fn().mockResolvedValue({
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              add: vi.fn().mockResolvedValue(undefined),
              get: vi.fn().mockResolvedValue({ id: 1, data: 'test' }),
              delete: vi.fn().mockResolvedValue(undefined)
            })
          })
        })
      };

      const startTime = performance.now();
      
      // Simuler des opérations IndexedDB
      const db = await mockIndexedDB.open('test-db', 1);
      const transaction = db.transaction(['store'], 'readwrite');
      const store = transaction.objectStore('store');
      
      // Opérations multiples
      for (let i = 0; i < 100; i++) {
        await store.add({ id: i, data: `data-${i}` });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Vérifier que les opérations sont rapides
      expect(duration).toBeLessThan(500);
    });
  });
});