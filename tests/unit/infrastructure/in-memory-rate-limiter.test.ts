import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryRateLimiter } from '../../../src/infrastructure/adapters/out/rate-limit/in-memory-rate-limiter';

describe('InMemoryRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows up to the limit and then blocks with a retry delay', async () => {
    const limiter = new InMemoryRateLimiter();

    const first = await limiter.hit('k', 2, 60);
    const second = await limiter.hit('k', 2, 60);
    const third = await limiter.hit('k', 2, 60);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(third).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 60 });
  });

  it('counts each key separately', async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.hit('a', 1, 60);

    expect((await limiter.hit('b', 1, 60)).allowed).toBe(true);
    expect((await limiter.hit('a', 1, 60)).allowed).toBe(false);
  });

  it('opens a new window after the previous one expires', async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.hit('k', 1, 60);
    expect((await limiter.hit('k', 1, 60)).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect((await limiter.hit('k', 1, 60)).allowed).toBe(true);
  });

  it('reports the time left in the current window', async () => {
    const limiter = new InMemoryRateLimiter();
    await limiter.hit('k', 1, 60);
    vi.advanceTimersByTime(20_000);

    expect((await limiter.hit('k', 1, 60)).retryAfterSeconds).toBe(40);
  });
});
