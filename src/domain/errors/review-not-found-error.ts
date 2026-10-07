import { DomainError } from './domain-error';

export class ReviewNotFoundError extends DomainError {
  constructor(productId: string) {
    super('REVIEW_NOT_FOUND', `Review of product ${productId} not found`, { productId });
  }
}
