import {
  RateLimitResult,
  RateLimiter,
} from '../../../../application/ports/out/shared/rate-limiter';

export class NoopRateLimiter implements RateLimiter {
  async hit(_key: string, limit: number): Promise<RateLimitResult> {
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}
