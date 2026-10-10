export interface UpvoteReconciliation {
  reconcile(): Promise<number>;
}
