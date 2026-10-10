import { beforeEach, describe, expect, it } from 'vitest';
import { CreateProduct } from '../../../../src/application/use-cases/products/create-product';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { TopicNotFoundError } from '../../../../src/domain/errors/topic-not-found-error';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { FakeIdGenerator } from '../../../helpers/fakes';
import { ProductAlreadyExistsError } from '../../../../src/domain/errors/product-already-exists-error';
import { buildProductWorld, productInput } from '../../../helpers/products';
import { regularUser } from '../../../helpers/topics';

describe('CreateProduct', () => {
  let world: Awaited<ReturnType<typeof buildProductWorld>>;
  let create: CreateProduct;

  beforeEach(async () => {
    world = await buildProductWorld();
    create = new CreateProduct(
      world.products,
      world.topics,
      world.uow,
      new FakeIdGenerator('prod'),
      world.clock,
      world.cache,
    );
  });

  it('persists the product as PUBLISHED with zero upvotes by default', async () => {
    const { id } = await create.execute(productInput('Lumen'));

    const product = await world.products.findById(id);
    expect(product).toMatchObject({ title: 'Lumen', status: 'PUBLISHED', upvotes: 0 });
    expect(product?.topicIds).toEqual(['t-1']);
  });

  it('accepts COMING_SOON and several topics', async () => {
    const { id } = await create.execute({
      ...productInput('Soon', ['t-1', 't-2']),
      status: 'COMING_SOON',
    });

    const product = await world.products.findById(id);
    expect(product?.status).toBe('COMING_SOON');
    expect(product?.topicIds).toEqual(['t-1', 't-2']);
  });

  it('invalidates the products and topics caches', async () => {
    await create.execute(productInput('Lumen'));

    expect(await world.cache.version('products')).toBe(2);
    expect(await world.cache.version('topics')).toBe(2);
  });

  it('rejects a duplicate title ignoring case and surrounding spaces', async () => {
    await create.execute(productInput('Lumen'));

    const promise = create.execute(productInput('  lumen '));

    await expect(promise).rejects.toBeInstanceOf(ProductAlreadyExistsError);
    await expect(promise).rejects.toMatchObject({ code: 'PRODUCT_ALREADY_EXISTS' });
  });

  it('rejects non-admin actors', async () => {
    await expect(
      create.execute({ ...productInput('Lumen'), actor: regularUser }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects a product without topics', async () => {
    await expect(create.execute(productInput('Lumen', []))).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects unknown topics and stores nothing', async () => {
    await expect(create.execute(productInput('Lumen', ['t-1', 'nope']))).rejects.toBeInstanceOf(
      TopicNotFoundError,
    );
    expect(await world.products.findAll()).toEqual([]);
  });

  it('rejects invalid fields', async () => {
    await expect(
      create.execute({ ...productInput('Lumen'), url: 'not a url' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
