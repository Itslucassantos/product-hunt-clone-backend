import { DomainError } from './domain-error';

export class TopicNotFoundError extends DomainError {
  constructor(topicId: string) {
    super('TOPIC_NOT_FOUND', `Topic ${topicId} not found`, { topicId });
  }
}
