import { Product } from '../../../../../domain/entities/product';
import { Upvotes } from '../../../../../domain/value-objects/upvotes';
import { ProductRepository } from '../../../../../application/ports/out/products/product-repository';

const copy = (product: Product): Product =>
  Product.restore(
    product.id,
    product.title,
    product.description,
    product.longDescription,
    product.url,
    product.imageUrl,
    product.status,
    Upvotes.of(product.upvotes),
    product.topicIds,
    product.createdAt,
    product.updatedAt,
  );

const normalize = (value: string): string => value.trim().toLowerCase();

export class InMemoryProductRepository implements ProductRepository {
  private readonly byId = new Map<string, Product>();

  async findById(id: string): Promise<Product | null> {
    const product = this.byId.get(id);
    return product ? copy(product) : null;
  }

  async save(product: Product): Promise<void> {
    this.byId.set(product.id, copy(product));
    product.clearPendingUpvoteDelta();
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async existsByTitle(title: string, excludeId?: string): Promise<boolean> {
    const wanted = normalize(title);
    return [...this.byId.values()].some(
      (product) => product.id !== excludeId && normalize(product.title) === wanted,
    );
  }

  countByTopicId(topicId: string): number {
    return [...this.byId.values()].filter((product) => product.topicIds.includes(topicId)).length;
  }

  async findAll(): Promise<Product[]> {
    return [...this.byId.values()].map(copy);
  }
}
