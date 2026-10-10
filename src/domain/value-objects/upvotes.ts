import { ValidationError } from '../errors/validation-error';

export class Upvotes {
  private constructor(readonly value: number) {}

  static of(value: number): Upvotes {
    if (!Number.isInteger(value) || value < 0) {
      throw new ValidationError([{ field: 'upvotes', code: 'OUT_OF_RANGE' }]);
    }
    return new Upvotes(value);
  }

  static zero(): Upvotes {
    return new Upvotes(0);
  }

  increment(): Upvotes {
    return new Upvotes(this.value + 1);
  }

  decrement(): Upvotes {
    return Upvotes.of(this.value - 1);
  }
}
