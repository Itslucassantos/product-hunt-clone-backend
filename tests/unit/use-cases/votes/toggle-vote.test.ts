import { beforeEach, describe, expect, it } from 'vitest';
import { ToggleVote } from '../../../../src/application/use-cases/votes/toggle-vote';
import { Product } from '../../../../src/domain/entities/product';
import { ProductNotFoundError } from '../../../../src/domain/errors/product-not-found-error';
import { ProductNotVotableError } from '../../../../src/domain/errors/product-not-votable-error';
import { InMemoryCacheStore } from '../../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { InMemoryProductRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-product-repository';
import { InMemoryUnitOfWork } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-unit-of-work';
import { InMemoryVoteRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-vote-repository';
import { FakeClock, FakeIdGenerator } from '../../../helpers/fakes';

const now = new Date('2026-01-01T00:00:00Z');

const product = (id: string, status: 'PUBLISHED' | 'COMING_SOON') =>
  Product.create(
    id,
    'Title',
    'Description',
    null,
    'https://example.com',
    null,
    status,
    ['t1'],
    now,
  );

describe('ToggleVote', () => {
  let products: InMemoryProductRepository;
  let votes: InMemoryVoteRepository;
  let cache: InMemoryCacheStore;
  let toggle: ToggleVote;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    votes = new InMemoryVoteRepository();
    cache = new InMemoryCacheStore();
    await products.save(product('p-1', 'PUBLISHED'));
    await products.save(product('p-2', 'COMING_SOON'));
    toggle = new ToggleVote(
      products,
      votes,
      new InMemoryUnitOfWork(),
      new FakeIdGenerator('v'),
      new FakeClock(),
      cache,
    );
  });

  it('registers a vote and increments upvotes', async () => {
    const output = await toggle.execute({ userId: 'u-1', productId: 'p-1' });

    expect(output).toEqual({ upvotes: 1, voted: true });
    expect((await products.findById('p-1'))?.upvotes).toBe(1);
    expect(await votes.findByUserAndProduct('u-1', 'p-1')).not.toBeNull();
  });

  it('removes the vote when toggled again', async () => {
    await toggle.execute({ userId: 'u-1', productId: 'p-1' });

    const output = await toggle.execute({ userId: 'u-1', productId: 'p-1' });

    expect(output).toEqual({ upvotes: 0, voted: false });
    expect(await votes.findByUserAndProduct('u-1', 'p-1')).toBeNull();
  });

  it('counts votes from different users independently', async () => {
    await toggle.execute({ userId: 'u-1', productId: 'p-1' });
    const output = await toggle.execute({ userId: 'u-2', productId: 'p-1' });

    expect(output.upvotes).toBe(2);
  });

  it('invalidates only the product detail cache', async () => {
    await cache.set('product:p-1:en', 'cached', 60);
    await cache.set('product:p-1:pt-BR', 'cached', 60);

    await toggle.execute({ userId: 'u-1', productId: 'p-1' });

    expect(await cache.get('product:p-1:en')).toBeNull();
    expect(await cache.get('product:p-1:pt-BR')).toBeNull();
    expect(await cache.version('products')).toBe(1);
  });

  it('rejects an unknown product', async () => {
    await expect(toggle.execute({ userId: 'u-1', productId: 'nope' })).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('rejects voting on a product that is not published', async () => {
    await expect(toggle.execute({ userId: 'u-1', productId: 'p-2' })).rejects.toBeInstanceOf(
      ProductNotVotableError,
    );
  });

  it('still lets the user remove a vote after the product became coming soon', async () => {
    await toggle.execute({ userId: 'u-1', productId: 'p-1' });
    const stored = await products.findById('p-1');
    stored?.markAsComingSoon(now);
    if (stored) await products.save(stored);

    const output = await toggle.execute({ userId: 'u-1', productId: 'p-1' });

    expect(output).toEqual({ upvotes: 0, voted: false });
  });
});
