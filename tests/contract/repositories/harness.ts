import { ProductQueries } from '../../../src/application/ports/out/products/product-queries';
import { ProductRepository } from '../../../src/application/ports/out/products/product-repository';
import { ReviewRepository } from '../../../src/application/ports/out/reviews/review-repository';
import { TopicQueries } from '../../../src/application/ports/out/topics/topic-queries';
import { TopicRepository } from '../../../src/application/ports/out/topics/topic-repository';
import { TopicUsageQueries } from '../../../src/application/ports/out/topics/topic-usage-queries';
import { UserRepository } from '../../../src/application/ports/out/users/user-repository';
import { UserVotesQueries } from '../../../src/application/ports/out/votes/user-votes-queries';
import { VoteRepository } from '../../../src/application/ports/out/votes/vote-repository';

export interface RepositoryHarness {
  products: ProductRepository;
  reviews: ReviewRepository;
  topics: TopicRepository;
  users: UserRepository;
  votes: VoteRepository;
  productQueries: ProductQueries;
  topicQueries: TopicQueries;
  topicUsage: TopicUsageQueries;
  userVotes: UserVotesQueries;
}

export interface HarnessFactory {
  start(): Promise<void>;
  create(): Promise<RepositoryHarness>;
  stop(): Promise<void>;
}
