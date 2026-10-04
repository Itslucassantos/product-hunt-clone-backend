import { ValidationError } from '../errors/validation-error';

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export class Rating {
  private constructor(readonly value: number) {}

  static of(value: number): Rating {
    if (!Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
      throw new ValidationError([{ field: 'rating', code: 'OUT_OF_RANGE' }]);
    }
    return new Rating(value);
  }
}
