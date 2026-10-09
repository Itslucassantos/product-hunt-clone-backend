import { PrismaProductQueries } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-product-queries';
import { PrismaProductRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-product-repository';
import { PrismaReviewRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-review-repository';
import { PrismaTopicQueries } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-topic-queries';
import { PrismaTopicRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-topic-repository';
import { PrismaTopicUsageQueries } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-topic-usage-queries';
import { PrismaUserRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-user-repository';
import { PrismaUserVotesQueries } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-user-votes-queries';
import { PrismaVoteRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-vote-repository';
import { TestDatabase, startTestDatabase } from '../../helpers/database';
import { RepositoryHarness } from './harness';
import { describeRepositoryContract } from './repositories.contract';

let db: TestDatabase;

describeRepositoryContract('prisma', {
  async start() {
    db = await startTestDatabase();
  },
  async stop() {
    await db.stop();
  },
  async create(): Promise<RepositoryHarness> {
    await db.reset();
    return {
      products: new PrismaProductRepository(db.context),
      topics: new PrismaTopicRepository(db.context),
      reviews: new PrismaReviewRepository(db.context),
      votes: new PrismaVoteRepository(db.context),
      users: new PrismaUserRepository(db.context),
      productQueries: new PrismaProductQueries(db.context),
      topicQueries: new PrismaTopicQueries(db.context),
      topicUsage: new PrismaTopicUsageQueries(db.context),
      userVotes: new PrismaUserVotesQueries(db.context),
    };
  },
});
