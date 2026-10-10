import { OrphanImageCleanup } from '../../../../../application/ports/out/maintenance/orphan-image-cleanup';
import { UpvoteReconciliation } from '../../../../../application/ports/out/maintenance/upvote-reconciliation';
import { PrismaContext } from './prisma-context';

export class PrismaMaintenance implements UpvoteReconciliation, OrphanImageCleanup {
  constructor(private readonly context: PrismaContext) {}

  reconcile(): Promise<number> {
    return this.context.client.$executeRaw`
      UPDATE "Product" p
      SET "upvotes" = counted.total
      FROM (
        SELECT product."id", COUNT(vote."id")::int AS total
        FROM "Product" product
        LEFT JOIN "Vote" vote ON vote."productId" = product."id"
        GROUP BY product."id"
      ) counted
      WHERE p."id" = counted."id" AND p."upvotes" <> counted.total
    `;
  }

  removeUnreferencedBefore(cutoff: Date): Promise<number> {
    return this.context.client.$executeRaw`
      DELETE FROM "ProductImage" image
      WHERE image."createdAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "Product" product WHERE product."imageUrl" LIKE '%/' || image."id"
        )
    `;
  }
}
