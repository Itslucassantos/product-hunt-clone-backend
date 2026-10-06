import { DomainError } from './domain-error';

export class InvalidTopicOrderError extends DomainError {
  constructor() {
    super('INVALID_TOPIC_ORDER', 'Order must contain exactly the ids of all existing topics');
  }
}
