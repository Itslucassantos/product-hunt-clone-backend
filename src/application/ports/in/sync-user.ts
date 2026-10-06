import { User } from '../../../domain/entities/user';

export type SyncUserInput =
  { type: 'upsert'; externalId: string } | { type: 'delete'; externalId: string };

export interface SyncUserUseCase {
  execute(input: SyncUserInput): Promise<User | null>;
}
