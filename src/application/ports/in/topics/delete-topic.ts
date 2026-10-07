import { Actor } from '../shared/actor';

export interface DeleteTopicInput {
  actor: Actor;
  topicId: string;
}

export interface DeleteTopicUseCase {
  execute(input: DeleteTopicInput): Promise<void>;
}
