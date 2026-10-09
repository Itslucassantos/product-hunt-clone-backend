import { Review } from '../../../../../domain/entities/review';
import { Rating } from '../../../../../domain/value-objects/rating';
import { ReviewRepository } from '../../../../../application/ports/out/reviews/review-repository';
import { PrismaContext } from './prisma-context';

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly context: PrismaContext) {}

  async findByProductId(productId: string): Promise<Review | null> {
    const row = await this.context.client.review.findUnique({ where: { productId } });
    if (!row) return null;
    return Review.restore(
      row.id,
      row.productId,
      Rating.of(row.rating),
      row.summary,
      row.createdAt,
      row.updatedAt,
    );
  }

  async save(review: Review): Promise<void> {
    const data = { rating: review.rating, summary: review.summary, updatedAt: review.updatedAt };
    await this.context.client.review.upsert({
      where: { id: review.id },
      create: {
        id: review.id,
        productId: review.productId,
        ...data,
        createdAt: review.createdAt,
      },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.context.client.review.deleteMany({ where: { id } });
  }
}
