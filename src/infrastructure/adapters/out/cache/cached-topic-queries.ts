import { CacheStore } from '../../../../application/ports/out/shared/cache-store';
import { TopicQueries } from '../../../../application/ports/out/topics/topic-queries';
import { TopicItem } from '../../../../application/read-models/topic-item';
import { Locale } from '../../../../domain/value-objects/locale';
import { CacheStats, cached } from './cached';

export class CachedTopicQueries implements TopicQueries {
  constructor(
    private readonly inner: TopicQueries,
    private readonly cache: CacheStore,
    private readonly ttlSeconds: number,
    private readonly stats?: CacheStats,
  ) {}

  async list(locale: Locale): Promise<TopicItem[]> {
    const version = await this.cache.version('topics');
    return cached(this.cache, this.stats, `topics:v${version}:${locale}`, this.ttlSeconds, () =>
      this.inner.list(locale),
    );
  }
}
