import { Actor } from '../shared/actor';

export interface RemoveProductReviewInput {
  actor: Actor;
  productId: string;
}

export interface RemoveProductReviewUseCase {
  execute(input: RemoveProductReviewInput): Promise<void>;
}
