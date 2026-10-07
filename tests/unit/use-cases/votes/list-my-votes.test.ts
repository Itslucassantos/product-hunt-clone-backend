import { beforeEach, describe, expect, it } from 'vitest';
import { ListMyVotes } from '../../../../src/application/use-cases/votes/list-my-votes';
import { Vote } from '../../../../src/domain/entities/vote';
import { InMemoryUserVotesQueries } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-user-votes-queries';
import { InMemoryVoteRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-vote-repository';

describe('ListMyVotes', () => {
  let votes: InMemoryVoteRepository;
  let listMyVotes: ListMyVotes;

  beforeEach(() => {
    votes = new InMemoryVoteRepository();
    listMyVotes = new ListMyVotes(new InMemoryUserVotesQueries(votes));
  });

  it('returns the ids of the products the user voted on, newest first', async () => {
    await votes.save(Vote.create('v-1', 'u-1', 'p-1', new Date('2026-01-01T00:00:00Z')));
    await votes.save(Vote.create('v-2', 'u-1', 'p-2', new Date('2026-01-02T00:00:00Z')));
    await votes.save(Vote.create('v-3', 'u-2', 'p-3', new Date('2026-01-03T00:00:00Z')));

    const output = await listMyVotes.execute({ userId: 'u-1' });

    expect(output).toEqual({ productIds: ['p-2', 'p-1'] });
  });

  it('returns an empty list when the user has not voted', async () => {
    expect(await listMyVotes.execute({ userId: 'u-1' })).toEqual({ productIds: [] });
  });
});
