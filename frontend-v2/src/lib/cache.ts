/**
 * Système de Cache Côté Client
 * 
 * Permet de cacher des données en mémoire côté navigateur
 * pour réduire les appels API et améliorer les performances.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  size: number;
}

class ClientCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    size: 0,
  };

  /**
   * Stocker une valeur dans le cache
   * @param key Clé unique
   * @param data Données à cacher
   * @param expiresIn Durée de vie en millisecondes (défaut: 5 minutes)
   */
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 Cache SET:', key, `(TTL: ${expiresIn}ms)`);
    }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ Cache MISS:', key);
      }
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.expiresIn;
    
    if (isExpired) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Cache EXPIRED:', key, `(age: ${age}ms)`);
      }
      
      return null;
    }

    this.stats.hits++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Cache HIT:', key, `(age: ${age}ms)`);
    }
    
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
    if (age > entry.expiresIn) {
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
      this.stats.size = this.cache.size;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Cache DELETE:', key);
      }
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Cache CLEAR:', `${previousSize} entries removed`);
    }
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
      if (age > entry.expiresIn) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Cache CLEANUP:', `${cleaned} entries removed`);
      }
    }
    
    return cleaned;
  }

  /**
   * Obtenir les statistiques du cache
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total === 0 ? 0 : (this.stats.hits / total) * 100;
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate,
    };
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
   * @param expiresIn Durée de vie en millisecondes
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    expiresIn: number = 5 * 60 * 1000
  ): Promise<T> {
    // Vérifier le cache d'abord
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Générer la valeur
    const value = await factory();
    
    // Mettre en cache
    this.set(key, value, expiresIn);
    
    return value;
  }

  /**
   * Invalider le cache par pattern
   * @param pattern Pattern de clé (ex: 'user-*')
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let invalidated = 0;
    
    // Utiliser Array.from() pour éviter le problème d'itération
    Array.from(this.cache.keys()).forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    });
    
    if (invalidated > 0) {
      this.stats.size = this.cache.size;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🗑️ Cache INVALIDATE PATTERN:', pattern, `(${invalidated} entries)`);
      }
    }
    
    return invalidated;
  }
}

// Instance singleton du cache
export const clientCache = new ClientCache();

// Nettoyer le cache toutes les 5 minutes (côté client)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const cleaned = clientCache.cleanup();
    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log('🧹 Automatic cache cleanup:', cleaned, 'entries removed');
    }
  }, 5 * 60 * 1000);
}

// Logger les stats du cache toutes les 30 minutes (en dev)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = clientCache.getStats();
    console.log('📊 Cache statistics:', stats);
  }, 30 * 60 * 1000);
}

// Exposer le cache dans window pour le debugging (dev uniquement)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__cache = clientCache;
  console.log('💡 Cache available in console: window.__cache');
}
