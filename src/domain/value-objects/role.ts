import { ValidationError } from '../errors/validation-error';

export const ROLES = ['USER', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'USER';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.includes(value as Role);
}

export function parseRole(value: unknown): Role {
  if (!isRole(value)) {
    throw new ValidationError([{ field: 'role', code: 'INVALID_VALUE' }]);
  }
  return value;
}
