import { DomainError } from './domain-error';

export class TopicAlreadyExistsError extends DomainError {
  constructor(field: string) {
    super('TOPIC_ALREADY_EXISTS', 'A topic with this name already exists', {
      field,
      code: 'ALREADY_EXISTS',
    });
  }
}
