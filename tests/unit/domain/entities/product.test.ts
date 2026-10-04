import { describe, expect, it } from 'vitest';
import { Product } from '../../../../src/domain/entities/product';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { Upvotes } from '../../../../src/domain/value-objects/upvotes';

const created = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-02-01T00:00:00Z');

function newProduct(overrides: { status?: 'PUBLISHED' | 'COMING_SOON'; topicIds?: string[] } = {}) {
  return Product.create(
    'p1',
    'Title',
    'Short',
    null,
    'https://example.com',
    null,
    overrides.status ?? 'PUBLISHED',
    overrides.topicIds ?? ['t1'],
    created,
  );
}

function fieldErrors(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    if (error instanceof ValidationError) return error.fieldErrors;
    throw error;
  }
  throw new Error('Expected ValidationError');
}

describe('Product', () => {
  describe('create', () => {
    it('starts with zero upvotes, no pending delta and both timestamps at now', () => {
      const product = newProduct();

      expect(product.upvotes).toBe(0);
      expect(product.pendingUpvoteDelta).toBe(0);
      expect(product.createdAt).toBe(created);
      expect(product.updatedAt).toBe(created);
    });

    it('trims text fields and removes duplicate topic ids', () => {
      const product = Product.create(
        'p1',
        '  Title ',
        ' Short ',
        null,
        ' https://example.com ',
        null,
        'PUBLISHED',
        ['t1', 't1', 't2'],
        created,
      );

      expect(product.title).toBe('Title');
      expect(product.description).toBe('Short');
      expect(product.url).toBe('https://example.com');
      expect(product.topicIds).toEqual(['t1', 't2']);
    });

    it('requires at least one topic', () => {
      expect(fieldErrors(() => newProduct({ topicIds: [] }))).toEqual([
        { field: 'topicIds', code: 'REQUIRED' },
      ]);
    });

    it('reports every invalid field at once', () => {
      const errors = fieldErrors(() =>
        Product.create('p1', ' ', '', null, 'not a url', null, 'PUBLISHED', ['t1'], created),
      );

      expect(errors).toEqual([
        { field: 'title', code: 'REQUIRED' },
        { field: 'description', code: 'REQUIRED' },
        { field: 'url', code: 'INVALID_VALUE' },
      ]);
    });
  });

  describe('restore', () => {
    it('rehydrates the stored state without validating', () => {
      const product = Product.restore(
        'p1',
        '',
        '',
        'Long',
        'nope',
        'img',
        'COMING_SOON',
        Upvotes.of(7),
        [],
        created,
        later,
      );

      expect(product.upvotes).toBe(7);
      expect(product.status).toBe('COMING_SOON');
      expect(product.longDescription).toBe('Long');
      expect(product.topicIds).toEqual([]);
      expect(product.updatedAt).toBe(later);
      expect(product.pendingUpvoteDelta).toBe(0);
    });
  });

  describe('votes', () => {
    it('is votable only when published', () => {
      expect(newProduct({ status: 'PUBLISHED' }).isVotable()).toBe(true);
      expect(newProduct({ status: 'COMING_SOON' }).isVotable()).toBe(false);
    });

    it('tracks the counter and the pending delta on add and remove', () => {
      const product = newProduct();

      product.addUpvote();
      product.addUpvote();
      product.removeUpvote();

      expect(product.upvotes).toBe(1);
      expect(product.pendingUpvoteDelta).toBe(1);
    });

    it('clears the pending delta without touching the counter', () => {
      const product = newProduct();
      product.addUpvote();

      product.clearPendingUpvoteDelta();

      expect(product.upvotes).toBe(1);
      expect(product.pendingUpvoteDelta).toBe(0);
    });

    it('never goes below zero and keeps the delta untouched on failure', () => {
      const product = newProduct();

      expect(() => product.removeUpvote()).toThrow(ValidationError);
      expect(product.upvotes).toBe(0);
      expect(product.pendingUpvoteDelta).toBe(0);
    });
  });

  describe('status', () => {
    it('publishes and bumps updatedAt', () => {
      const product = newProduct({ status: 'COMING_SOON' });

      product.publish(later);

      expect(product.status).toBe('PUBLISHED');
      expect(product.updatedAt).toBe(later);
    });

    it('goes back to coming soon and keeps existing upvotes', () => {
      const product = newProduct();
      product.addUpvote();

      product.markAsComingSoon(later);

      expect(product.status).toBe('COMING_SOON');
      expect(product.upvotes).toBe(1);
      expect(product.updatedAt).toBe(later);
    });
  });

  describe('topics', () => {
    it('replaces the topics, removing duplicates', () => {
      const product = newProduct();

      product.replaceTopics(['t2', 't2', 't3'], later);

      expect(product.topicIds).toEqual(['t2', 't3']);
      expect(product.hasTopic('t2')).toBe(true);
      expect(product.hasTopic('t1')).toBe(false);
      expect(product.updatedAt).toBe(later);
    });

    it('rejects an empty list and keeps the previous state', () => {
      const product = newProduct();

      expect(() => product.replaceTopics([], later)).toThrow(ValidationError);
      expect(product.topicIds).toEqual(['t1']);
      expect(product.updatedAt).toBe(created);
    });

    it('does not let callers mutate the internal list', () => {
      const product = newProduct();

      product.topicIds.push('t9');

      expect(product.topicIds).toEqual(['t1']);
    });
  });

  describe('update', () => {
    it('applies the changes and bumps updatedAt', () => {
      const product = newProduct();

      product.update('New', 'New short', 'Long', 'https://new.dev', 'img', later);

      expect(product.title).toBe('New');
      expect(product.description).toBe('New short');
      expect(product.longDescription).toBe('Long');
      expect(product.url).toBe('https://new.dev');
      expect(product.imageUrl).toBe('img');
      expect(product.updatedAt).toBe(later);
    });

    it('rejects invalid data and keeps the previous state', () => {
      const product = newProduct();

      expect(() => product.update('', 'Short', null, 'https://example.com', null, later)).toThrow(
        ValidationError,
      );
      expect(product.title).toBe('Title');
      expect(product.updatedAt).toBe(created);
    });
  });
});
