import { UserVotesQueries } from '../../../../../application/ports/out/votes/user-votes-queries';
import { PrismaContext } from './prisma-context';

export class PrismaUserVotesQueries implements UserVotesQueries {
  constructor(private readonly context: PrismaContext) {}

  async listProductIds(userId: string): Promise<string[]> {
    const rows = await this.context.client.vote.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => row.productId);
  }
}
