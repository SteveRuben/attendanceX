import { Redis } from "@upstash/redis";

/**
 * RedisCache
 * -----------
 * Wrapper simple autour de Redis (Upstash) pour gérer un cache typé
 * avec TTL, suppression et invalidation par préfixe.
 */
export class RedisCache {
  private redis: Redis;

  /**
   * Crée une nouvelle instance de RedisCache.
   *
   * Initialise le client Redis à partir des variables d'environnement :
   * - REDIS_URL
   * - REDIS_TOKEN
   *
   * @throws Erreur si les variables d'environnement sont manquantes.
   */
  constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  }

  /**
   * Récupère une valeur depuis Redis.
   *
   * @typeParam T - Type attendu de la valeur stockée
   * @param key - Clé Redis
   * @returns La valeur typée ou `null` si la clé n'existe pas
   *
   * @example
   * ```ts
   * const user = await cache.get<User>("user:42");
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? (data as T) : null;
  }

  /**
   * Stocke une valeur dans Redis avec une durée de vie (TTL).
   *
   * @typeParam T - Type de la valeur à stocker
   * @param key - Clé Redis
   * @param value - Valeur à stocker
   * @param ttlSeconds - Durée de vie en secondes (par défaut : 60)
   *
   * @example
   * ```ts
   * await cache.set("user:42", user, 300);
   * ```
   */
  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }

  /**
   * Supprime une clé spécifique de Redis.
   *
   * @param key - Clé Redis à supprimer
   *
   * @example
   * ```ts
   * await cache.del("user:42");
   * ```
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Supprime toutes les clés Redis correspondant à un préfixe donné.
   *
   * ⚠️ Attention :
   * - Cette méthode utilise `KEYS`
   * - Peut être coûteuse si le nombre de clés est élevé
   *
   * @param prefix - Préfixe des clés à supprimer
   *
   * @example
   * ```ts
   * await cache.clearPrefix("user:");
   * ```
   */
  async clearPrefix(prefix: string): Promise<void> {
    const keys = await this.redis.keys(`${prefix}*`);
    for (const k of keys) {
      await this.redis.del(k);
    }
  }
}
