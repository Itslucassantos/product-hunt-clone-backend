import {
  ProductListFilter,
  ProductQueries,
} from '../../../../application/ports/out/products/product-queries';
import { CacheStore } from '../../../../application/ports/out/shared/cache-store';
import {
  AdminProductListItem,
  ProductDetail,
  ProductListItem,
} from '../../../../application/read-models/product-item';
import { Locale } from '../../../../domain/value-objects/locale';
import { CacheStats, cached } from './cached';

export interface ProductCacheTtl {
  list: number;
  detail: number;
}

export class CachedProductQueries implements ProductQueries {
  constructor(
    private readonly inner: ProductQueries,
    private readonly cache: CacheStore,
    private readonly ttl: ProductCacheTtl,
    private readonly stats?: CacheStats,
  ) {}

  async listPublic(filter: ProductListFilter, locale: Locale): Promise<ProductListItem[]> {
    const version = await this.cache.version('products');
    const key = [
      `products:v${version}:list`,
      filter.status,
      filter.topicSlug ?? 'all',
      filter.reviewed === undefined ? 'any' : String(filter.reviewed),
      locale,
    ].join(':');
    return cached(this.cache, this.stats, key, this.ttl.list, () =>
      this.inner.listPublic(filter, locale),
    );
  }

  async getById(id: string, locale: Locale): Promise<ProductDetail | null> {
    const detail = await cached(
      this.cache,
      this.stats,
      `product:${id}:${locale}`,
      this.ttl.detail,
      () => this.inner.getById(id, locale),
    );
    return detail ? { ...detail, createdAt: new Date(detail.createdAt) } : null;
  }

  listForAdmin(locale: Locale): Promise<AdminProductListItem[]> {
    return this.inner.listForAdmin(locale);
  }
}
