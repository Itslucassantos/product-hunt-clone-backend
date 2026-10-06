import { TopicInUseError } from '../../../domain/errors/topic-in-use-error';
import { TopicNotFoundError } from '../../../domain/errors/topic-not-found-error';
import { requireAdmin } from '../../policies/require-admin';
import { DeleteTopicInput, DeleteTopicUseCase } from '../../ports/in/delete-topic';
import { CacheStore } from '../../ports/out/cache-store';
import { Clock } from '../../ports/out/clock';
import { TopicRepository } from '../../ports/out/topic-repository';
import { TopicUsageQueries } from '../../ports/out/topic-usage-queries';
import { UnitOfWork } from '../../ports/out/unit-of-work';

const MAX_BLOCKING_PRODUCTS_REPORTED = 5;

export class DeleteTopic implements DeleteTopicUseCase {
  constructor(
    private readonly topics: TopicRepository,
    private readonly usage: TopicUsageQueries,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: DeleteTopicInput): Promise<void> {
    requireAdmin(input.actor);

    await this.uow.run(async () => {
      const topic = await this.topics.findById(input.topicId);
      if (!topic) throw new TopicNotFoundError(input.topicId);

      const blocking = await this.usage.findProductsOnlyInTopic(
        topic.id,
        MAX_BLOCKING_PRODUCTS_REPORTED,
      );
      if (blocking.total > 0) throw new TopicInUseError(topic.id, blocking.items, blocking.total);

      await this.topics.delete(topic.id);
      await this.compactPositions();
    });

    await this.cache.bumpVersion('topics');
    await this.cache.bumpVersion('products');
  }

  private async compactPositions(): Promise<void> {
    const now = this.clock.now();
    const changed = (await this.topics.findAll()).filter((topic, index) => {
      if (topic.position === index) return false;
      topic.moveTo(index, now);
      return true;
    });
    if (changed.length) await this.topics.saveAll(changed);
  }
}
