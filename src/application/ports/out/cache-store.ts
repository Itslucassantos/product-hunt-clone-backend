export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T>;
  version(namespace: string): Promise<number>;
  bumpVersion(namespace: string): Promise<void>;
}
