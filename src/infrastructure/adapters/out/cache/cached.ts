import { CacheStore } from '../../../../application/ports/out/shared/cache-store';

export interface CacheStats {
  record(hit: boolean): void;
}

export async function cached<T>(
  cache: CacheStore,
  stats: CacheStats | undefined,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  let loaded = false;
  const value = await cache.getOrLoad(key, ttlSeconds, () => {
    loaded = true;
    return loader();
  });
  stats?.record(!loaded);
  return value;
}
