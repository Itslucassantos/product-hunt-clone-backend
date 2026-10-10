import type { RequestHandler } from 'express';
import { RateLimiter } from '../../../../../application/ports/out/shared/rate-limiter';
import { RateLimitedError } from '../../../../../domain/errors/rate-limited-error';

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
  by: 'ip' | 'user';
}

export function rateLimit(limiter: RateLimiter, rule: RateLimitRule): RequestHandler {
  return async (req, res, next) => {
    const subject = rule.by === 'user' ? (res.locals.actor?.id ?? req.ip) : req.ip;
    const result = await limiter.hit(
      `rl:${rule.name}:${subject ?? 'unknown'}`,
      rule.limit,
      rule.windowSeconds,
    );
    res.setHeader('X-RateLimit-Limit', String(rule.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw new RateLimitedError(result.retryAfterSeconds);
    }
    next();
  };
}

export const RATE_LIMITS = {
  publicRead: { name: 'public-read', limit: 120, windowSeconds: 60, by: 'ip' },
  vote: { name: 'vote', limit: 30, windowSeconds: 60, by: 'user' },
  adminWrite: { name: 'admin-write', limit: 60, windowSeconds: 60, by: 'user' },
  upload: { name: 'upload', limit: 10, windowSeconds: 60, by: 'user' },
} as const satisfies Record<string, RateLimitRule>;
