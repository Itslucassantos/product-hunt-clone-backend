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

  it('requires the prisma driver and a Clerk secret in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/REPOSITORY_DRIVER/);
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        REPOSITORY_DRIVER: 'prisma',
        DATABASE_URL: 'postgresql://x',
      }),
    ).toThrow(/CLERK_SECRET_KEY/);
    expect(
      loadEnv({
        NODE_ENV: 'production',
        REPOSITORY_DRIVER: 'prisma',
        DATABASE_URL: 'postgresql://x',
        CLERK_SECRET_KEY: 'sk_live_x',
      }).CLERK_SECRET_KEY,
    ).toBe('sk_live_x');
  });

  it('parses the Clerk authorized parties list', () => {
    expect(
      loadEnv({ CLERK_AUTHORIZED_PARTIES: 'http://a.com, http://b.com' }).CLERK_AUTHORIZED_PARTIES,
    ).toEqual(['http://a.com', 'http://b.com']);
  });
});
