import { Actor } from '../shared/actor';

export interface ReorderTopicsInput {
  actor: Actor;
  ids: string[];
}

export interface ReorderTopicsUseCase {
  execute(input: ReorderTopicsInput): Promise<void>;
}
