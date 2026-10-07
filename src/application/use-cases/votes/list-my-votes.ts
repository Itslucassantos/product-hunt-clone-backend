import {
  ListMyVotesInput,
  ListMyVotesOutput,
  ListMyVotesUseCase,
} from '../../ports/in/votes/list-my-votes';
import { UserVotesQueries } from '../../ports/out/votes/user-votes-queries';

export class ListMyVotes implements ListMyVotesUseCase {
  constructor(private readonly queries: UserVotesQueries) {}

  async execute(input: ListMyVotesInput): Promise<ListMyVotesOutput> {
    return { productIds: await this.queries.listProductIds(input.userId) };
  }
}
