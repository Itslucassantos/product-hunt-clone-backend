import { ProductNotFoundError } from '../../../domain/errors/product-not-found-error';
import { requireAdmin } from '../../policies/require-admin';
import { DeleteProductInput, DeleteProductUseCase } from '../../ports/in/products/delete-product';
import { ProductRepository } from '../../ports/out/products/product-repository';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';

export class DeleteProduct implements DeleteProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly uow: UnitOfWork,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: DeleteProductInput): Promise<void> {
    requireAdmin(input.actor);

    await this.uow.run(async () => {
      const product = await this.products.findById(input.productId);
      if (!product) throw new ProductNotFoundError(input.productId);
      await this.products.delete(product.id);
    });

    await this.cache.bumpVersion('products');
    await this.cache.bumpVersion('topics');
    await this.cache.del(`product:${input.productId}:en`, `product:${input.productId}:pt-BR`);
  }
}
