import { Locale } from '../../../../domain/value-objects/locale';
import { TopicItem } from '../../../read-models/topic-item';

export interface ListTopicsInput {
  locale: Locale;
}

export interface ListTopicsUseCase {
  execute(input: ListTopicsInput): Promise<TopicItem[]>;
}
