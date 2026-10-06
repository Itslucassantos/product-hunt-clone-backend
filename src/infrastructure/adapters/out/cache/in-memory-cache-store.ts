import { CacheStore } from '../../../../application/ports/out/cache-store';

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class InMemoryCacheStore implements CacheStore {
  private readonly entries = new Map<string, Entry>();
  private readonly versions = new Map<string, number>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key);
  }

  async getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await loader();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async version(namespace: string): Promise<number> {
    return this.versions.get(namespace) ?? 1;
  }

  async bumpVersion(namespace: string): Promise<void> {
    this.versions.set(namespace, (await this.version(namespace)) + 1);
  }
}
