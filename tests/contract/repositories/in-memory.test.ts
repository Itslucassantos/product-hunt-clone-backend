import { InMemoryProductQueries } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-product-queries';
import { InMemoryProductRepository } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-product-repository';
import { InMemoryReviewRepository } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-review-repository';
import { InMemoryTopicQueries } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-queries';
import { InMemoryTopicRepository } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryTopicUsageQueries } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-usage-queries';
import { InMemoryUserRepository } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-user-repository';
import { InMemoryUserVotesQueries } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-user-votes-queries';
import { InMemoryVoteRepository } from '../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-vote-repository';
import { RepositoryHarness } from './harness';
import { describeRepositoryContract } from './repositories.contract';

describeRepositoryContract('in-memory', {
  async start() {},
  async stop() {},
  async create(): Promise<RepositoryHarness> {
    const products = new InMemoryProductRepository();
    const topics = new InMemoryTopicRepository();
    const reviews = new InMemoryReviewRepository();
    const votes = new InMemoryVoteRepository();
    return {
      products,
      topics,
      reviews,
      votes,
      users: new InMemoryUserRepository(),
      productQueries: new InMemoryProductQueries(products, topics, reviews),
      topicQueries: new InMemoryTopicQueries(topics, (id) => products.countByTopicId(id)),
      topicUsage: new InMemoryTopicUsageQueries(products),
      userVotes: new InMemoryUserVotesQueries(votes),
    };
  },
});
