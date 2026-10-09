import { User } from '../../../../../domain/entities/user';
import { UserRepository } from '../../../../../application/ports/out/users/user-repository';
import { PrismaContext } from './prisma-context';

interface UserRow {
  id: string;
  externalId: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (row: UserRow): User =>
  User.restore(row.id, row.externalId, row.role, row.createdAt, row.updatedAt);

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly context: PrismaContext) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.context.client.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByExternalId(externalId: string): Promise<User | null> {
    const row = await this.context.client.user.findUnique({ where: { externalId } });
    return row ? toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.context.client.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        externalId: user.externalId,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      update: { role: user.role, updatedAt: user.updatedAt },
    });
  }

  async deleteByExternalId(externalId: string): Promise<void> {
    await this.context.client.user.deleteMany({ where: { externalId } });
  }
}
