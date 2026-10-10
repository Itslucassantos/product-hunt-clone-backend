import { InvalidTopicOrderError } from '../../../domain/errors/invalid-topic-order-error';
import { requireAdmin } from '../../policies/require-admin';
import { ReorderTopicsInput, ReorderTopicsUseCase } from '../../ports/in/topics/reorder-topics';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { Clock } from '../../ports/out/shared/clock';
import { TopicRepository } from '../../ports/out/topics/topic-repository';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';

export class ReorderTopics implements ReorderTopicsUseCase {
  constructor(
    private readonly topics: TopicRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: ReorderTopicsInput): Promise<void> {
    requireAdmin(input.actor);

    await this.uow.run(async () => {
      const existing = new Map((await this.topics.findAll()).map((topic) => [topic.id, topic]));

      const sameSize = input.ids.length === existing.size;
      if (!sameSize || new Set(input.ids).size !== existing.size)
        throw new InvalidTopicOrderError();
      if (input.ids.some((id) => !existing.has(id))) throw new InvalidTopicOrderError();

      const now = this.clock.now();
      const changed = input.ids.flatMap((id, index) => {
        const topic = existing.get(id)!;
        if (topic.position === index) return [];
        topic.moveTo(index, now);
        return [topic];
      });
      if (changed.length) await this.topics.saveAll(changed);
    });

    await this.cache.bumpVersion('topics');
  }
}
