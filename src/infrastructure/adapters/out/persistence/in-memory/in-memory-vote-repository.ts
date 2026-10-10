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

  async save(vote: Vote): Promise<boolean> {
    const duplicate = [...this.byId.values()].some(
      (item) => item.userId === vote.userId && item.productId === vote.productId,
    );
    if (duplicate) return false;
    this.byId.set(vote.id, vote);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }
}
