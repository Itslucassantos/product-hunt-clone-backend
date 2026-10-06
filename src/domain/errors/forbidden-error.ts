import { DomainError } from './domain-error';

export class ForbiddenError extends DomainError {
  constructor() {
    super('FORBIDDEN', 'Admin role required');
  }
}
