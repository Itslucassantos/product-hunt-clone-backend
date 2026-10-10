import { beforeEach, describe, expect, it } from 'vitest';
import { CreateTopic } from '../../../../src/application/use-cases/topics/create-topic';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { TopicAlreadyExistsError } from '../../../../src/domain/errors/topic-already-exists-error';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { InMemoryCacheStore } from '../../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { InMemoryTopicRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { InMemoryUnitOfWork } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { FakeClock, FakeIdGenerator } from '../../../helpers/fakes';
import { admin, regularUser, translations } from '../../../helpers/topics';

describe('CreateTopic', () => {
  let topics: InMemoryTopicRepository;
  let cache: InMemoryCacheStore;
  let createTopic: CreateTopic;

  beforeEach(() => {
    topics = new InMemoryTopicRepository();
    cache = new InMemoryCacheStore();
    createTopic = new CreateTopic(
      topics,
      new InMemoryUnitOfWork(),
      new FakeIdGenerator('t'),
      new FakeClock(),
      cache,
    );
  });

  it('creates the topic at the end of the list and returns its id', async () => {
    const first = await createTopic.execute({
      actor: admin,
      translations: translations('AI', 'IA'),
    });
    const second = await createTopic.execute({ actor: admin, translations: translations('SaaS') });

    expect(first).toEqual({ id: 't-1' });
    const [a, b] = await topics.findAll();
    expect(a).toMatchObject({ id: 't-1', position: 0 });
    expect(a?.slug.value).toBe('ai');
    expect(b).toMatchObject({ id: second.id, position: 1 });
  });

  it('invalidates the topics cache', async () => {
    await createTopic.execute({ actor: admin, translations: translations('AI') });

    expect(await cache.version('topics')).toBe(2);
  });

  it('rejects a non-admin and writes nothing', async () => {
    await expect(
      createTopic.execute({ actor: regularUser, translations: translations('AI') }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await topics.findAll()).toHaveLength(0);
  });

  it('rejects a missing translation with MISSING_TRANSLATION', async () => {
    const promise = createTopic.execute({
      actor: admin,
      translations: translations('AI', '  '),
    });

    await expect(promise).rejects.toBeInstanceOf(ValidationError);
    await expect(promise).rejects.toMatchObject({
      fieldErrors: [{ field: 'translations.pt-BR.name', code: 'MISSING_TRANSLATION' }],
    });
  });

  it('rejects a name already used in the same locale, ignoring case and spaces', async () => {
    await createTopic.execute({ actor: admin, translations: translations('AI', 'IA') });

    const promise = createTopic.execute({
      actor: admin,
      translations: translations('Machine learning', ' ia '),
    });

    await expect(promise).rejects.toBeInstanceOf(TopicAlreadyExistsError);
    await expect(promise).rejects.toMatchObject({
      code: 'TOPIC_ALREADY_EXISTS',
      details: { field: 'translations.pt-BR.name', code: 'ALREADY_EXISTS' },
    });
    expect(await topics.findAll()).toHaveLength(1);
  });

  it('rejects English names that produce the same slug', async () => {
    await createTopic.execute({ actor: admin, translations: translations('Cafe', 'Cafe 1') });

    await expect(
      createTopic.execute({ actor: admin, translations: translations('Café', 'Cafe 2') }),
    ).rejects.toMatchObject({ details: { field: 'translations.en.name' } });
  });
});
