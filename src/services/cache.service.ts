import Redis from 'ioredis';
import { getEnv } from '../config/env';
import { getLogger } from '../logger';
import { CACHE_TTL, CACHE_KEYS } from '../core/constants';

const logger = getLogger();

class CacheService {
  private client: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    const env = getEnv();
    if (env.REDIS_URL) {
      try {
        this.client = new Redis(env.REDIS_URL, {
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        this.client.on('connect', () => {
          logger.info('Redis client connected');
          this.enabled = true;
        });

        this.client.on('error', (error: Error) => {
          logger.error({ error }, 'Redis client error');
          this.enabled = false;
        });

        this.client.on('close', () => {
          logger.warn('Redis client disconnected');
          this.enabled = false;
        });
      } catch (error) {
        logger.error({ error }, 'Failed to initialize Redis client');
        this.client = null;
        this.enabled = false;
      }
    } else {
      logger.info('Redis URL not configured, caching disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) return null;

    try {
      const data = await this.client!.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error({ error, key }, 'Failed to get from cache');
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const data = JSON.stringify(value);
      await this.client!.setex(key, ttl, data);
    } catch (error) {
      logger.error({ error, key }, 'Failed to set cache');
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await this.client!.del(key);
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete from cache');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Failed to delete pattern from cache');
    }
  }

  async flush(): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      await this.client!.flushdb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error({ error }, 'Failed to flush cache');
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  generateKey(prefix: string, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis client disconnected');
    }
  }
}

export const cacheService = new CacheService();
export { CACHE_KEYS, CACHE_TTL };
