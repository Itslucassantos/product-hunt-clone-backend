import { ProductNotFoundError } from '../../../domain/errors/product-not-found-error';
import { ReviewNotFoundError } from '../../../domain/errors/review-not-found-error';
import { requireAdmin } from '../../policies/require-admin';
import {
  RemoveProductReviewInput,
  RemoveProductReviewUseCase,
} from '../../ports/in/products/remove-product-review';
import { ProductRepository } from '../../ports/out/products/product-repository';
import { ReviewRepository } from '../../ports/out/reviews/review-repository';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';

export class RemoveProductReview implements RemoveProductReviewUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly reviews: ReviewRepository,
    private readonly uow: UnitOfWork,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: RemoveProductReviewInput): Promise<void> {
    requireAdmin(input.actor);

    await this.uow.run(async () => {
      const product = await this.products.findById(input.productId);
      if (!product) throw new ProductNotFoundError(input.productId);

      const review = await this.reviews.findByProductId(product.id);
      if (!review) throw new ReviewNotFoundError(product.id);
      await this.reviews.delete(review.id);
    });

    await this.cache.bumpVersion('products');
    await this.cache.del(`product:${input.productId}:en`, `product:${input.productId}:pt-BR`);
  }
}
