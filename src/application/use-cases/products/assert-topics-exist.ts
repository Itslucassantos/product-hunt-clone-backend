import { TopicNotFoundError } from '../../../domain/errors/topic-not-found-error';
import { TopicRepository } from '../../ports/out/topics/topic-repository';

export async function assertTopicsExist(
  topics: TopicRepository,
  topicIds: string[],
): Promise<void> {
  const unique = [...new Set(topicIds)];
  const found = new Set((await topics.findByIds(unique)).map((topic) => topic.id));
  const missing = unique.find((id) => !found.has(id));
  if (missing) throw new TopicNotFoundError(missing);
}
