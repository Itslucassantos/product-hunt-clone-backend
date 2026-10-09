import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Review } from '../../../src/domain/entities/review';
import { User } from '../../../src/domain/entities/user';
import { Vote } from '../../../src/domain/entities/vote';
import { PrismaProductRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-product-repository';
import { PrismaReviewRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-review-repository';
import { PrismaTopicRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-topic-repository';
import { PrismaUnitOfWork } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-unit-of-work';
import { PrismaUserRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-user-repository';
import { PrismaVoteRepository } from '../../../src/infrastructure/adapters/out/persistence/prisma/prisma-vote-repository';
import { product, topic } from '../../contract/repositories/repositories.contract';
import { TestDatabase, startTestDatabase } from '../../helpers/database';

const NOW = new Date('2026-01-01T00:00:00Z');

describe('Prisma specifics', () => {
  let db: TestDatabase;
  let products: PrismaProductRepository;
  let reviews: PrismaReviewRepository;
  let topics: PrismaTopicRepository;
  let users: PrismaUserRepository;
  let votes: PrismaVoteRepository;
  let uow: PrismaUnitOfWork;

  beforeAll(async () => {
    db = await startTestDatabase();
    products = new PrismaProductRepository(db.context);
    reviews = new PrismaReviewRepository(db.context);
    topics = new PrismaTopicRepository(db.context);
    users = new PrismaUserRepository(db.context);
    votes = new PrismaVoteRepository(db.context);
    uow = new PrismaUnitOfWork(db.context);
  }, 120_000);

  afterAll(async () => {
    await db.stop();
  });

  beforeEach(async () => {
    await db.reset();
    await topics.save(topic('t1', 'AI', 'IA', 0));
  });

  it('applies concurrent upvote changes as relative increments', async () => {
    await products.save(product('p1', 'One', ['t1']));
    const first = (await products.findById('p1'))!;
    const second = (await products.findById('p1'))!;
    first.addUpvote();
    second.addUpvote();
    await products.save(first);
    await products.save(second);

    expect((await products.findById('p1'))?.upvotes).toBe(2);
  });

  it('deletes a product together with its votes and review', async () => {
    await users.save(User.create('u1', 'ext-1', NOW));
    await products.save(product('p1', 'One', ['t1']));
    await votes.save(Vote.create('v1', 'u1', 'p1', NOW));
    await reviews.save(Review.create('r1', 'p1', 4, 'good', NOW));

    await products.delete('p1');

    expect(await db.prisma.vote.count()).toBe(0);
    expect(await db.prisma.review.count()).toBe(0);
  });

  it('deletes translations together with their topic', async () => {
    await topics.delete('t1');

    expect(await db.prisma.topicTranslation.count({ where: { topicId: 't1' } })).toBe(0);
  });

  it('rejects a product that references a missing topic', async () => {
    await expect(products.save(product('p1', 'One', ['nope']))).rejects.toThrow();
  });

  it('allows only one vote per user and product', async () => {
    await users.save(User.create('u1', 'ext-1', NOW));
    await products.save(product('p1', 'One', ['t1']));
    await votes.save(Vote.create('v1', 'u1', 'p1', NOW));

    await expect(votes.save(Vote.create('v2', 'u1', 'p1', NOW))).rejects.toThrow();
  });

  it('rejects a rating outside 1..5 and negative upvotes at the database level', async () => {
    await products.save(product('p1', 'One', ['t1']));

    await expect(
      db.prisma.review.create({
        data: { id: 'r1', productId: 'p1', rating: 6, summary: 'x', updatedAt: NOW },
      }),
    ).rejects.toThrow();
    await expect(
      db.prisma.product.update({ where: { id: 'p1' }, data: { upvotes: -1 } }),
    ).rejects.toThrow();
  });

  describe('unit of work', () => {
    it('commits every write when the work succeeds', async () => {
      await uow.run(async () => {
        await products.save(product('p1', 'One', ['t1']));
        await reviews.save(Review.create('r1', 'p1', 3, 'ok', NOW));
      });

      expect(await products.findById('p1')).not.toBeNull();
      expect(await reviews.findByProductId('p1')).not.toBeNull();
    });

    it('rolls back every write when the work fails', async () => {
      await expect(
        uow.run(async () => {
          await products.save(product('p1', 'One', ['t1']));
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(await products.findById('p1')).toBeNull();
    });

    it('lets nested runs join the outer transaction', async () => {
      await expect(
        uow.run(async () => {
          await uow.run(async () => {
            await products.save(product('p1', 'One', ['t1']));
          });
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');

      expect(await products.findById('p1')).toBeNull();
    });
  });
});
