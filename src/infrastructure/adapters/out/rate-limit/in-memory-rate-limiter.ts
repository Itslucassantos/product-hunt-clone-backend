import {
  RateLimitResult,
  RateLimiter,
} from '../../../../application/ports/out/shared/rate-limiter';

interface Window {
  count: number;
  resetsAt: number;
}

const PRUNE_THRESHOLD = 10_000;

export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();

  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.prune(now);

    let current = this.windows.get(key);
    if (!current || current.resetsAt <= now) {
      current = { count: 0, resetsAt: now + windowSeconds * 1000 };
      this.windows.set(key, current);
    }
    current.count += 1;

    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
    };
  }

  private prune(now: number): void {
    if (this.windows.size < PRUNE_THRESHOLD) return;
    for (const [key, window] of this.windows) {
      if (window.resetsAt <= now) this.windows.delete(key);
    }
  }
}
