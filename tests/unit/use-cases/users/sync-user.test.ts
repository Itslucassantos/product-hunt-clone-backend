import { beforeEach, describe, expect, it } from 'vitest';
import { SyncUser } from '../../../../src/application/use-cases/users/sync-user';
import { InMemoryUserRepository } from '../../../../src/infrastructure/adapters/out/persistence/in-memory/in-memory-user-repository';
import { FakeClock, FakeIdGenerator } from '../../../helpers/fakes';

describe('SyncUser', () => {
  let users: InMemoryUserRepository;
  let clock: FakeClock;

  const build = (adminExternalIds: string[] = []) =>
    new SyncUser(users, new FakeIdGenerator('u'), clock, adminExternalIds);

  beforeEach(() => {
    users = new InMemoryUserRepository();
    clock = new FakeClock();
  });

  describe('upsert', () => {
    it('creates a USER with generated id and current time', async () => {
      const user = await build().execute({ type: 'upsert', externalId: 'clerk_1' });

      expect(user).toMatchObject({ id: 'u-1', externalId: 'clerk_1', role: 'USER' });
      expect(user?.createdAt).toEqual(clock.now());
      expect(await users.findByExternalId('clerk_1')).toBe(user);
    });

    it('is idempotent: a repeated event returns the existing user', async () => {
      const sync = build();
      const first = await sync.execute({ type: 'upsert', externalId: 'clerk_1' });
      const second = await sync.execute({ type: 'upsert', externalId: 'clerk_1' });

      expect(second).toBe(first);
      expect(second?.id).toBe('u-1');
    });

    it('creates an ADMIN when the external id is in the bootstrap list', async () => {
      const sync = build(['clerk_admin']);

      const admin = await sync.execute({ type: 'upsert', externalId: 'clerk_admin' });
      const other = await sync.execute({ type: 'upsert', externalId: 'clerk_2' });

      expect(admin?.role).toBe('ADMIN');
      expect(other?.role).toBe('USER');
    });

    it('does not change the role of an existing user', async () => {
      await build().execute({ type: 'upsert', externalId: 'clerk_1' });

      const user = await build(['clerk_1']).execute({ type: 'upsert', externalId: 'clerk_1' });

      expect(user?.role).toBe('USER');
    });
  });

  describe('delete', () => {
    it('removes the user and returns null', async () => {
      const sync = build();
      await sync.execute({ type: 'upsert', externalId: 'clerk_1' });

      const result = await sync.execute({ type: 'delete', externalId: 'clerk_1' });

      expect(result).toBeNull();
      expect(await users.findByExternalId('clerk_1')).toBeNull();
    });

    it('is a no-op for an unknown user', async () => {
      await expect(build().execute({ type: 'delete', externalId: 'ghost' })).resolves.toBeNull();
    });
  });
});
