import { describe, expect, it } from 'vitest';
import { Vote } from '../../../../src/domain/entities/vote';

const created = new Date('2026-01-01T00:00:00Z');

describe('Vote', () => {
  it('creates a vote stamped with now', () => {
    const vote = Vote.create('v1', 'u1', 'p1', created);

    expect(vote.id).toBe('v1');
    expect(vote.userId).toBe('u1');
    expect(vote.productId).toBe('p1');
    expect(vote.createdAt).toBe(created);
  });

  it('restores the stored state untouched', () => {
    const vote = Vote.restore('v1', 'u1', 'p1', created);

    expect(vote.userId).toBe('u1');
    expect(vote.createdAt).toBe(created);
  });
});
