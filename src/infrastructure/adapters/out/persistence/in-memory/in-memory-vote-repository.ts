import { Vote } from '../../../../../domain/entities/vote';
import { VoteRepository } from '../../../../../application/ports/out/votes/vote-repository';

export class InMemoryVoteRepository implements VoteRepository {
  private readonly byId = new Map<string, Vote>();

  async findByUserAndProduct(userId: string, productId: string): Promise<Vote | null> {
    return (
      [...this.byId.values()].find(
        (vote) => vote.userId === userId && vote.productId === productId,
      ) ?? null
    );
  }

  async findAllByUser(userId: string): Promise<Vote[]> {
    return [...this.byId.values()]
      .filter((vote) => vote.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(vote: Vote): Promise<void> {
    this.byId.set(vote.id, vote);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
