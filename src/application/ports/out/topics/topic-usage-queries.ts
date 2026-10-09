import { BlockingProduct } from '../../../../domain/errors/topic-in-use-error';

export interface TopicUsageQueries {
  findProductsByTopic(
    topicId: string,
    limit: number,
  ): Promise<{ items: BlockingProduct[]; total: number }>;
}
