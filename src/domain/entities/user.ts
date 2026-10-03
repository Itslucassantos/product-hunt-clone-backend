import { Role, DEFAULT_ROLE } from '../value-objects/role';

export class User {
  private constructor(
    readonly id: string,
    readonly externalId: string,
    private _role: Role,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(id: string, externalId: string, now: Date, role?: Role): User {
    return new User(id, externalId, role ?? DEFAULT_ROLE, now, now);
  }

  static restore(
    id: string,
    externalId: string,
    role: Role,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(id, externalId, role, createdAt, updatedAt);
  }

  get role(): Role {
    return this._role;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  isAdmin(): boolean {
    return this._role === 'ADMIN';
  }

  promote(now: Date): void {
    if (this.isAdmin()) return;
    this._role = 'ADMIN';
    this._updatedAt = now;
  }

  demote(now: Date): void {
    if (!this.isAdmin()) return;
    this._role = DEFAULT_ROLE;
    this._updatedAt = now;
  }
}
