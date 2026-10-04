import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { MAX_RATING, MIN_RATING, Rating } from '../../../../src/domain/value-objects/rating';

describe('Rating', () => {
  it('accepts the boundaries and values in between', () => {
    expect(Rating.of(MIN_RATING).value).toBe(1);
    expect(Rating.of(3).value).toBe(3);
    expect(Rating.of(MAX_RATING).value).toBe(5);
  });

  it.each([0, 6, -1, 3.5, Number.NaN])('rejects %s', (value) => {
    expect(() => Rating.of(value)).toThrow(ValidationError);
  });
});
