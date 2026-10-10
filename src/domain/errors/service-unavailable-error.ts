import { DomainError } from './domain-error';

export class ServiceUnavailableError extends DomainError {
  constructor(details?: unknown) {
    super('SERVICE_UNAVAILABLE', 'Service unavailable', details);
  }
}
