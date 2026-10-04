import { DomainError } from './domain-error';

export class ProductNotVotableError extends DomainError {
  constructor(productId: string) {
    super('PRODUCT_NOT_VOTABLE', `Product ${productId} is not votable`, { productId });
  }
}
