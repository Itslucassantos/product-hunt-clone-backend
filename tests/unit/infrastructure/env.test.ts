import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../src/infrastructure/config/env';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({});

    expect(env.PORT).toBe(3333);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.ADMIN_EXTERNAL_IDS).toEqual([]);
  });

  it('parses the admin id list', () => {
    expect(loadEnv({ ADMIN_EXTERNAL_IDS: 'a, b,,c' }).ADMIN_EXTERNAL_IDS).toEqual(['a', 'b', 'c']);
  });

  it('fails naming the invalid variable', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('defaults to the in-memory driver', () => {
    expect(loadEnv({}).REPOSITORY_DRIVER).toBe('memory');
  });

  it('requires DATABASE_URL for the prisma driver', () => {
    expect(() => loadEnv({ REPOSITORY_DRIVER: 'prisma' })).toThrow(/DATABASE_URL/);
    expect(
      loadEnv({ REPOSITORY_DRIVER: 'prisma', DATABASE_URL: 'postgresql://x' }).DATABASE_URL,
    ).toBe('postgresql://x');
  });

  it('requires the prisma driver, a Clerk secret and Redis in production', () => {
    const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://x' };

    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/REPOSITORY_DRIVER/);
    expect(() => loadEnv({ ...base, REPOSITORY_DRIVER: 'prisma' })).toThrow(/CLERK_SECRET_KEY/);
    expect(() =>
      loadEnv({ ...base, REPOSITORY_DRIVER: 'prisma', CLERK_SECRET_KEY: 'sk_live_x' }),
    ).toThrow(/REDIS_URL/);
    expect(
      loadEnv({
        ...base,
        REPOSITORY_DRIVER: 'prisma',
        CLERK_SECRET_KEY: 'sk_live_x',
        REDIS_URL: 'redis://localhost:6379',
      }).CACHE_DRIVER,
    ).toBe('redis');
  });

  it('resolves the cache and rate limit drivers from the environment', () => {
    expect(loadEnv({ NODE_ENV: 'test' })).toMatchObject({
      CACHE_DRIVER: 'none',
      RATE_LIMIT_DRIVER: 'memory',
    });
    expect(loadEnv({})).toMatchObject({ CACHE_DRIVER: 'memory', RATE_LIMIT_DRIVER: 'memory' });
    expect(loadEnv({ CACHE_DRIVER: 'none', RATE_LIMIT_DRIVER: 'none' })).toMatchObject({
      CACHE_DRIVER: 'none',
      RATE_LIMIT_DRIVER: 'none',
    });
  });

  it('requires REDIS_URL when a redis driver is chosen', () => {
    expect(() => loadEnv({ CACHE_DRIVER: 'redis' })).toThrow(/REDIS_URL/);
    expect(() => loadEnv({ RATE_LIMIT_DRIVER: 'redis' })).toThrow(/REDIS_URL/);
    expect(loadEnv({ CACHE_DRIVER: 'redis', REDIS_URL: 'redis://x' }).RATE_LIMIT_DRIVER).toBe(
      'redis',
    );
  });

  it('applies the cache TTL defaults and accepts overrides', () => {
    expect(loadEnv({})).toMatchObject({
      CACHE_TTL_PRODUCT_LIST: 15,
      CACHE_TTL_PRODUCT_DETAIL: 30,
      CACHE_TTL_TOPICS: 60,
    });
    expect(loadEnv({ CACHE_TTL_TOPICS: '120' }).CACHE_TTL_TOPICS).toBe(120);
  });

  it('parses the Clerk authorized parties list', () => {
    expect(
      loadEnv({ CLERK_AUTHORIZED_PARTIES: 'http://a.com, http://b.com' }).CLERK_AUTHORIZED_PARTIES,
    ).toEqual(['http://a.com', 'http://b.com']);
  });
});
