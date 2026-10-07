import { Review } from '../../../../../domain/entities/review';
import { Rating } from '../../../../../domain/value-objects/rating';
import { ReviewRepository } from '../../../../../application/ports/out/reviews/review-repository';

const copy = (review: Review): Review =>
  Review.restore(
    review.id,
    review.productId,
    Rating.of(review.rating),
    review.summary,
    review.createdAt,
    review.updatedAt,
  );

export class InMemoryReviewRepository implements ReviewRepository {
  private readonly byId = new Map<string, Review>();

  async findByProductId(productId: string): Promise<Review | null> {
    const review = [...this.byId.values()].find((item) => item.productId === productId);
    return review ? copy(review) : null;
  }

  async save(review: Review): Promise<void> {
    this.byId.set(review.id, copy(review));
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }
}
