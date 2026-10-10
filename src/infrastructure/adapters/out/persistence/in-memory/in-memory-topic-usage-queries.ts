import { TopicUsageQueries } from '../../../../../application/ports/out/topics/topic-usage-queries';
import { InMemoryProductRepository } from './in-memory-product-repository';

export class InMemoryTopicUsageQueries implements TopicUsageQueries {
  constructor(private readonly products: InMemoryProductRepository) {}

  async findProductsByTopic(topicId: string, limit: number) {
    const blocking = (await this.products.findAll())
      .filter((product) => product.hasTopic(topicId))
      .map((product) => ({ productId: product.id, title: product.title }));
    return { items: blocking.slice(0, limit), total: blocking.length };
  }
}
