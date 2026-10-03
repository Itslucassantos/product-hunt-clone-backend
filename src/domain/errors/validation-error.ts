import { DomainError } from './domain-error';

export interface FieldError {
  field: string;
  code: string;
}

export class ValidationError extends DomainError {
  constructor(readonly fieldErrors: FieldError[]) {
    super('VALIDATION_ERROR', 'Request validation failed', fieldErrors);
  }
}
