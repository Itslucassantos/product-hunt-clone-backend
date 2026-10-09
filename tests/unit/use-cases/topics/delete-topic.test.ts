import { beforeEach, describe, expect, it } from 'vitest';
import { CreateTopic } from '../../../../src/application/use-cases/topics/create-topic';
import { DeleteTopic } from '../../../../src/application/use-cases/topics/delete-topic';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { TopicInUseError } from '../../../../src/domain/errors/topic-in-use-error';
import { TopicNotFoundError } from '../../../../src/domain/errors/topic-not-found-error';
import { InMemoryCacheStore } from '../../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { InMemoryTopicRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryUnitOfWork } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { FakeClock, FakeIdGenerator, FakeTopicUsageQueries } from '../../../helpers/fakes';
import { admin, regularUser, translations } from '../../../helpers/topics';

describe('DeleteTopic', () => {
  let topics: InMemoryTopicRepository;
  let usage: FakeTopicUsageQueries;
  let cache: InMemoryCacheStore;
  let deleteTopic: DeleteTopic;

  beforeEach(async () => {
    topics = new InMemoryTopicRepository();
    usage = new FakeTopicUsageQueries();
    cache = new InMemoryCacheStore();
    const uow = new InMemoryUnitOfWork();
    const clock = new FakeClock();
    const create = new CreateTopic(topics, uow, new FakeIdGenerator('t'), clock, cache);
    for (const name of ['A', 'B', 'C']) {
      await create.execute({ actor: admin, translations: translations(name) });
    }
    cache = new InMemoryCacheStore();
    deleteTopic = new DeleteTopic(topics, usage, uow, clock, cache);
  });

  it('removes the topic and compacts the remaining positions', async () => {
    await deleteTopic.execute({ actor: admin, topicId: 't-1' });

    const remaining = await topics.findAll();
    expect(remaining.map((t) => [t.id, t.position])).toEqual([
      ['t-2', 0],
      ['t-3', 1],
    ]);
  });

  it('invalidates both topics and products caches', async () => {
    await deleteTopic.execute({ actor: admin, topicId: 't-2' });

    expect(await cache.version('topics')).toBe(2);
    expect(await cache.version('products')).toBe(2);
  });

  it('blocks with TOPIC_IN_USE, reporting at most 5 products and the total', async () => {
    usage.block(
      't-1',
      Array.from({ length: 7 }, (_, i) => ({ productId: `p-${i}`, title: `Product ${i}` })),
    );

    const promise = deleteTopic.execute({ actor: admin, topicId: 't-1' });

    await expect(promise).rejects.toBeInstanceOf(TopicInUseError);
    await expect(promise).rejects.toMatchObject({
      code: 'TOPIC_IN_USE',
      details: {
        total: 7,
        products: expect.arrayContaining([{ productId: 'p-0', title: 'Product 0' }]),
      },
    });
    const error = (await promise.catch((e: TopicInUseError) => e)) as TopicInUseError;
    expect((error.details as { products: unknown[] }).products).toHaveLength(5);
    expect(await topics.findAll()).toHaveLength(3);
    expect(await cache.version('topics')).toBe(1);
  });

  it('blocks deleting a topic used by a single product', async () => {
    usage.block('t-1', [{ productId: 'p-1', title: 'Lumen' }]);

    await expect(deleteTopic.execute({ actor: admin, topicId: 't-1' })).rejects.toMatchObject({
      code: 'TOPIC_IN_USE',
      details: { total: 1 },
    });
  });

  it('rejects a non-admin', async () => {
    await expect(
      deleteTopic.execute({ actor: regularUser, topicId: 't-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws TopicNotFoundError for an unknown id', async () => {
    await expect(deleteTopic.execute({ actor: admin, topicId: 'nope' })).rejects.toBeInstanceOf(
      TopicNotFoundError,
    );
  });
});
