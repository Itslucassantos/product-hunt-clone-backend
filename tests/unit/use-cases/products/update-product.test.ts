import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateProduct } from '../../../../src/application/use-cases/products/update-product';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { ProductNotFoundError } from '../../../../src/domain/errors/product-not-found-error';
import { TopicNotFoundError } from '../../../../src/domain/errors/topic-not-found-error';
import { buildProductWorld, productInput } from '../../../helpers/products';
import { admin, regularUser } from '../../../helpers/topics';

describe('UpdateProduct', () => {
  let world: Awaited<ReturnType<typeof buildProductWorld>>;
  let update: UpdateProduct;

  beforeEach(async () => {
    world = await buildProductWorld();
    await world.createProduct.execute({
      ...productInput('Lumen'),
      longDescription: 'Long',
      imageUrl: 'https://example.com/a.png',
    });
    update = new UpdateProduct(world.products, world.topics, world.uow, world.clock, world.cache);
  });

  it('changes only the provided fields', async () => {
    await update.execute({ actor: admin, productId: 'p-1', title: 'Lumen 2' });

    const product = await world.products.findById('p-1');
    expect(product).toMatchObject({
      title: 'Lumen 2',
      description: 'Lumen description',
      longDescription: 'Long',
      imageUrl: 'https://example.com/a.png',
    });
  });

  it('clears nullable fields when null is sent', async () => {
    await update.execute({ actor: admin, productId: 'p-1', longDescription: null, imageUrl: null });

    const product = await world.products.findById('p-1');
    expect(product?.longDescription).toBeNull();
    expect(product?.imageUrl).toBeNull();
  });

  it('switches the status in both directions', async () => {
    await update.execute({ actor: admin, productId: 'p-1', status: 'COMING_SOON' });
    expect((await world.products.findById('p-1'))?.status).toBe('COMING_SOON');

    await update.execute({ actor: admin, productId: 'p-1', status: 'PUBLISHED' });
    expect((await world.products.findById('p-1'))?.status).toBe('PUBLISHED');
  });

  it('replaces the topics', async () => {
    await update.execute({ actor: admin, productId: 'p-1', topicIds: ['t-2'] });

    expect((await world.products.findById('p-1'))?.topicIds).toEqual(['t-2']);
  });

  it('rejects unknown topics without changing the product', async () => {
    await expect(
      update.execute({ actor: admin, productId: 'p-1', topicIds: ['nope'] }),
    ).rejects.toBeInstanceOf(TopicNotFoundError);
    expect((await world.products.findById('p-1'))?.topicIds).toEqual(['t-1']);
  });

  it('invalidates list caches and the product detail', async () => {
    await world.cache.set('product:p-1:en', 'cached', 60);

    await update.execute({ actor: admin, productId: 'p-1', title: 'Lumen 2' });

    expect(await world.cache.version('products')).toBe(2);
    expect(await world.cache.version('topics')).toBe(2);
    expect(await world.cache.get('product:p-1:en')).toBeNull();
  });

  it('rejects non-admin actors', async () => {
    await expect(
      update.execute({ actor: regularUser, productId: 'p-1', title: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects an unknown product', async () => {
    await expect(
      update.execute({ actor: admin, productId: 'nope', title: 'x' }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
