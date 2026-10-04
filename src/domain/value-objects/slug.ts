import { ValidationError } from '../errors/validation-error';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class Slug {
  private constructor(readonly value: string) {}

  static fromName(name: string): Slug {
    const value = name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!value) {
      throw new ValidationError([{ field: 'name', code: 'INVALID_VALUE' }]);
    }
    return new Slug(value);
  }

  static of(value: string): Slug {
    if (!SLUG_PATTERN.test(value)) {
      throw new ValidationError([{ field: 'slug', code: 'INVALID_VALUE' }]);
    }
    return new Slug(value);
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
