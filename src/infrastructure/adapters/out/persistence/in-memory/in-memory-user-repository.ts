import { User } from '../../../../../domain/entities/user';
import { UserRepository } from '../../../../../application/ports/out/users/user-repository';

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByExternalId(externalId: string): Promise<User | null> {
    for (const user of this.byId.values()) {
      if (user.externalId === externalId) return user;
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.id, user);
  }

  async deleteByExternalId(externalId: string): Promise<void> {
    for (const [id, user] of this.byId) {
      if (user.externalId === externalId) this.byId.delete(id);
    }
  }
}
