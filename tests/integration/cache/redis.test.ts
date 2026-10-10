import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  RedisCacheStore,
  jitteredTtl,
} from '../../../src/infrastructure/adapters/out/cache/redis-cache-store';
import { InMemoryRateLimiter } from '../../../src/infrastructure/adapters/out/rate-limit/in-memory-rate-limiter';
import { RedisRateLimiter } from '../../../src/infrastructure/adapters/out/rate-limit/redis-rate-limiter';
import { createLogger } from '../../../src/infrastructure/logging/logger';

const logger = createLogger('silent');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Redis adapters', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let cache: RedisCacheStore;

  const connect = () =>
    new Redis(container.getConnectionUrl(), {
      commandTimeout: 100,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    redis = connect();
    redis.on('error', () => {});
    await new Promise<void>((resolve) => redis.once('ready', resolve));
    cache = new RedisCacheStore(redis, logger, { failureThreshold: 2, cooldownMs: 300 });
  }, 120_000);

  afterAll(async () => {
    redis.disconnect();
    await container.stop().catch(() => {});
  });

  describe('RedisCacheStore', () => {
    it('stores, reads and deletes JSON values', async () => {
      await cache.set('k:object', { a: 1, list: ['x'] }, 30);

      expect(await cache.get('k:object')).toEqual({ a: 1, list: ['x'] });
      await cache.del('k:object', 'k:missing');
      expect(await cache.get('k:object')).toBeNull();
      expect(await cache.get('k:never')).toBeNull();
    });

    it('expires values after the ttl', async () => {
      await cache.set('k:ttl', 'v', 1);

      expect(await cache.get('k:ttl')).toBe('v');
      await sleep(1300);
      expect(await cache.get('k:ttl')).toBeNull();
    });

    it('starts versions at 1 and increments on every bump', async () => {
      expect(await cache.version('ns-a')).toBe(1);
      await cache.bumpVersion('ns-a');
      expect(await cache.version('ns-a')).toBe(2);
      await cache.bumpVersion('ns-a');
      expect(await cache.version('ns-a')).toBe(3);
      expect(await cache.version('ns-b')).toBe(1);
    });

    it('shares versions between instances', async () => {
      const other = new RedisCacheStore(redis, logger);
      await cache.bumpVersion('ns-shared');

      expect(await other.version('ns-shared')).toBe(2);
    });

    it('lets only one caller load a missing key', async () => {
      let loads = 0;
      const loader = async () => {
        loads += 1;
        await sleep(60);
        return { value: 42 };
      };

      const results = await Promise.all(
        Array.from({ length: 8 }, () => cache.getOrLoad('k:single-flight', 30, loader)),
      );

      expect(loads).toBe(1);
      expect(results.every((item) => item.value === 42)).toBe(true);
    });

    it('releases the lock when the loader fails', async () => {
      await expect(
        cache.getOrLoad('k:failing', 30, async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(await cache.getOrLoad('k:failing', 30, async () => 'ok')).toBe('ok');
    });
  });

  describe('RedisRateLimiter', () => {
    it('counts hits in a shared window', async () => {
      const limiter = new RedisRateLimiter(redis, new InMemoryRateLimiter(), logger);

      const results = [];
      for (let i = 0; i < 3; i += 1) results.push(await limiter.hit('rl:test', 2, 30));

      expect(results.map((item) => item.allowed)).toEqual([true, true, false]);
      expect(results[2]?.retryAfterSeconds).toBeGreaterThan(0);
      expect(results[2]?.retryAfterSeconds).toBeLessThanOrEqual(30);
    });

    it('opens a new window after the key expires', async () => {
      const limiter = new RedisRateLimiter(redis, new InMemoryRateLimiter(), logger);
      await limiter.hit('rl:expiring', 1, 1);
      expect((await limiter.hit('rl:expiring', 1, 1)).allowed).toBe(false);

      await sleep(1200);

      expect((await limiter.hit('rl:expiring', 1, 1)).allowed).toBe(true);
    });
  });

  describe('when redis is down', () => {
    it('degrades without errors and falls back to the in-memory limiter', async () => {
      const limiter = new RedisRateLimiter(redis, new InMemoryRateLimiter(), logger, {
        failureThreshold: 2,
        cooldownMs: 300,
      });
      await container.stop();

      const startedAt = Date.now();
      await cache.set('k:down', 'v', 30);
      expect(await cache.get('k:down')).toBeNull();
      expect(await cache.version('ns-down')).toBe(1);
      await cache.bumpVersion('ns-down');
      await cache.del('k:down');
      const loaded = await cache.getOrLoad('k:down', 30, async () => 'from-db');
      const first = await limiter.hit('rl:down', 1, 30);
      const second = await limiter.hit('rl:down', 1, 30);

      expect(loaded).toBe('from-db');
      expect([first.allowed, second.allowed]).toEqual([true, false]);
      expect(Date.now() - startedAt).toBeLessThan(3000);
    });
  });

  it('keeps the jittered ttl within 10% of the configured value', () => {
    for (let i = 0; i < 200; i += 1) {
      const ttl = jitteredTtl(100);
      expect(ttl).toBeGreaterThanOrEqual(90);
      expect(ttl).toBeLessThanOrEqual(110);
    }
    expect(jitteredTtl(1)).toBe(1);
  });
});
