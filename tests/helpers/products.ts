import { CreateProduct } from '../../src/application/use-cases/products/create-product';
import { CreateTopic } from '../../src/application/use-cases/topics/create-topic';
import { SaveProductReview } from '../../src/application/use-cases/products/save-product-review';
import { InMemoryCacheStore } from '../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { InMemoryProductQueries } from '../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-product-queries';
import { InMemoryProductRepository } from '../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-product-repository';
import { InMemoryReviewRepository } from '../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-review-repository';
import { InMemoryTopicRepository } from '../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryUnitOfWork } from '../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { FakeClock, FakeIdGenerator } from './fakes';
import { admin, translations } from './topics';

export async function buildProductWorld() {
  const products = new InMemoryProductRepository();
  const topics = new InMemoryTopicRepository();
  const reviews = new InMemoryReviewRepository();
  const queries = new InMemoryProductQueries(products, topics, reviews);
  const uow = new InMemoryUnitOfWork();
  const clock = new FakeClock();
  const cache = new InMemoryCacheStore();

  const createTopic = new CreateTopic(topics, uow, new FakeIdGenerator('t'), clock, cache);
  await createTopic.execute({ actor: admin, translations: translations('AI', 'IA') });
  await createTopic.execute({ actor: admin, translations: translations('SaaS') });

  const productIds = new FakeIdGenerator('p');
  const createProduct = new CreateProduct(products, topics, uow, productIds, clock, cache);
  const saveReview = new SaveProductReview(
    products,
    reviews,
    uow,
    new FakeIdGenerator('r'),
    clock,
    cache,
  );

  return {
    products,
    topics,
    reviews,
    queries,
    uow,
    clock,
    cache: new InMemoryCacheStore(),
    createProduct,
    saveReview,
  };
}

export const productInput = (title: string, topicIds: string[] = ['t-1']) => ({
  actor: admin,
  title,
  description: `${title} description`,
  url: 'https://example.com',
  topicIds,
});
