import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteProduct } from '../../../../src/application/use-cases/products/delete-product';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { ProductNotFoundError } from '../../../../src/domain/errors/product-not-found-error';
import { buildProductWorld, productInput } from '../../../helpers/products';
import { admin, regularUser } from '../../../helpers/topics';

describe('DeleteProduct', () => {
  let world: Awaited<ReturnType<typeof buildProductWorld>>;
  let remove: DeleteProduct;

  beforeEach(async () => {
    world = await buildProductWorld();
    await world.createProduct.execute(productInput('Lumen'));
    remove = new DeleteProduct(world.products, world.uow, world.cache);
  });

  it('removes the product', async () => {
    await remove.execute({ actor: admin, productId: 'p-1' });

    expect(await world.products.findById('p-1')).toBeNull();
  });

  it('invalidates list caches and the product detail', async () => {
    await world.cache.set('product:p-1:pt-BR', 'cached', 60);

    await remove.execute({ actor: admin, productId: 'p-1' });

    expect(await world.cache.version('products')).toBe(2);
    expect(await world.cache.version('topics')).toBe(2);
    expect(await world.cache.get('product:p-1:pt-BR')).toBeNull();
  });

  it('rejects non-admin actors', async () => {
    await expect(remove.execute({ actor: regularUser, productId: 'p-1' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejects an unknown product', async () => {
    await expect(remove.execute({ actor: admin, productId: 'nope' })).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });
});
