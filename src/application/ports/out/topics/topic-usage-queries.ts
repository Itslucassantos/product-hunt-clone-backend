import { BlockingProduct } from '../../../../domain/errors/topic-in-use-error';

export interface TopicUsageQueries {
  findProductsOnlyInTopic(
    topicId: string,
    limit: number,
  ): Promise<{ items: BlockingProduct[]; total: number }>;
}
