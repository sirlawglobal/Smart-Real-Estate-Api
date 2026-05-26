import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    // Use non-blocking SCAN instead of KEYS to avoid O(N) Redis pauses under load
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.redis.exists(key);
    return count > 0;
  }

  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  async addToBlacklist(token: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`blacklist:${token}`, ttlSeconds, '1');
  }

  async isBlacklisted(token: string): Promise<boolean> {
    return this.exists(`blacklist:${token}`);
  }

  async publish(channel: string, message: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }
}
