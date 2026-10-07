import { TopicTranslations } from '../../../../domain/entities/topic';
import { Actor } from '../shared/actor';

export interface CreateTopicInput {
  actor: Actor;
  translations: TopicTranslations;
}

export interface CreateTopicOutput {
  id: string;
}

export interface CreateTopicUseCase {
  execute(input: CreateTopicInput): Promise<CreateTopicOutput>;
}
