import { Topic } from '../../../../../domain/entities/topic';
import { Locale } from '../../../../../domain/value-objects/locale';
import { Slug } from '../../../../../domain/value-objects/slug';
import { TopicRepository } from '../../../../../application/ports/out/topics/topic-repository';

const normalize = (name: string) => name.trim().toLowerCase();

const copy = (topic: Topic): Topic =>
  Topic.restore(
    topic.id,
    topic.slug,
    topic.position,
    topic.translations,
    topic.createdAt,
    topic.updatedAt,
  );

export class InMemoryTopicRepository implements TopicRepository {
  private readonly byId = new Map<string, Topic>();

  async findById(id: string): Promise<Topic | null> {
    const topic = this.byId.get(id);
    return topic ? copy(topic) : null;
  }

  async findAll(): Promise<Topic[]> {
    return [...this.byId.values()].sort((a, b) => a.position - b.position).map(copy);
  }

  async findByIds(ids: string[]): Promise<Topic[]> {
    return ids.flatMap((id) => {
      const topic = this.byId.get(id);
      return topic ? [copy(topic)] : [];
    });
  }

  async save(topic: Topic): Promise<void> {
    this.byId.set(topic.id, copy(topic));
  }

  async saveAll(topics: Topic[]): Promise<void> {
    for (const topic of topics) await this.save(topic);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async existsByName(locale: Locale, name: string, excludeId?: string): Promise<boolean> {
    return [...this.byId.values()].some(
      (topic) =>
        topic.id !== excludeId && normalize(topic.translations[locale].name) === normalize(name),
    );
  }

  async existsBySlug(slug: Slug): Promise<boolean> {
    return [...this.byId.values()].some((topic) => topic.slug.equals(slug));
  }
}
