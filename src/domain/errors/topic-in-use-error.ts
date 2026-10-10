import { DomainError } from './domain-error';

export interface BlockingProduct {
  productId: string;
  title: string;
}

export class TopicInUseError extends DomainError {
  constructor(topicId: string, blocking: BlockingProduct[], total: number) {
    super('TOPIC_IN_USE', `Topic ${topicId} is used by ${total} product(s)`, {
      products: blocking,
      total,
    });
  }
}
