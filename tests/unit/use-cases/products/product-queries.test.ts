import { beforeEach, describe, expect, it } from 'vitest';
import { GetProduct } from '../../../../src/application/use-cases/products/get-product';
import { ListAdminProducts } from '../../../../src/application/use-cases/products/list-admin-products';
import { ListProducts } from '../../../../src/application/use-cases/products/list-products';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { ProductNotFoundError } from '../../../../src/domain/errors/product-not-found-error';
import { buildProductWorld, productInput } from '../../../helpers/products';
import { admin, regularUser } from '../../../helpers/topics';

describe('product queries', () => {
  let world: Awaited<ReturnType<typeof buildProductWorld>>;
  let list: ListProducts;
  let get: GetProduct;
  let listAdmin: ListAdminProducts;

  const vote = async (id: string, times: number) => {
    const product = await world.products.findById(id);
    for (let i = 0; i < times; i++) product?.addUpvote();
    if (product) await world.products.save(product);
  };

  beforeEach(async () => {
    world = await buildProductWorld();
    const create = world.createProduct;
    await create.execute(productInput('Alpha', ['t-1']));
    world.clock.set(new Date('2026-02-01T00:00:00Z'));
    await create.execute(productInput('Beta', ['t-2']));
    world.clock.set(new Date('2026-03-01T00:00:00Z'));
    await create.execute({ ...productInput('Gamma', ['t-1', 't-2']), status: 'COMING_SOON' });
    world.clock.set(new Date('2026-04-01T00:00:00Z'));
    await create.execute({ ...productInput('Delta', ['t-1']), status: 'COMING_SOON' });
    await vote('p-1', 1);
    await vote('p-2', 5);
    await world.saveReview.execute({ actor: admin, productId: 'p-1', rating: 4, summary: 'Nice' });
    list = new ListProducts(world.queries);
    get = new GetProduct(world.queries);
    listAdmin = new ListAdminProducts(world.queries);
  });

  it('lists published products by upvotes desc by default', async () => {
    const items = await list.execute({ locale: 'en' });

    expect(items.map((p) => p.title)).toEqual(['Beta', 'Alpha']);
    expect(items[0]).toMatchObject({ upvotes: 5, status: 'PUBLISHED', review: null });
  });

  it('breaks upvote ties by newest first', async () => {
    await vote('p-1', 4);

    const items = await list.execute({ locale: 'en' });

    expect(items.map((p) => p.title)).toEqual(['Beta', 'Alpha']);
    await vote('p-1', 1);
    expect((await list.execute({ locale: 'en' })).map((p) => p.title)).toEqual(['Alpha', 'Beta']);
  });

  it('lists coming soon products newest first', async () => {
    const items = await list.execute({ locale: 'en', status: 'COMING_SOON' });

    expect(items.map((p) => p.title)).toEqual(['Delta', 'Gamma']);
  });

  it('filters by topic slug', async () => {
    const items = await list.execute({ locale: 'en', topicSlug: 'saas' });

    expect(items.map((p) => p.title)).toEqual(['Beta']);
  });

  it('returns an empty list for an unknown topic slug', async () => {
    expect(await list.execute({ locale: 'en', topicSlug: 'nope' })).toEqual([]);
  });

  it('filters by reviewed', async () => {
    const reviewed = await list.execute({ locale: 'en', reviewed: true });
    const notReviewed = await list.execute({ locale: 'en', reviewed: false });

    expect(reviewed.map((p) => p.title)).toEqual(['Alpha']);
    expect(reviewed[0]?.review).toEqual({ rating: 4 });
    expect(notReviewed.map((p) => p.title)).toEqual(['Beta']);
  });

  it('returns topic names in the requested locale', async () => {
    const [alpha] = await list.execute({ locale: 'pt-BR', topicSlug: 'ai' });

    expect(alpha?.topics).toEqual([{ id: 't-1', name: 'IA', slug: 'ai' }]);
  });

  it('returns the product detail with long description and review summary', async () => {
    const detail = await get.execute({ productId: 'p-1', locale: 'en' });

    expect(detail).toMatchObject({
      id: 'p-1',
      title: 'Alpha',
      longDescription: null,
      review: { rating: 4, summary: 'Nice' },
    });
    expect(detail.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('fails to get an unknown product', async () => {
    await expect(get.execute({ productId: 'nope', locale: 'en' })).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('lists every status for the admin, newest first', async () => {
    const items = await listAdmin.execute({ actor: admin, locale: 'en' });

    expect(items.map((p) => p.title)).toEqual(['Delta', 'Gamma', 'Beta', 'Alpha']);
    expect(items[3]).toMatchObject({ review: { rating: 4 }, upvotes: 1 });
  });

  it('rejects non-admin actors on the admin list', async () => {
    await expect(listAdmin.execute({ actor: regularUser, locale: 'en' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
