import { Locale } from '../../../domain/value-objects/locale';
import { TopicItem } from '../../read-models/topic-item';

export interface TopicQueries {
  list(locale: Locale): Promise<TopicItem[]>;
}
