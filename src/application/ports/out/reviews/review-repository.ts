import { Review } from '../../../../domain/entities/review';

export interface ReviewRepository {
  findByProductId(productId: string): Promise<Review | null>;
  save(review: Review): Promise<void>;
  delete(id: string): Promise<void>;
}
