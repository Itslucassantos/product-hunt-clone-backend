import { Vote } from '../../../../../domain/entities/vote';
import { VoteRepository } from '../../../../../application/ports/out/votes/vote-repository';
import { PrismaContext } from './prisma-context';

export class PrismaVoteRepository implements VoteRepository {
  constructor(private readonly context: PrismaContext) {}

  async findByUserAndProduct(userId: string, productId: string): Promise<Vote | null> {
    const row = await this.context.client.vote.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return row ? Vote.restore(row.id, row.userId, row.productId, row.createdAt) : null;
  }

  async save(vote: Vote): Promise<void> {
    await this.context.client.vote.upsert({
      where: { id: vote.id },
      create: {
        id: vote.id,
        userId: vote.userId,
        productId: vote.productId,
        createdAt: vote.createdAt,
        updatedAt: vote.createdAt,
      },
      update: {},
    });
  }

  async delete(id: string): Promise<void> {
    await this.context.client.vote.deleteMany({ where: { id } });
  }
}
