import { Locale } from '../../../../../domain/value-objects/locale';
import { TopicQueries } from '../../../../../application/ports/out/topics/topic-queries';
import { TopicRepository } from '../../../../../application/ports/out/topics/topic-repository';
import { TopicItem } from '../../../../../application/read-models/topic-item';

export class InMemoryTopicQueries implements TopicQueries {
  constructor(
    private readonly topics: TopicRepository,
    private readonly countProducts: (topicId: string) => number = () => 0,
  ) {}

  async list(locale: Locale): Promise<TopicItem[]> {
    return (await this.topics.findAll()).map((topic) => ({
      id: topic.id,
      slug: topic.slug.value,
      name: topic.nameIn(locale),
      description: topic.translations[locale].description,
      position: topic.position,
      productCount: this.countProducts(topic.id),
    }));
  }
}
