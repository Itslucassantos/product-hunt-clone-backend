import { OrphanImageCleanup } from '../../ports/out/maintenance/orphan-image-cleanup';
import { Clock } from '../../ports/out/shared/clock';

export const ORPHAN_IMAGE_GRACE_HOURS = 24;

export class CleanupOrphanImages {
  constructor(
    private readonly cleanup: OrphanImageCleanup,
    private readonly clock: Clock,
    private readonly graceHours = ORPHAN_IMAGE_GRACE_HOURS,
  ) {}

  async execute(): Promise<{ removed: number }> {
    const cutoff = new Date(this.clock.now().getTime() - this.graceHours * 60 * 60 * 1000);
    return { removed: await this.cleanup.removeUnreferencedBefore(cutoff) };
  }
}
