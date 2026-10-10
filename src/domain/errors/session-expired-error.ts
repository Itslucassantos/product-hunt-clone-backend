import { DomainError } from './domain-error';

export class SessionExpiredError extends DomainError {
  constructor() {
    super('SESSION_EXPIRED', 'Session expired');
  }
}
