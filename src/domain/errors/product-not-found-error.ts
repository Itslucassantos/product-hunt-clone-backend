import { DomainError } from './domain-error';

export class ProductNotFoundError extends DomainError {
  constructor(productId: string) {
    super('PRODUCT_NOT_FOUND', `Product ${productId} not found`, { productId });
  }
}
