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
import Redis from 'ioredis';
import { CachedProductQueries } from '../infrastructure/adapters/out/cache/cached-product-queries';
import { CachedTopicQueries } from '../infrastructure/adapters/out/cache/cached-topic-queries';
import { NoopCacheStore } from '../infrastructure/adapters/out/cache/noop-cache-store';
import { RedisCacheStore } from '../infrastructure/adapters/out/cache/redis-cache-store';
import { InMemoryRateLimiter } from '../infrastructure/adapters/out/rate-limit/in-memory-rate-limiter';
import { NoopRateLimiter } from '../infrastructure/adapters/out/rate-limit/noop-rate-limiter';
import { RedisRateLimiter } from '../infrastructure/adapters/out/rate-limit/redis-rate-limiter';
import { CacheStore } from '../application/ports/out/shared/cache-store';
import { RateLimiter } from '../application/ports/out/shared/rate-limiter';
import type { HealthCheck } from '../infrastructure/adapters/in/http/routes/health.routes';
import { createErrorReporter } from '../infrastructure/observability/error-reporter';
import { createMetrics } from '../infrastructure/observability/metrics';
import type { Logger } from '../infrastructure/logging/logger';
import { ClerkAuthProvider } from '../infrastructure/adapters/out/auth/clerk-auth-provider';
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
import { PrismaMaintenance } from '../infrastructure/adapters/out/persistence/prisma/prisma-maintenance';
import { CleanupOrphanImages } from '../application/use-cases/maintenance/cleanup-orphan-images';
import { ReconcileUpvotes } from '../application/use-cases/maintenance/reconcile-upvotes';
import { PrismaProductQueries } from '../infrastructure/adapters/out/persistence/prisma/prisma-product-queries';
import { PrismaProductRepository } from '../infrastructure/adapters/out/persistence/prisma/prisma-product-repository';
import { PrismaReviewRepository } from '../infrastructure/adapters/out/persistence/prisma/prisma-review-repository';
import { PrismaTopicQueries } from '../infrastructure/adapters/out/persistence/prisma/prisma-topic-queries';
import { PrismaTopicRepository } from '../infrastructure/adapters/out/persistence/prisma/prisma-topic-repository';
import { PrismaTopicUsageQueries } from '../infrastructure/adapters/out/persistence/prisma/prisma-topic-usage-queries';
import {
  PrismaContext,
  createPrismaClient,
} from '../infrastructure/adapters/out/persistence/prisma/prisma-context';
import { PrismaUnitOfWork } from '../infrastructure/adapters/out/persistence/prisma/prisma-unit-of-work';
import { PrismaUserRepository } from '../infrastructure/adapters/out/persistence/prisma/prisma-user-repository';
import { PrismaUserVotesQueries } from '../infrastructure/adapters/out/persistence/prisma/prisma-user-votes-queries';
import { PrismaVoteRepository } from '../infrastructure/adapters/out/persistence/prisma/prisma-vote-repository';
import { PrismaImageStorage } from '../infrastructure/adapters/out/storage/prisma-image-storage';
import { InMemoryImageStorage } from '../infrastructure/adapters/out/storage/in-memory-image-storage';
import { ImageQueries } from '../application/ports/out/products/image-queries';
import { ImageStorage } from '../application/ports/out/products/image-storage';
import type { Env } from '../infrastructure/config/env';
import { createLogger } from '../infrastructure/logging/logger';

export const DEV_ADMIN_EXTERNAL_ID = 'dev-admin';

function needsRedis(env: Env): boolean {
  return env.CACHE_DRIVER === 'redis' || env.RATE_LIMIT_DRIVER === 'redis';
}

function createRedis(url: string, logger: Logger): Redis {
  const redis = new Redis(url, {
    commandTimeout: 100,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  redis.on('error', (error) => logger.warn({ err: error }, 'redis connection error'));
  return redis;
}

function buildCache(env: Env, redis: Redis | null, logger: Logger): CacheStore {
  if (env.CACHE_DRIVER === 'redis' && redis) return new RedisCacheStore(redis, logger);
  if (env.CACHE_DRIVER === 'memory') return new InMemoryCacheStore();
  return new NoopCacheStore();
}

function buildRateLimiter(env: Env, redis: Redis | null, logger: Logger): RateLimiter {
  if (env.RATE_LIMIT_DRIVER === 'redis' && redis) {
    return new RedisRateLimiter(redis, new InMemoryRateLimiter(), logger);
  }
  if (env.RATE_LIMIT_DRIVER === 'none') return new NoopRateLimiter();
  return new InMemoryRateLimiter();
}

function buildImages(
  context: PrismaContext | null,
  baseUrl: string,
): { storage: ImageStorage; queries: ImageQueries } {
  const storage = context
    ? new PrismaImageStorage(context, baseUrl)
    : new InMemoryImageStorage(baseUrl);
  return { storage, queries: storage };
}

function buildPersistence(env: Env) {
  if (env.REPOSITORY_DRIVER === 'prisma') {
    const prisma = createPrismaClient(env.DATABASE_URL as string);
    const context = new PrismaContext(prisma);
    return {
      uow: new PrismaUnitOfWork(context),
      products: new PrismaProductRepository(context),
      topics: new PrismaTopicRepository(context),
      reviews: new PrismaReviewRepository(context),
      votes: new PrismaVoteRepository(context),
      users: new PrismaUserRepository(context),
      productQueries: new PrismaProductQueries(context),
      topicQueries: new PrismaTopicQueries(context),
      topicUsage: new PrismaTopicUsageQueries(context),
      userVotesQueries: new PrismaUserVotesQueries(context),
      context,
      maintenance: new PrismaMaintenance(context),
      checkDatabase: async () => {
        await prisma.$queryRaw`SELECT 1`;
      },
      shutdown: () => prisma.$disconnect(),
    };
  }

  const products = new InMemoryProductRepository();
  const topics = new InMemoryTopicRepository();
  const reviews = new InMemoryReviewRepository();
  const votes = new InMemoryVoteRepository();
  return {
    uow: new InMemoryUnitOfWork(),
    products,
    topics,
    reviews,
    votes,
    users: new InMemoryUserRepository(),
    productQueries: new InMemoryProductQueries(products, topics, reviews),
    topicQueries: new InMemoryTopicQueries(topics, (id) => products.countByTopicId(id)),
    topicUsage: new InMemoryTopicUsageQueries(products),
    userVotesQueries: new InMemoryUserVotesQueries(votes),
    context: null,
    maintenance: null,
    checkDatabase: null,
    shutdown: async () => {},
  };
}

export function buildContainer(env: Env) {
  const logger = createLogger(env.LOG_LEVEL);

  const auth = env.CLERK_SECRET_KEY
    ? new ClerkAuthProvider(
        {
          secretKey: env.CLERK_SECRET_KEY,
          jwtKey: env.CLERK_JWT_KEY,
          authorizedParties:
            env.CLERK_AUTHORIZED_PARTIES.length > 0 ? env.CLERK_AUTHORIZED_PARTIES : undefined,
        },
        undefined,
        logger,
      )
    : new DevAuthProvider();
  const adminExternalIds = env.CLERK_SECRET_KEY
    ? env.ADMIN_EXTERNAL_IDS
    : [...env.ADMIN_EXTERNAL_IDS, DEV_ADMIN_EXTERNAL_ID];

  const clock = new SystemClock();
  const ids = new UuidIdGenerator();
  const redis = needsRedis(env) ? createRedis(env.REDIS_URL as string, logger) : null;
  const cache = buildCache(env, redis, logger);
  const rateLimiter = buildRateLimiter(env, redis, logger);
  const metrics = env.METRICS_TOKEN ? createMetrics() : null;
  const errorReporter = createErrorReporter(env.SENTRY_DSN, env.NODE_ENV);
  const persistence = buildPersistence(env);
  const publicUrl = env.PUBLIC_URL || `http://localhost:${env.PORT}`;
  const images = buildImages(persistence.context, `${publicUrl}/files`);

  const { uow, products, topics, reviews, votes, users, topicUsage, userVotesQueries } =
    persistence;
  const productQueries = new CachedProductQueries(
    persistence.productQueries,
    cache,
    { list: env.CACHE_TTL_PRODUCT_LIST, detail: env.CACHE_TTL_PRODUCT_DETAIL },
    metrics?.cacheStats,
  );
  const topicQueries = new CachedTopicQueries(
    persistence.topicQueries,
    cache,
    env.CACHE_TTL_TOPICS,
    metrics?.cacheStats,
  );

  const healthChecks: HealthCheck[] = [];
  if (persistence.checkDatabase) {
    healthChecks.push({ name: 'database', critical: true, check: persistence.checkDatabase });
  }
  if (redis) {
    healthChecks.push({
      name: 'redis',
      critical: false,
      check: async () => {
        await redis.ping();
      },
    });
  }

  return {
    logger,
    auth,
    clerkWebhookSecret: env.CLERK_WEBHOOK_SECRET,
    corsOrigin: env.CORS_ORIGIN,
    imageQueries: images.queries,
    rateLimiter,
    trustProxy: env.TRUST_PROXY,
    healthChecks,
    requestMetrics: metrics?.requestMiddleware,
    metrics:
      metrics && env.METRICS_TOKEN
        ? { registry: metrics.registry, token: env.METRICS_TOKEN }
        : undefined,
    errorHooks: {
      onError: ({
        code,
        status,
        err,
        requestId,
      }: {
        code: string;
        status: number;
        err: unknown;
        requestId?: string;
      }) => {
        metrics?.recordError(code);
        if (status >= 500) errorReporter.capture(err, { requestId });
      },
    },
    jobs: persistence.maintenance
      ? {
          reconcileUpvotes: new ReconcileUpvotes(persistence.maintenance, cache),
          cleanupOrphanImages: new CleanupOrphanImages(persistence.maintenance, clock),
        }
      : null,
    shutdown: async () => {
      await persistence.shutdown();
      redis?.disconnect();
    },
    useCases: {
      listProducts: new ListProducts(productQueries),
      getProduct: new GetProduct(productQueries),
      listAdminProducts: new ListAdminProducts(productQueries),
      createProduct: new CreateProduct(products, topics, uow, ids, clock, cache),
      updateProduct: new UpdateProduct(products, topics, uow, clock, cache),
      deleteProduct: new DeleteProduct(products, uow, cache),
      saveProductReview: new SaveProductReview(products, reviews, uow, ids, clock, cache),
      removeProductReview: new RemoveProductReview(products, reviews, uow, cache),
      uploadProductImage: new UploadProductImage(images.storage, ids),
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
