import { UpvoteReconciliation } from '../../ports/out/maintenance/upvote-reconciliation';
import { CacheStore } from '../../ports/out/shared/cache-store';

export class ReconcileUpvotes {
  constructor(
    private readonly reconciliation: UpvoteReconciliation,
    private readonly cache: CacheStore,
  ) {}

  async execute(): Promise<{ fixed: number }> {
    const fixed = await this.reconciliation.reconcile();
    if (fixed > 0) await this.cache.bumpVersion('products');
    return { fixed };
  }
}
