import { Redis } from "@upstash/redis";

export class RedisCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? (data as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds = 60) {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async clearPrefix(prefix: string) {
    const keys = await this.redis.keys(`${prefix}*`);
    for (const k of keys) await this.redis.del(k);
  }
}
