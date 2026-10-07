import { Actor } from '../shared/actor';

export interface DeleteProductInput {
  actor: Actor;
  productId: string;
}

export interface DeleteProductUseCase {
  execute(input: DeleteProductInput): Promise<void>;
}
