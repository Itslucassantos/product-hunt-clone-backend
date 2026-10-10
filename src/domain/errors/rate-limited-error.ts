import { DomainError } from './domain-error';

export class RateLimitedError extends DomainError {
  constructor(readonly retryAfterSeconds: number) {
    super('RATE_LIMITED', 'Too many requests', { retryAfterSeconds });
  }
}
