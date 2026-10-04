import { ValidationError } from '../errors/validation-error';
import { Rating } from '../value-objects/rating';

export class Review {
  private constructor(
    readonly id: string,
    readonly productId: string,
    private _rating: Rating,
    private _summary: string,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(id: string, productId: string, rating: number, summary: string, now: Date): Review {
    Review.assertSummary(summary);
    return new Review(id, productId, Rating.of(rating), summary.trim(), now, now);
  }

  static restore(
    id: string,
    productId: string,
    rating: Rating,
    summary: string,
    createdAt: Date,
    updatedAt: Date,
  ): Review {
    return new Review(id, productId, rating, summary, createdAt, updatedAt);
  }

  update(rating: number, summary: string, now: Date): void {
    Review.assertSummary(summary);
    this._rating = Rating.of(rating);
    this._summary = summary.trim();
    this._updatedAt = now;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get rating(): number {
    return this._rating.value;
  }

  get summary(): string {
    return this._summary;
  }

  private static assertSummary(summary: string): void {
    if (!summary.trim()) throw new ValidationError([{ field: 'summary', code: 'REQUIRED' }]);
  }
}
