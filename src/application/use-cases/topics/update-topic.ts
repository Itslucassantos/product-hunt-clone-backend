import { TopicNotFoundError } from '../../../domain/errors/topic-not-found-error';
import { requireAdmin } from '../../policies/require-admin';
import { UpdateTopicInput, UpdateTopicUseCase } from '../../ports/in/topics/update-topic';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { Clock } from '../../ports/out/shared/clock';
import { TopicRepository } from '../../ports/out/topics/topic-repository';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';
import { assertTopicNamesAvailable } from './assert-topic-names-available';

export class UpdateTopic implements UpdateTopicUseCase {
  constructor(
    private readonly topics: TopicRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: UpdateTopicInput): Promise<void> {
    requireAdmin(input.actor);

    await this.uow.run(async () => {
      const topic = await this.topics.findById(input.topicId);
      if (!topic) throw new TopicNotFoundError(input.topicId);

      topic.rename(input.translations, this.clock.now());
      await assertTopicNamesAvailable(this.topics, topic.translations, topic.id);
      await this.topics.save(topic);
    });

    await this.cache.bumpVersion('topics');
    await this.cache.bumpVersion('products');
  }
}
