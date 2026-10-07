import { Review } from '../../../domain/entities/review';
import { ProductNotFoundError } from '../../../domain/errors/product-not-found-error';
import { requireAdmin } from '../../policies/require-admin';
import {
  SaveProductReviewInput,
  SaveProductReviewUseCase,
} from '../../ports/in/products/save-product-review';
import { ProductRepository } from '../../ports/out/products/product-repository';
import { ReviewRepository } from '../../ports/out/reviews/review-repository';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { Clock } from '../../ports/out/shared/clock';
import { IdGenerator } from '../../ports/out/shared/id-generator';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';

export class SaveProductReview implements SaveProductReviewUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly reviews: ReviewRepository,
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: SaveProductReviewInput): Promise<void> {
    requireAdmin(input.actor);

    await this.uow.run(async () => {
      const product = await this.products.findById(input.productId);
      if (!product) throw new ProductNotFoundError(input.productId);

      const now = this.clock.now();
      const existing = await this.reviews.findByProductId(product.id);
      if (existing) {
        existing.update(input.rating, input.summary, now);
        await this.reviews.save(existing);
      } else {
        await this.reviews.save(
          Review.create(this.ids.next(), product.id, input.rating, input.summary, now),
        );
      }
    });

    await this.cache.bumpVersion('products');
    await this.cache.del(`product:${input.productId}:en`, `product:${input.productId}:pt-BR`);
  }
}
