/**
 * Système de Cache en Mémoire pour Firebase Functions
 * 
 * Permet de cacher des données en mémoire pour réduire les appels
 * à Firestore et améliorer les performances.
 * 
 * Note: Le cache est perdu lors d'un cold start de la function.
 * Pour un cache persistant, utiliser Redis ou Firestore.
 */

import { logger } from 'firebase-functions';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
  };

  /**
   * Stocker une valeur dans le cache
   * @param key Clé unique
   * @param data Données à cacher
   * @param ttl Time to live en millisecondes (défaut: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key,
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    logger.info('📦 Cache SET', {
      key,
      ttl,
      size: this.stats.size,
    });
  }

  /**
   * Récupérer une valeur du cache
   * @param key Clé unique
   * @returns Données cachées ou null si expiré/inexistant
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      logger.debug('❌ Cache MISS', { key });
      return null;
    }

    const age = Date.now() - entry.timestamp;
    
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      
      logger.info('🗑️ Cache EXPIRED', {
        key,
        age,
        ttl: entry.ttl,
      });
      
      return null;
    }

    this.stats.hits++;
    
    logger.debug('✅ Cache HIT', {
      key,
      age,
      ttl: entry.ttl,
    });
    
    return entry.data as T;
  }

  /**
   * Vérifier si une clé existe et n'est pas expirée
   * @param key Clé unique
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Supprimer une entrée du cache
   * @param key Clé unique
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      
      logger.info('🗑️ Cache DELETE', {
        key,
        size: this.stats.size,
      });
    }
    
    return deleted;
  }

  /**
   * Vider tout le cache
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    
    logger.info('🧹 Cache CLEAR', {
      previousSize,
      clearedEntries: previousSize,
    });
  }

  /**
   * Nettoyer les entrées expirées
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    // Utiliser Array.from() pour éviter le problème d'itération
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.stats.deletes += cleaned;
      this.stats.size = this.cache.size;
      
      logger.info('🧹 Cache CLEANUP', {
        cleaned,
        remaining: this.stats.size,
      });
    }
    
    return cleaned;
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
    };
  }

  /**
   * Obtenir le taux de hit du cache
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return (this.stats.hits / total) * 100;
  }

  /**
   * Obtenir toutes les clés du cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Obtenir la taille du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Obtenir ou définir une valeur (pattern get-or-set)
   * @param key Clé unique
   * @param factory Fonction pour générer la valeur si absente
   * @param ttl Time to live en millisecondes
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // Vérifier le cache d'abord
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Générer la valeur
    const value = await factory();
    
    // Mettre en cache
    this.set(key, value, ttl);
    
    return value;
  }
}

// Instance singleton du cache
export const memoryCache = new MemoryCache();

// Nettoyer le cache toutes les 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = memoryCache.cleanup();
    if (cleaned > 0) {
      logger.info('🧹 Automatic cache cleanup', {
        cleaned,
        remaining: memoryCache.size(),
        hitRate: memoryCache.getHitRate().toFixed(2) + '%',
      });
    }
  }, 10 * 60 * 1000);
}

// Logger les stats du cache toutes les heures
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const stats = memoryCache.getStats();
    logger.info('📊 Cache statistics', {
      ...stats,
      hitRate: memoryCache.getHitRate().toFixed(2) + '%',
    });
  }, 60 * 60 * 1000);
}
