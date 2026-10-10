import { beforeEach, describe, expect, it } from 'vitest';
import { CreateTopic } from '../../../../src/application/use-cases/topics/create-topic';
import { UpdateTopic } from '../../../../src/application/use-cases/topics/update-topic';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { TopicAlreadyExistsError } from '../../../../src/domain/errors/topic-already-exists-error';
import { TopicNotFoundError } from '../../../../src/domain/errors/topic-not-found-error';
import { InMemoryCacheStore } from '../../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { InMemoryTopicRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryUnitOfWork } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { FakeClock, FakeIdGenerator } from '../../../helpers/fakes';
import { admin, regularUser, translations } from '../../../helpers/topics';

describe('UpdateTopic', () => {
  let topics: InMemoryTopicRepository;
  let cache: InMemoryCacheStore;
  let clock: FakeClock;
  let updateTopic: UpdateTopic;

  beforeEach(async () => {
    topics = new InMemoryTopicRepository();
    cache = new InMemoryCacheStore();
    clock = new FakeClock();
    const uow = new InMemoryUnitOfWork();
    const create = new CreateTopic(topics, uow, new FakeIdGenerator('t'), clock, cache);
    await create.execute({ actor: admin, translations: translations('AI', 'IA') });
    await create.execute({ actor: admin, translations: translations('SaaS', 'SaaS BR') });
    cache = new InMemoryCacheStore();
    updateTopic = new UpdateTopic(topics, uow, clock, cache);
  });

  it('replaces the translations and keeps the slug', async () => {
    clock.set(new Date('2026-03-01T00:00:00Z'));

    await updateTopic.execute({
      actor: admin,
      topicId: 't-1',
      translations: translations('Artificial Intelligence', 'Inteligência Artificial'),
    });

    const topic = await topics.findById('t-1');
    expect(topic?.nameIn('pt-BR')).toBe('Inteligência Artificial');
    expect(topic?.slug.value).toBe('ai');
    expect(topic?.updatedAt).toEqual(clock.now());
  });

  it('accepts the topic keeping its own names', async () => {
    await expect(
      updateTopic.execute({ actor: admin, topicId: 't-1', translations: translations('AI', 'IA') }),
    ).resolves.toBeUndefined();
  });

  it('invalidates both topics and products caches', async () => {
    await updateTopic.execute({
      actor: admin,
      topicId: 't-1',
      translations: translations('AI 2', 'IA 2'),
    });

    expect(await cache.version('topics')).toBe(2);
    expect(await cache.version('products')).toBe(2);
  });

  it('rejects a non-admin', async () => {
    await expect(
      updateTopic.execute({ actor: regularUser, topicId: 't-1', translations: translations('X') }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws TopicNotFoundError for an unknown id', async () => {
    await expect(
      updateTopic.execute({ actor: admin, topicId: 'nope', translations: translations('X') }),
    ).rejects.toBeInstanceOf(TopicNotFoundError);
  });

  it('rejects a name taken by another topic and leaves the stored topic untouched', async () => {
    await expect(
      updateTopic.execute({
        actor: admin,
        topicId: 't-1',
        translations: translations('Other', 'saas br'),
      }),
    ).rejects.toBeInstanceOf(TopicAlreadyExistsError);

    expect((await topics.findById('t-1'))?.nameIn('en')).toBe('AI');
    expect(await cache.version('topics')).toBe(1);
  });
});
