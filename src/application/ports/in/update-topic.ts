import { TopicTranslations } from '../../../domain/entities/topic';
import { Actor } from './actor';

export interface UpdateTopicInput {
  actor: Actor;
  topicId: string;
  translations: TopicTranslations;
}

export interface UpdateTopicUseCase {
  execute(input: UpdateTopicInput): Promise<void>;
}
