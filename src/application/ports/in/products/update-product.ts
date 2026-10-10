import { ProductStatus } from '../../../../domain/value-objects/product-status';
import { Actor } from '../shared/actor';

export interface UpdateProductInput {
  actor: Actor;
  productId: string;
  title?: string;
  description?: string;
  longDescription?: string | null;
  url?: string;
  imageUrl?: string | null;
  status?: ProductStatus;
  topicIds?: string[];
}

export interface UpdateProductUseCase {
  execute(input: UpdateProductInput): Promise<void>;
}
