import { Actor } from '../shared/actor';

export interface SaveProductReviewInput {
  actor: Actor;
  productId: string;
  rating: number;
  summary: string;
}

export interface SaveProductReviewUseCase {
  execute(input: SaveProductReviewInput): Promise<void>;
}
