import type Redis from 'ioredis';
import { CacheStore } from '../../../../application/ports/out/shared/cache-store';
import type { Logger } from '../../../logging/logger';
import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker';

const VERSION_PREFIX = 'cache:version:';
const LOCK_PREFIX = 'cache:lock:';
const LOCK_TTL_MS = 5000;
const LOCK_WAIT_STEP_MS = 20;
const LOCK_WAIT_MAX_MS = 200;
const TTL_JITTER = 0.1;

const BUMP_VERSION_SCRIPT = `
local v = redis.call('INCR', KEYS[1])
if v == 1 then v = redis.call('INCR', KEYS[1]) end
return v
`;

type Lock = 'acquired' | 'busy' | 'unavailable';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function jitteredTtl(ttlSeconds: number): number {
  const factor = 1 - TTL_JITTER + Math.random() * 2 * TTL_JITTER;
  return Math.max(1, Math.round(ttlSeconds * factor));
}

export class RedisCacheStore implements CacheStore {
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly redis: Redis,
    logger: Logger,
    breakerOptions?: CircuitBreakerOptions,
  ) {
    this.breaker = new CircuitBreaker(logger, breakerOptions);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.breaker.run(() => this.redis.get(key), null);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const payload = JSON.stringify(value);
    await this.breaker.run(() => this.redis.set(key, payload, 'EX', jitteredTtl(ttlSeconds)), null);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.breaker.run(() => this.redis.del(...keys), 0);
  }

  async getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const lock = await this.acquireLock(key);
    if (lock === 'busy') {
      const waited = await this.waitFor<T>(key);
      if (waited !== null) return waited;
    }

    try {
      const value = await loader();
      await this.set(key, value, ttlSeconds);
      return value;
    } finally {
      if (lock === 'acquired') {
        await this.breaker.run(() => this.redis.del(LOCK_PREFIX + key), 0);
      }
    }
  }

  async version(namespace: string): Promise<number> {
    const raw = await this.breaker.run(() => this.redis.get(VERSION_PREFIX + namespace), null);
    const parsed = raw === null ? 1 : Number(raw);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  }

  async bumpVersion(namespace: string): Promise<void> {
    await this.breaker.run(
      () => this.redis.eval(BUMP_VERSION_SCRIPT, 1, VERSION_PREFIX + namespace),
      null,
    );
  }

  private async acquireLock(key: string): Promise<Lock> {
    if (this.breaker.isOpen) return 'unavailable';
    const result = await this.breaker.run<string | null | 'down'>(
      () => this.redis.set(LOCK_PREFIX + key, '1', 'PX', LOCK_TTL_MS, 'NX'),
      'down',
    );
    if (result === 'down') return 'unavailable';
    return result === 'OK' ? 'acquired' : 'busy';
  }

  private async waitFor<T>(key: string): Promise<T | null> {
    for (let waited = 0; waited < LOCK_WAIT_MAX_MS; waited += LOCK_WAIT_STEP_MS) {
      await sleep(LOCK_WAIT_STEP_MS);
      const value = await this.get<T>(key);
      if (value !== null) return value;
    }
    return null;
  }
}
