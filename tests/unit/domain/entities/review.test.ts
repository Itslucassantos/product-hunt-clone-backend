import { describe, expect, it } from 'vitest';
import { Review } from '../../../../src/domain/entities/review';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { Rating } from '../../../../src/domain/value-objects/rating';

const created = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

describe('Review', () => {
  describe('create', () => {
    it('sets rating, trimmed summary and both timestamps to now', () => {
      const review = Review.create('r1', 'p1', 4, '  Solid  ', created);

      expect(review.id).toBe('r1');
      expect(review.productId).toBe('p1');
      expect(review.rating).toBe(4);
      expect(review.summary).toBe('Solid');
      expect(review.createdAt).toBe(created);
      expect(review.updatedAt).toBe(created);
    });

    it('rejects a blank summary', () => {
      expect(() => Review.create('r1', 'p1', 4, '   ', created)).toThrow(ValidationError);
    });

    it('rejects a rating out of range', () => {
      expect(() => Review.create('r1', 'p1', 6, 'ok', created)).toThrow(ValidationError);
    });
  });

  describe('restore', () => {
    it('rehydrates the stored state untouched', () => {
      const review = Review.restore('r1', 'p1', Rating.of(2), 'Meh', created, later);

      expect(review.rating).toBe(2);
      expect(review.summary).toBe('Meh');
      expect(review.updatedAt).toBe(later);
    });
  });

  describe('update', () => {
    it('changes rating and summary and bumps updatedAt', () => {
      const review = Review.create('r1', 'p1', 4, 'Solid', created);

      review.update(5, ' Great ', later);

      expect(review.rating).toBe(5);
      expect(review.summary).toBe('Great');
      expect(review.updatedAt).toBe(later);
      expect(review.createdAt).toBe(created);
    });

    it('keeps the previous state when the new data is invalid', () => {
      const review = Review.create('r1', 'p1', 4, 'Solid', created);

      expect(() => review.update(5, '', later)).toThrow(ValidationError);
      expect(() => review.update(0, 'ok', later)).toThrow(ValidationError);
      expect(review.rating).toBe(4);
      expect(review.summary).toBe('Solid');
      expect(review.updatedAt).toBe(created);
    });
  });
});
