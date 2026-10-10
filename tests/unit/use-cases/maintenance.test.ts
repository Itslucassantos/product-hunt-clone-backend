import { describe, expect, it, vi } from 'vitest';
import { CleanupOrphanImages } from '../../../src/application/use-cases/maintenance/cleanup-orphan-images';
import { ReconcileUpvotes } from '../../../src/application/use-cases/maintenance/reconcile-upvotes';
import { InMemoryCacheStore } from '../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { FakeClock } from '../../helpers/fakes';

describe('ReconcileUpvotes', () => {
  it('invalidates the product lists only when something was fixed', async () => {
    const cache = new InMemoryCacheStore();
    const reconcile = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(3);
    const job = new ReconcileUpvotes({ reconcile }, cache);

    expect(await job.execute()).toEqual({ fixed: 0 });
    expect(await cache.version('products')).toBe(1);
    expect(await job.execute()).toEqual({ fixed: 3 });
    expect(await cache.version('products')).toBe(2);
  });
});

describe('CleanupOrphanImages', () => {
  it('removes images older than the grace period', async () => {
    const removeUnreferencedBefore = vi.fn().mockResolvedValue(2);
    const clock = new FakeClock(new Date('2026-01-10T12:00:00Z'));

    const result = await new CleanupOrphanImages({ removeUnreferencedBefore }, clock).execute();

    expect(result).toEqual({ removed: 2 });
    expect(removeUnreferencedBefore).toHaveBeenCalledWith(new Date('2026-01-09T12:00:00Z'));
  });
});
