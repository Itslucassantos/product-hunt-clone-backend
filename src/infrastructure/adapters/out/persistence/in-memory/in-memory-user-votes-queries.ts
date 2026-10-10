import { UserVotesQueries } from '../../../../../application/ports/out/votes/user-votes-queries';
import { InMemoryVoteRepository } from './in-memory-vote-repository';

export class InMemoryUserVotesQueries implements UserVotesQueries {
  constructor(private readonly votes: InMemoryVoteRepository) {}

  async listProductIds(userId: string): Promise<string[]> {
    return (await this.votes.findAllByUser(userId)).map((vote) => vote.productId);
  }
}
