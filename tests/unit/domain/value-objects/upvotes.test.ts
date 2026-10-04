import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { Upvotes } from '../../../../src/domain/value-objects/upvotes';

describe('Upvotes', () => {
  it('starts at zero', () => {
    expect(Upvotes.zero().value).toBe(0);
  });

  it('accepts non-negative integers', () => {
    expect(Upvotes.of(5).value).toBe(5);
  });

  it.each([-1, 1.5, Number.NaN])('rejects %s', (value) => {
    expect(() => Upvotes.of(value)).toThrow(ValidationError);
  });

  it('increments into a new instance', () => {
    const original = Upvotes.of(1);

    expect(original.increment().value).toBe(2);
    expect(original.value).toBe(1);
  });

  it('decrements into a new instance', () => {
    expect(Upvotes.of(2).decrement().value).toBe(1);
  });

  it('refuses to go below zero', () => {
    expect(() => Upvotes.zero().decrement()).toThrow(ValidationError);
  });
});
