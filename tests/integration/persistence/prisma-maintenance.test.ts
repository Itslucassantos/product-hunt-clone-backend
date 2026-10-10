import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaMaintenance } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-maintenance';
import { TestDatabase, startTestDatabase } from '../../helpers/database';

const NOW = new Date('2026-01-10T12:00:00Z');
const OLD = new Date('2026-01-01T00:00:00Z');

describe('PrismaMaintenance', () => {
  let db: TestDatabase;
  let maintenance: PrismaMaintenance;

  beforeAll(async () => {
    db = await startTestDatabase();
    maintenance = new PrismaMaintenance(db.context);
  }, 120_000);

  afterAll(async () => {
    await db.stop();
  });

  beforeEach(async () => {
    await db.reset();
    await db.prisma.topic.create({
      data: { id: 't1', slug: 'ai', position: 0, updatedAt: NOW },
    });
  });

  const product = (id: string, upvotes: number, imageUrl: string | null = null) =>
    db.prisma.product.create({
      data: {
        id,
        title: id,
        description: 'd',
        url: 'https://example.com',
        imageUrl,
        upvotes,
        updatedAt: NOW,
        topics: { connect: { id: 't1' } },
      },
    });

  const vote = async (id: string, userId: string, productId: string) => {
    await db.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, externalId: userId, updatedAt: NOW },
      update: {},
    });
    await db.prisma.vote.create({ data: { id, userId, productId, updatedAt: NOW } });
  };

  describe('reconcile', () => {
    it('rewrites counters that drifted from the real number of votes', async () => {
      await product('drift-up', 9);
      await product('drift-down', 0);
      await product('correct', 1);
      await product('empty', 0);
      await vote('v1', 'u1', 'drift-up');
      await vote('v2', 'u2', 'drift-up');
      await vote('v3', 'u1', 'drift-down');
      await vote('v4', 'u2', 'correct');

      const fixed = await maintenance.reconcile();

      const counters = Object.fromEntries(
        (await db.prisma.product.findMany()).map((item) => [item.id, item.upvotes]),
      );
      expect(fixed).toBe(2);
      expect(counters).toEqual({ 'drift-up': 2, 'drift-down': 1, correct: 1, empty: 0 });
      expect(await maintenance.reconcile()).toBe(0);
    });
  });

  describe('removeUnreferencedBefore', () => {
    const image = (id: string, createdAt: Date) =>
      db.prisma.productImage.create({
        data: { id, contentType: 'image/png', data: Buffer.from('x'), createdAt },
      });

    it('removes only old images that no product points to', async () => {
      await image('used.png', OLD);
      await image('orphan.png', OLD);
      await image('recent-orphan.png', NOW);
      await product('p1', 0, 'http://localhost:3333/files/used.png');

      const removed = await maintenance.removeUnreferencedBefore(new Date('2026-01-09T12:00:00Z'));

      const left = (await db.prisma.productImage.findMany()).map((item) => item.id).sort();
      expect(removed).toBe(1);
      expect(left).toEqual(['recent-orphan.png', 'used.png']);
    });

    it('does not mistake an image whose name is a suffix of another', async () => {
      await image('a.png', OLD);
      await product('p1', 0, 'http://localhost:3333/files/aa.png');

      const removed = await maintenance.removeUnreferencedBefore(NOW);

      expect(removed).toBe(1);
    });
  });
});
