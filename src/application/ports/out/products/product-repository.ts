import { Product } from '../../../../domain/entities/product';

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  save(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
  existsByTitle(title: string, excludeId?: string): Promise<boolean>;
}
