import { CacheStore } from '../../../../application/ports/out/shared/cache-store';

export class NoopCacheStore implements CacheStore {
  async get<T>(): Promise<T | null> {
    return null;
  }

  async set(): Promise<void> {}

  async del(): Promise<void> {}

  getOrLoad<T>(_key: string, _ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    return loader();
  }

  async version(): Promise<number> {
    return 1;
  }

  async bumpVersion(): Promise<void> {}
}
