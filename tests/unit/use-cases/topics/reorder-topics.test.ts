import { beforeEach, describe, expect, it } from 'vitest';
import { CreateTopic } from '../../../../src/application/use-cases/topics/create-topic';
import { ReorderTopics } from '../../../../src/application/use-cases/topics/reorder-topics';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { InvalidTopicOrderError } from '../../../../src/domain/errors/invalid-topic-order-error';
import { InMemoryCacheStore } from '../../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { InMemoryTopicRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryUnitOfWork } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { FakeClock, FakeIdGenerator } from '../../../helpers/fakes';
import { admin, regularUser, translations } from '../../../helpers/topics';

describe('ReorderTopics', () => {
  let topics: InMemoryTopicRepository;
  let cache: InMemoryCacheStore;
  let reorder: ReorderTopics;

  const order = async () => (await topics.findAll()).map((t) => t.id);

  beforeEach(async () => {
    topics = new InMemoryTopicRepository();
    cache = new InMemoryCacheStore();
    const uow = new InMemoryUnitOfWork();
    const clock = new FakeClock();
    const create = new CreateTopic(topics, uow, new FakeIdGenerator('t'), clock, cache);
    for (const name of ['A', 'B', 'C']) {
      await create.execute({ actor: admin, translations: translations(name) });
    }
    cache = new InMemoryCacheStore();
    reorder = new ReorderTopics(topics, uow, clock, cache);
  });

  it('applies the new order', async () => {
    await reorder.execute({ actor: admin, ids: ['t-3', 't-1', 't-2'] });

    expect(await order()).toEqual(['t-3', 't-1', 't-2']);
    expect((await topics.findAll()).map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it('invalidates the topics cache', async () => {
    await reorder.execute({ actor: admin, ids: ['t-2', 't-1', 't-3'] });

    expect(await cache.version('topics')).toBe(2);
  });

  it.each([
    ['a missing id', ['t-1', 't-2']],
    ['an unknown id', ['t-1', 't-2', 'nope']],
    ['a duplicated id', ['t-1', 't-1', 't-2']],
    ['an extra id', ['t-1', 't-2', 't-3', 't-4']],
  ])('rejects %s with INVALID_TOPIC_ORDER and keeps the order', async (_label, ids) => {
    await expect(reorder.execute({ actor: admin, ids })).rejects.toBeInstanceOf(
      InvalidTopicOrderError,
    );
    expect(await order()).toEqual(['t-1', 't-2', 't-3']);
  });

  it('rejects a non-admin', async () => {
    await expect(
      reorder.execute({ actor: regularUser, ids: ['t-1', 't-2', 't-3'] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
