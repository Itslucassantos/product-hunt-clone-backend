import { Topic } from '../../../domain/entities/topic';
import { TopicAlreadyExistsError } from '../../../domain/errors/topic-already-exists-error';
import { requireAdmin } from '../../policies/require-admin';
import {
  CreateTopicInput,
  CreateTopicOutput,
  CreateTopicUseCase,
} from '../../ports/in/create-topic';
import { CacheStore } from '../../ports/out/cache-store';
import { Clock } from '../../ports/out/clock';
import { IdGenerator } from '../../ports/out/id-generator';
import { TopicRepository } from '../../ports/out/topic-repository';
import { UnitOfWork } from '../../ports/out/unit-of-work';
import { assertTopicNamesAvailable } from './assert-topic-names-available';

export class CreateTopic implements CreateTopicUseCase {
  constructor(
    private readonly topics: TopicRepository,
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: CreateTopicInput): Promise<CreateTopicOutput> {
    requireAdmin(input.actor);

    const id = await this.uow.run(async () => {
      const position = (await this.topics.findAll()).length;
      const topic = Topic.create(this.ids.next(), input.translations, position, this.clock.now());

      await assertTopicNamesAvailable(this.topics, topic.translations);
      if (await this.topics.existsBySlug(topic.slug)) {
        throw new TopicAlreadyExistsError('translations.en.name');
      }

      await this.topics.save(topic);
      return topic.id;
    });

    await this.cache.bumpVersion('topics');
    return { id };
  }
}
