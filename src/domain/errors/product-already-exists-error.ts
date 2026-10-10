import { DomainError } from './domain-error';

export class ProductAlreadyExistsError extends DomainError {
  constructor() {
    super('PRODUCT_ALREADY_EXISTS', 'A product with this title already exists', {
      field: 'title',
      code: 'ALREADY_EXISTS',
    });
  }
}
