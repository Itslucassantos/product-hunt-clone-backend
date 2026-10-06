import { User } from '../../../domain/entities/user';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByExternalId(externalId: string): Promise<User | null>;
  save(user: User): Promise<void>;
  deleteByExternalId(externalId: string): Promise<void>;
}
