import { describe, expect, it } from 'vitest';
import { GetMe } from '../../../../src/application/use-cases/users/get-me';
import { User } from '../../../../src/domain/entities/user';
import { UserNotFoundError } from '../../../../src/domain/errors/user-not-found-error';
import { InMemoryUserRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-user-repository';

describe('GetMe', () => {
  it('returns the id and role of the user', async () => {
    const users = new InMemoryUserRepository();
    await users.save(User.create('u1', 'clerk_1', new Date(), 'ADMIN'));

    await expect(new GetMe(users).execute({ userId: 'u1' })).resolves.toEqual({
      id: 'u1',
      role: 'ADMIN',
    });
  });

  it('throws UserNotFoundError when the user does not exist', async () => {
    const promise = new GetMe(new InMemoryUserRepository()).execute({ userId: 'nope' });

    await expect(promise).rejects.toBeInstanceOf(UserNotFoundError);
    await expect(promise).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});
