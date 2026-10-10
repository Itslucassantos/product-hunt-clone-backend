import { describe, expect, it } from 'vitest';
import { ListTopics } from '../../../../src/application/use-cases/topics/list-topics';
import { Topic } from '../../../../src/domain/entities/topic';
import { InMemoryTopicQueries } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-queries';
import { InMemoryTopicRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-topic-repository';
import { translations } from '../../../helpers/topics';

describe('ListTopics', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  async function setup() {
    const topics = new InMemoryTopicRepository();
    await topics.save(Topic.create('t-2', translations('SaaS', 'SaaS BR'), 1, now));
    await topics.save(Topic.create('t-1', translations('AI', 'IA'), 0, now));
    const counts: Record<string, number> = { 't-1': 3 };
    return new ListTopics(new InMemoryTopicQueries(topics, (id) => counts[id] ?? 0));
  }

  it('returns topics ordered by position, in the requested locale, with product counts', async () => {
    const result = await (await setup()).execute({ locale: 'pt-BR' });

    expect(result).toEqual([
      { id: 't-1', slug: 'ai', name: 'IA', description: null, position: 0, productCount: 3 },
      { id: 't-2', slug: 'saas', name: 'SaaS BR', description: null, position: 1, productCount: 0 },
    ]);
  });

  it('uses the English texts for the en locale', async () => {
    const [first] = await (await setup()).execute({ locale: 'en' });

    expect(first).toMatchObject({ name: 'AI', description: 'AI description' });
  });
});
