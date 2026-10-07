import { ListTopicsInput, ListTopicsUseCase } from '../../ports/in/topics/list-topics';
import { TopicQueries } from '../../ports/out/topics/topic-queries';
import { TopicItem } from '../../read-models/topic-item';

export class ListTopics implements ListTopicsUseCase {
  constructor(private readonly queries: TopicQueries) {}

  execute(input: ListTopicsInput): Promise<TopicItem[]> {
    return this.queries.list(input.locale);
  }
}
