import { describe, expect, it } from 'vitest';
import { requireAdmin } from '../../../src/application/policies/require-admin';
import { ForbiddenError } from '../../../src/domain/errors/forbidden-error';
import { admin, regularUser } from '../../helpers/topics';

describe('requireAdmin', () => {
  it('lets an admin through', () => {
    expect(() => requireAdmin(admin)).not.toThrow();
  });

  it('throws ForbiddenError for a regular user', () => {
    expect(() => requireAdmin(regularUser)).toThrow(ForbiddenError);
    expect(() => requireAdmin(regularUser)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });
});
