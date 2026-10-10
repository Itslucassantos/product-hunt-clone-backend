import { beforeEach, describe, expect, it } from 'vitest';
import { SaveProductReview } from '../../../../src/application/use-cases/products/save-product-review';
import { RemoveProductReview } from '../../../../src/application/use-cases/products/remove-product-review';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { ProductNotFoundError } from '../../../../src/domain/errors/product-not-found-error';
import { ReviewNotFoundError } from '../../../../src/domain/errors/review-not-found-error';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { FakeIdGenerator } from '../../../helpers/fakes';
import { buildProductWorld, productInput } from '../../../helpers/products';
import { admin, regularUser } from '../../../helpers/topics';

describe('SaveProductReview and RemoveProductReview', () => {
  let world: Awaited<ReturnType<typeof buildProductWorld>>;
  let saveReview: SaveProductReview;
  let removeReview: RemoveProductReview;

  beforeEach(async () => {
    world = await buildProductWorld();
    await world.createProduct.execute(productInput('Lumen'));
    saveReview = new SaveProductReview(
      world.products,
      world.reviews,
      world.uow,
      new FakeIdGenerator('r'),
      world.clock,
      world.cache,
    );
    removeReview = new RemoveProductReview(world.products, world.reviews, world.uow, world.cache);
  });

  it('creates a review', async () => {
    await saveReview.execute({
      actor: admin,
      productId: 'p-1',
      rating: 4,
      summary: ' Solid ',
    });

    expect(await world.reviews.findByProductId('p-1')).toMatchObject({
      rating: 4,
      summary: 'Solid',
    });
  });

  it('updates the existing review instead of creating a second one', async () => {
    const input = { actor: admin, productId: 'p-1', summary: 'Good' };
    await saveReview.execute({ ...input, rating: 3 });
    await saveReview.execute({ ...input, rating: 5 });

    const review = await world.reviews.findByProductId('p-1');
    expect(review).toMatchObject({ id: 'r-1', rating: 5 });
  });

  it('rejects invalid rating and empty summary', async () => {
    const input = { actor: admin, productId: 'p-1' };

    await expect(saveReview.execute({ ...input, rating: 6, summary: 'x' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(saveReview.execute({ ...input, rating: 3, summary: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects an unknown product and non-admin actors', async () => {
    await expect(
      saveReview.execute({ actor: admin, productId: 'nope', rating: 3, summary: 'x' }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    await expect(
      saveReview.execute({ actor: regularUser, productId: 'p-1', rating: 3, summary: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('invalidates the products cache when saving', async () => {
    await saveReview.execute({ actor: admin, productId: 'p-1', rating: 3, summary: 'x' });

    expect(await world.cache.version('products')).toBe(2);
  });

  it('removes the review', async () => {
    await saveReview.execute({ actor: admin, productId: 'p-1', rating: 3, summary: 'x' });

    await removeReview.execute({ actor: admin, productId: 'p-1' });

    expect(await world.reviews.findByProductId('p-1')).toBeNull();
  });

  it('fails to remove a review that does not exist', async () => {
    await expect(removeReview.execute({ actor: admin, productId: 'p-1' })).rejects.toBeInstanceOf(
      ReviewNotFoundError,
    );
    await expect(removeReview.execute({ actor: admin, productId: 'nope' })).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
    await expect(
      removeReview.execute({ actor: regularUser, productId: 'p-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
