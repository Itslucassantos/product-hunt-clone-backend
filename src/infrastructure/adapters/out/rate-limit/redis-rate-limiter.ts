import type Redis from 'ioredis';
import {
  RateLimitResult,
  RateLimiter,
} from '../../../../application/ports/out/shared/rate-limiter';
import { CircuitBreaker, CircuitBreakerOptions } from '../cache/circuit-breaker';
import type { Logger } from '../../../logging/logger';

const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}
`;

export class RedisRateLimiter implements RateLimiter {
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly redis: Redis,
    private readonly fallback: RateLimiter,
    logger: Logger,
    breakerOptions?: CircuitBreakerOptions,
  ) {
    this.breaker = new CircuitBreaker(logger, breakerOptions);
  }

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const reply = await this.breaker.run<[number, number] | null>(
      async () =>
        (await this.redis.eval(HIT_SCRIPT, 1, key, String(windowSeconds))) as [number, number],
      null,
    );
    if (!reply) return this.fallback.hit(key, limit, windowSeconds);

    const [count, ttl] = reply;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, ttl),
    };
  }
}
