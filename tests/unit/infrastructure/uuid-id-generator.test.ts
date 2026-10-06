import { describe, expect, it } from 'vitest';
import { UuidIdGenerator } from '../../../src/infrastructure/adapters/out/id/uuid-id-generator';

describe('UuidIdGenerator', () => {
  it('generates UUID v4 strings', () => {
    expect(new UuidIdGenerator().next()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('generates unique ids', () => {
    const generator = new UuidIdGenerator();
    const ids = Array.from({ length: 1000 }, () => generator.next());

    expect(new Set(ids).size).toBe(1000);
  });
});
