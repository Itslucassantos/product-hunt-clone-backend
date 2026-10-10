import { describe, expect, it } from 'vitest';
import { User } from '../../../../src/domain/entities/user';

const created = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

describe('User', () => {
  describe('create', () => {
    it('defaults to the USER role and sets both timestamps to now', () => {
      const user = User.create('u1', 'clerk_1', created);

      expect(user.id).toBe('u1');
      expect(user.externalId).toBe('clerk_1');
      expect(user.role).toBe('USER');
      expect(user.isAdmin()).toBe(false);
      expect(user.createdAt).toBe(created);
      expect(user.updatedAt).toBe(created);
    });

    it('accepts an explicit role', () => {
      expect(User.create('u1', 'clerk_1', created, 'ADMIN').isAdmin()).toBe(true);
    });
  });

  describe('restore', () => {
    it('rehydrates the stored state untouched', () => {
      const user = User.restore('u1', 'clerk_1', 'ADMIN', created, later);

      expect(user.role).toBe('ADMIN');
      expect(user.createdAt).toBe(created);
      expect(user.updatedAt).toBe(later);
    });
  });

  describe('promote', () => {
    it('makes the user an admin and bumps updatedAt', () => {
      const user = User.create('u1', 'clerk_1', created);

      user.promote(later);

      expect(user.isAdmin()).toBe(true);
      expect(user.updatedAt).toBe(later);
      expect(user.createdAt).toBe(created);
    });

    it('is a no-op when the user is already an admin', () => {
      const user = User.create('u1', 'clerk_1', created, 'ADMIN');

      user.promote(later);

      expect(user.updatedAt).toBe(created);
    });
  });

  describe('demote', () => {
    it('returns the user to the default role and bumps updatedAt', () => {
      const user = User.create('u1', 'clerk_1', created, 'ADMIN');

      user.demote(later);

      expect(user.role).toBe('USER');
      expect(user.updatedAt).toBe(later);
    });

    it('is a no-op when the user is not an admin', () => {
      const user = User.create('u1', 'clerk_1', created);

      user.demote(later);

      expect(user.updatedAt).toBe(created);
    });
  });
});
