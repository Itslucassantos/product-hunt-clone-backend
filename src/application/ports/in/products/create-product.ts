import { ProductStatus } from '../../../../domain/value-objects/product-status';
import { Actor } from '../shared/actor';

export interface CreateProductInput {
  actor: Actor;
  title: string;
  description: string;
  longDescription?: string | null;
  url: string;
  imageUrl?: string | null;
  status?: ProductStatus;
  topicIds: string[];
}

export interface CreateProductOutput {
  id: string;
}

export interface CreateProductUseCase {
  execute(input: CreateProductInput): Promise<CreateProductOutput>;
}
