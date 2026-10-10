import { DomainError } from './domain-error';

export class UnauthenticatedError extends DomainError {
  constructor() {
    super('UNAUTHENTICATED', 'Missing or invalid credentials');
  }
}
