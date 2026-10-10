export interface OrphanImageCleanup {
  removeUnreferencedBefore(cutoff: Date): Promise<number>;
}
