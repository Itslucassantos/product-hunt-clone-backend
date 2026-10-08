import { CreateProduct } from '../application/use-cases/products/create-product';
import { DeleteProduct } from '../application/use-cases/products/delete-product';
import { GetProduct } from '../application/use-cases/products/get-product';
import { ListAdminProducts } from '../application/use-cases/products/list-admin-products';
import { ListProducts } from '../application/use-cases/products/list-products';
import { RemoveProductReview } from '../application/use-cases/products/remove-product-review';
import { SaveProductReview } from '../application/use-cases/products/save-product-review';
import { UpdateProduct } from '../application/use-cases/products/update-product';
import { UploadProductImage } from '../application/use-cases/products/upload-product-image';
import { CreateTopic } from '../application/use-cases/topics/create-topic';
import { DeleteTopic } from '../application/use-cases/topics/delete-topic';
import { ListTopics } from '../application/use-cases/topics/list-topics';
import { ReorderTopics } from '../application/use-cases/topics/reorder-topics';
import { UpdateTopic } from '../application/use-cases/topics/update-topic';
import { GetMe } from '../application/use-cases/users/get-me';
import { SyncUser } from '../application/use-cases/users/sync-user';
import { ListMyVotes } from '../application/use-cases/votes/list-my-votes';
import { ToggleVote } from '../application/use-cases/votes/toggle-vote';
import { DevAuthProvider } from '../infrastructure/adapters/out/auth/dev-auth-provider';
import { InMemoryCacheStore } from '../infrastructure/adapters/out/cache/in-memory-cache-store';
import { SystemClock } from '../infrastructure/adapters/out/clock/system-clock';
import { UuidIdGenerator } from '../infrastructure/adapters/out/id/uuid-id-generator';
import { InMemoryProductQueries } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-product-queries';
import { InMemoryProductRepository } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-product-repository';
import { InMemoryReviewRepository } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-review-repository';
import { InMemoryTopicQueries } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-topic-queries';
import { InMemoryTopicRepository } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryTopicUsageQueries } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-topic-usage-queries';
import { InMemoryUnitOfWork } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { InMemoryUserRepository } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-user-repository';
import { InMemoryUserVotesQueries } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-user-votes-queries';
import { InMemoryVoteRepository } from '../infrastructure/adapters/out/persistence/in-memory/in-memory-vote-repository';
import { InMemoryImageStorage } from '../infrastructure/adapters/out/storage/in-memory-image-storage';
import type { Env } from '../infrastructure/config/env';
import { createLogger } from '../infrastructure/logging/logger';

export const DEV_ADMIN_EXTERNAL_ID = 'dev-admin';

export function buildContainer(env: Env) {
  const logger = createLogger(env.LOG_LEVEL);

  if (env.NODE_ENV === 'production') {
    throw new Error('Production auth provider is not implemented yet');
  }
  const auth = new DevAuthProvider();
  const adminExternalIds = [...env.ADMIN_EXTERNAL_IDS, DEV_ADMIN_EXTERNAL_ID];

  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const cache = new InMemoryCacheStore();
  const uow = new InMemoryUnitOfWork();
  const storage = new InMemoryImageStorage();

  const products = new InMemoryProductRepository();
  const topics = new InMemoryTopicRepository();
  const reviews = new InMemoryReviewRepository();
  const votes = new InMemoryVoteRepository();
  const users = new InMemoryUserRepository();

  const productQueries = new InMemoryProductQueries(products, topics, reviews);
  const topicQueries = new InMemoryTopicQueries(topics, (id) => products.countByTopicId(id));
  const topicUsage = new InMemoryTopicUsageQueries(products);
  const userVotesQueries = new InMemoryUserVotesQueries(votes);

  return {
    logger,
    auth,
    clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
    corsOrigin: env.CORS_ORIGIN,
    useCases: {
      listProducts: new ListProducts(productQueries),
      getProduct: new GetProduct(productQueries),
      listAdminProducts: new ListAdminProducts(productQueries),
      createProduct: new CreateProduct(products, topics, uow, ids, clock, cache),
      updateProduct: new UpdateProduct(products, topics, uow, clock, cache),
      deleteProduct: new DeleteProduct(products, uow, cache),
      saveProductReview: new SaveProductReview(products, reviews, uow, ids, clock, cache),
      removeProductReview: new RemoveProductReview(products, reviews, uow, cache),
      uploadProductImage: new UploadProductImage(storage, ids),
      toggleVote: new ToggleVote(products, votes, uow, ids, clock, cache),
      listMyVotes: new ListMyVotes(userVotesQueries),
      listTopics: new ListTopics(topicQueries),
      createTopic: new CreateTopic(topics, uow, ids, clock, cache),
      updateTopic: new UpdateTopic(topics, uow, clock, cache),
      reorderTopics: new ReorderTopics(topics, uow, clock, cache),
      deleteTopic: new DeleteTopic(topics, topicUsage, uow, clock, cache),
      syncUser: new SyncUser(users, ids, clock, adminExternalIds),
      getMe: new GetMe(users),
    },
  };
}

export type Container = ReturnType<typeof buildContainer>;
