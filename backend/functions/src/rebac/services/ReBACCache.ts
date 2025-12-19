import { RelationTuple } from "../types/RelationTuple.types";
import { RedisCache } from "./RedisCache";

export interface CacheEntityReference {
  type: string;
  id: string;
}

export interface CheckCacheContext {
  tenantId: string;
  subject: CacheEntityReference;
  permission: string;
  object: CacheEntityReference;
}

export interface ExpandCacheContext {
  tenantId: string;
  subject: CacheEntityReference;
  permission: string;
  objectType: string;
}

export interface CacheMetrics {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  hitRate: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheKeyMetadata {
  subjectKeys: string[];
  objectKeys: string[];
}

export interface ReBACCacheAdapter {
  getCheckResult(context: CheckCacheContext): Promise<boolean | null>;
  setCheckResult(context: CheckCacheContext, value: boolean): Promise<void>;
  getExpandResult(
    context: ExpandCacheContext
  ): Promise<CacheEntityReference[] | null>;
  setExpandResult(
    context: ExpandCacheContext,
    value: CacheEntityReference[]
  ): Promise<void>;
  invalidateForTuple(tuple: RelationTuple): Promise<void>;
  getMetrics(): CacheMetrics;
}

interface ReBACCacheOptions {
  checkTTLSeconds?: number;
  expandTTLSeconds?: number;
  enableRedis?: boolean;
}

/**
 * Cache ReBAC multi-niveaux (L1 mémoire + L2 Redis optionnel).
 * Permet d'accélérer les appels check() / expand() tout en conservant
 * une stratégie d'invalidation fine basée sur les tuples impactés.
 */
export class ReBACCache implements ReBACCacheAdapter {
  private readonly l1 = new Map<string, CacheEntry<any>>();
  private readonly subjectIndex = new Map<string, Set<string>>();
  private readonly objectIndex = new Map<string, Set<string>>();
  private readonly metadata = new Map<string, CacheKeyMetadata>();
  private readonly metrics = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
  };
  private readonly checkTTL: number;
  private readonly expandTTL: number;
  private readonly redisEnabled: boolean;
  private readonly redis?: RedisCache;

  /**
   * @param options Configuration TTL/activation Redis
   * @param redisCache Instance Redis injectée (tests) ou auto-créée
   */
  constructor(options: ReBACCacheOptions = {}, redisCache?: RedisCache) {
    this.checkTTL = options.checkTTLSeconds ?? 300;
    this.expandTTL = options.expandTTLSeconds ?? 300;
    const envRedis = process.env.REDIS_CACHE_ENABLED === "true";
    this.redisEnabled = options.enableRedis ?? envRedis;

    if (this.redisEnabled) {
      try {
        this.redis = redisCache ?? new RedisCache();
      } catch (error) {
        // Fallback to L1 only if Redis is not properly configured
        this.redisEnabled = false;
        console.warn("Redis cache disabled for ReBAC:", error);
      }
    }
  }

  /**
   * Récupère le résultat d'un check() depuis le cache.
   */
  async getCheckResult(context: CheckCacheContext): Promise<boolean | null> {
    const key = this.buildCheckKey(context);
    return this.getValue<boolean>(key);
  }

  /**
   * Stocke le résultat d'un check() et indexe le lien subject/object.
   */
  async setCheckResult(
    context: CheckCacheContext,
    value: boolean
  ): Promise<void> {
    const key = this.buildCheckKey(context);
    const subjectKey = this.subjectKey(context.tenantId, context.subject);
    const objectKey = this.objectKey(context.tenantId, context.object);

    await this.storeValue(key, value, this.checkTTL, {
      subjectKeys: [subjectKey],
      objectKeys: [objectKey],
    });
  }

  /**
   * Récupère un résultat d'expand() (liste d'entités).
   */
  async getExpandResult(
    context: ExpandCacheContext
  ): Promise<CacheEntityReference[] | null> {
    const key = this.buildExpandKey(context);
    return this.getValue<CacheEntityReference[]>(key);
  }

  /**
   * Stocke le résultat d'un expand() paginable.
   */
  async setExpandResult(
    context: ExpandCacheContext,
    value: CacheEntityReference[]
  ): Promise<void> {
    const key = this.buildExpandKey(context);
    const subjectKey = this.subjectKey(context.tenantId, context.subject);

    await this.storeValue(key, value, this.expandTTL, {
      subjectKeys: [subjectKey],
      objectKeys: [],
    });
  }

  /**
   * Invalide toutes les clés touchant un tuple précis.
   */
  async invalidateForTuple(tuple: RelationTuple): Promise<void> {
    if (!tuple.tenantId) {
      return;
    }

    if (tuple.subject?.type && tuple.subject.id) {
      const ref: CacheEntityReference = {
        type: tuple.subject.type,
        id: tuple.subject.id,
      };
      await this.invalidateBySubject(tuple.tenantId, ref);
    }

    if (tuple.object?.type && tuple.object.id) {
      await this.invalidateByObject(tuple.tenantId, tuple.object);
    }
  }

  /**
   * Invalidation ciblée sur toutes les clés rattachées à un subject donné.
   */
  async invalidateBySubject(
    tenantId: string,
    ref: CacheEntityReference
  ): Promise<void> {
    const key = this.subjectKey(tenantId, ref);
    await this.invalidateByIndex(this.subjectIndex, key);
  }

  /**
   * Invalidation ciblée sur toutes les clés rattachées à un object donné.
   */
  async invalidateByObject(
    tenantId: string,
    ref: CacheEntityReference
  ): Promise<void> {
    const key = this.objectKey(tenantId, ref);
    await this.invalidateByIndex(this.objectIndex, key);
  }

  /**
   * Retourne les métriques courantes de hit/miss multi-niveaux.
   */
  getMetrics(): CacheMetrics {
    const total =
      this.metrics.l1Hits +
      this.metrics.l1Misses +
      this.metrics.l2Hits +
      this.metrics.l2Misses;

    const usefulHits = this.metrics.l1Hits + this.metrics.l2Hits;
    const hitRate = total > 0 ? usefulHits / total : 0;

    return {
      ...this.metrics,
      hitRate,
    };
  }

  /**
   * Lit une valeur depuis L1 puis L2, tout en mettant à jour les stats.
   */
  private async getValue<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const entry = this.l1.get(key);
    if (entry && entry.expiresAt > now) {
      this.metrics.l1Hits++;
      return entry.value as T;
    }

    if (entry && entry.expiresAt <= now) {
      this.l1.delete(key);
      this.metadata.delete(key);
    }

    this.metrics.l1Misses++;

    if (this.redisEnabled && this.redis) {
      const value = await this.redis.get<T>(key);
      if (value !== null) {
        this.metrics.l2Hits++;
        this.l1.set(key, {
          value,
          expiresAt: now + this.defaultTTLForValue(value),
        });
        return value;
      }
      this.metrics.l2Misses++;
    }

    return null;
  }

  /**
   * Stocke une valeur dans L1 (+ L2 si activé) et maintient les index.
   */
  private async storeValue(
    key: string,
    value: any,
    ttlSeconds: number,
    metadata: CacheKeyMetadata
  ): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.l1.set(key, { value, expiresAt });
    this.metadata.set(key, metadata);

    metadata.subjectKeys.forEach((subKey) => {
      const keys = this.subjectIndex.get(subKey) ?? new Set<string>();
      keys.add(key);
      this.subjectIndex.set(subKey, keys);
    });

    metadata.objectKeys.forEach((objKey) => {
      const keys = this.objectIndex.get(objKey) ?? new Set<string>();
      keys.add(key);
      this.objectIndex.set(objKey, keys);
    });

    if (this.redisEnabled && this.redis) {
      await this.redis.set(key, value, ttlSeconds);
    }
  }

  /**
    * Parcourt l'index inversé et supprime toutes les clés associées.
    */
  private async invalidateByIndex(
    index: Map<string, Set<string>>,
    key: string
  ): Promise<void> {
    const keys = index.get(key);
    if (!keys || keys.size === 0) {
      return;
    }

    for (const cacheKey of keys) {
      await this.removeKey(cacheKey);
    }

    index.delete(key);
  }

  /**
   * Supprime une clé précise du cache (L1 + L2 + métadonnées).
   */
  private async removeKey(cacheKey: string): Promise<void> {
    this.l1.delete(cacheKey);
    if (this.redisEnabled && this.redis) {
      await this.redis.del(cacheKey);
    }
    const meta = this.metadata.get(cacheKey);
    if (!meta) {
      return;
    }

    meta.subjectKeys.forEach((subjectKey) => {
      const set = this.subjectIndex.get(subjectKey);
      set?.delete(cacheKey);
      if (set && set.size === 0) {
        this.subjectIndex.delete(subjectKey);
      }
    });

    meta.objectKeys.forEach((objectKey) => {
      const set = this.objectIndex.get(objectKey);
      set?.delete(cacheKey);
      if (set && set.size === 0) {
        this.objectIndex.delete(objectKey);
      }
    });

    this.metadata.delete(cacheKey);
  }

  /**
   * Construit la clé unique d'un résultat check().
   */
  private buildCheckKey(context: CheckCacheContext): string {
    return `rebac:check:${context.tenantId}:${context.subject.type}:${context.subject.id}:${context.permission}:${context.object.type}:${context.object.id}`;
  }

  /**
   * Construit la clé unique d'un résultat expand().
   */
  private buildExpandKey(context: ExpandCacheContext): string {
    return `rebac:expand:${context.tenantId}:${context.subject.type}:${context.subject.id}:${context.permission}:${context.objectType}`;
  }

  /**
   * Clé d'index pour retrouver les entrées liées à un subject donné.
   */
  private subjectKey(
    tenantId: string,
    subject: CacheEntityReference
  ): string {
    return `${tenantId}:${subject.type}:${subject.id}`;
  }

  /**
   * Clé d'index pour retrouver les entrées liées à un object donné.
   */
  private objectKey(tenantId: string, object: CacheEntityReference): string {
    return `${tenantId}:${object.type}:${object.id}`;
  }

  /**
   * Sélectionne un TTL par défaut (check vs expand) pour L1.
   */
  private defaultTTLForValue(value: any): number {
    if (Array.isArray(value)) {
      return this.expandTTL * 1000;
    }
    return this.checkTTL * 1000;
  }
}
