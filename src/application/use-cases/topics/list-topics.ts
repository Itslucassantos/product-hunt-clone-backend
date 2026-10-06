import { ListTopicsInput, ListTopicsUseCase } from '../../ports/in/list-topics';
import { TopicQueries } from '../../ports/out/topic-queries';
import { TopicItem } from '../../read-models/topic-item';

export class ListTopics implements ListTopicsUseCase {
  constructor(private readonly queries: TopicQueries) {}

  execute(input: ListTopicsInput): Promise<TopicItem[]> {
    return this.queries.list(input.locale);
  }
}
