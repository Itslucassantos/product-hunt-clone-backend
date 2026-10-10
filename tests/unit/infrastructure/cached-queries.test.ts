import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductQueries } from '../../../src/application/ports/out/products/product-queries';
import { TopicQueries } from '../../../src/application/ports/out/topics/topic-queries';
import { ProductDetail } from '../../../src/application/read-models/product-item';
import { CachedProductQueries } from '../../../src/infrastructure/adapters/out/cache/cached-product-queries';
import { CachedTopicQueries } from '../../../src/infrastructure/adapters/out/cache/cached-topic-queries';
import { InMemoryCacheStore } from '../../../src/infrastructure/adapters/out/cache/in-memory-cache-store';
import { NoopCacheStore } from '../../../src/infrastructure/adapters/out/cache/noop-cache-store';

const detail: ProductDetail = {
  id: 'p1',
  title: 'One',
  description: 'short',
  longDescription: null,
  url: 'https://example.com',
  imageUrl: null,
  status: 'PUBLISHED',
  upvotes: 1,
  topics: [],
  review: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const ttl = { list: 15, detail: 30 };

describe('CachedProductQueries', () => {
  let inner: ProductQueries;
  let cache: InMemoryCacheStore;
  let queries: CachedProductQueries;
  const stats = { record: vi.fn() };

  beforeEach(() => {
    stats.record.mockReset();
    inner = {
      listPublic: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(detail),
      listForAdmin: vi.fn().mockResolvedValue([]),
    };
    cache = new InMemoryCacheStore();
    queries = new CachedProductQueries(inner, cache, ttl, stats);
  });

  it('serves a repeated list from the cache and records hit and miss', async () => {
    await queries.listPublic({ status: 'PUBLISHED' }, 'en');
    await queries.listPublic({ status: 'PUBLISHED' }, 'en');

    expect(inner.listPublic).toHaveBeenCalledTimes(1);
    expect(stats.record.mock.calls).toEqual([[false], [true]]);
  });

  it('keeps separate entries per filter and locale', async () => {
    await queries.listPublic({ status: 'PUBLISHED' }, 'en');
    await queries.listPublic({ status: 'PUBLISHED' }, 'pt-BR');
    await queries.listPublic({ status: 'PUBLISHED', topicSlug: 'ai' }, 'en');
    await queries.listPublic({ status: 'PUBLISHED', reviewed: true }, 'en');
    await queries.listPublic({ status: 'COMING_SOON' }, 'en');

    expect(inner.listPublic).toHaveBeenCalledTimes(5);
  });

  it('reloads the list after the products version is bumped', async () => {
    await queries.listPublic({ status: 'PUBLISHED' }, 'en');
    await cache.bumpVersion('products');
    await queries.listPublic({ status: 'PUBLISHED' }, 'en');

    expect(inner.listPublic).toHaveBeenCalledTimes(2);
  });

  it('caches the detail and reloads it after the key is deleted', async () => {
    await queries.getById('p1', 'en');
    await queries.getById('p1', 'en');
    expect(inner.getById).toHaveBeenCalledTimes(1);

    await cache.del('product:p1:en');
    await queries.getById('p1', 'en');

    expect(inner.getById).toHaveBeenCalledTimes(2);
  });

  it('restores dates that went through JSON', async () => {
    const json = JSON.parse(JSON.stringify(detail));
    inner.getById = vi.fn().mockResolvedValue(json);

    const result = await queries.getById('p1', 'en');

    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns null for an unknown product', async () => {
    inner.getById = vi.fn().mockResolvedValue(null);

    expect(await queries.getById('missing', 'en')).toBeNull();
  });

  it('never caches the admin list', async () => {
    await queries.listForAdmin('en');
    await queries.listForAdmin('en');

    expect(inner.listForAdmin).toHaveBeenCalledTimes(2);
  });

  it('behaves as a pass-through with the noop store', async () => {
    const passthrough = new CachedProductQueries(inner, new NoopCacheStore(), ttl);

    await passthrough.listPublic({ status: 'PUBLISHED' }, 'en');
    await passthrough.listPublic({ status: 'PUBLISHED' }, 'en');

    expect(inner.listPublic).toHaveBeenCalledTimes(2);
  });
});

describe('CachedTopicQueries', () => {
  it('caches per locale and reloads after the topics version is bumped', async () => {
    const inner: TopicQueries = { list: vi.fn().mockResolvedValue([]) };
    const cache = new InMemoryCacheStore();
    const queries = new CachedTopicQueries(inner, cache, 60);

    await queries.list('en');
    await queries.list('en');
    await queries.list('pt-BR');
    expect(inner.list).toHaveBeenCalledTimes(2);

    await cache.bumpVersion('topics');
    await queries.list('en');

    expect(inner.list).toHaveBeenCalledTimes(3);
  });
});
