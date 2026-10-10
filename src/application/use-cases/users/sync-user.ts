import { User } from '../../../domain/entities/user';
import { Clock } from '../../ports/out/shared/clock';
import { SyncUserInput, SyncUserUseCase } from '../../ports/in/users/sync-user';
import { IdGenerator } from '../../ports/out/shared/id-generator';
import { UserRepository } from '../../ports/out/users/user-repository';

export class SyncUser implements SyncUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly bootstrapAdminExternalIds: readonly string[] = [],
  ) {}

  async execute(input: SyncUserInput): Promise<User | null> {
    if (input.type === 'delete') {
      await this.users.deleteByExternalId(input.externalId);
      return null;
    }

    const existing = await this.users.findByExternalId(input.externalId);
    if (existing) return existing;

    const role = this.bootstrapAdminExternalIds.includes(input.externalId) ? 'ADMIN' : undefined;
    const user = User.create(this.ids.next(), input.externalId, this.clock.now(), role);
    await this.users.save(user);
    return user;
  }
}
