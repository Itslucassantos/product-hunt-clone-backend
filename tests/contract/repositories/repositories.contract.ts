import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Product } from '../../../src/domain/entities/product';
import { Review } from '../../../src/domain/entities/review';
import { Topic } from '../../../src/domain/entities/topic';
import { User } from '../../../src/domain/entities/user';
import { Vote } from '../../../src/domain/entities/vote';
import { Slug } from '../../../src/domain/value-objects/slug';
import { HarnessFactory, RepositoryHarness } from './harness';

const NOW = new Date('2026-01-01T00:00:00Z');
const LATER = new Date('2026-02-01T00:00:00Z');

export const topic = (id: string, en: string, pt: string, position: number, at = NOW) =>
  Topic.create(
    id,
    { en: { name: en, description: `${en} desc` }, 'pt-BR': { name: pt, description: null } },
    position,
    at,
  );

export const product = (id: string, title: string, topicIds: string[], at = NOW) =>
  Product.create(
    id,
    title,
    'short',
    'long',
    'https://example.com',
    null,
    'PUBLISHED',
    topicIds,
    at,
  );

export function describeRepositoryContract(name: string, factory: HarnessFactory): void {
  describe(`repository contract: ${name}`, () => {
    let h: RepositoryHarness;

    beforeAll(() => factory.start(), 120_000);
    afterAll(() => factory.stop());
    beforeEach(async () => {
      h = await factory.create();
    });

    async function seedTopics() {
      await h.topics.save(topic('t1', 'AI', 'IA', 0));
      await h.topics.save(topic('t2', 'Marketing', 'Marketing', 1));
    }

    describe('topics', () => {
      it('round-trips translations, slug and position', async () => {
        await seedTopics();

        const found = await h.topics.findById('t1');

        expect(found?.slug.value).toBe('ai');
        expect(found?.position).toBe(0);
        expect(found?.translations).toEqual({
          en: { name: 'AI', description: 'AI desc' },
          'pt-BR': { name: 'IA', description: null },
        });
        expect(await h.topics.findById('missing')).toBeNull();
      });

      it('updates translations without changing the slug', async () => {
        await seedTopics();
        const found = (await h.topics.findById('t1'))!;
        found.rename(
          {
            en: { name: 'Artificial Intelligence', description: null },
            'pt-BR': { name: 'Inteligência', description: 'x' },
          },
          LATER,
        );
        await h.topics.save(found);

        const reloaded = await h.topics.findById('t1');

        expect(reloaded?.slug.value).toBe('ai');
        expect(reloaded?.nameIn('en')).toBe('Artificial Intelligence');
        expect(reloaded?.translations['pt-BR'].description).toBe('x');
      });

      it('lists by position and resolves by ids in the requested order', async () => {
        await seedTopics();

        expect((await h.topics.findAll()).map((t) => t.id)).toEqual(['t1', 't2']);
        expect((await h.topics.findByIds(['t2', 'missing', 't1'])).map((t) => t.id)).toEqual([
          't2',
          't1',
        ]);
      });

      it('saves several topics at once', async () => {
        await seedTopics();
        const all = await h.topics.findAll();
        all[0]!.moveTo(1, LATER);
        all[1]!.moveTo(0, LATER);
        await h.topics.saveAll(all);

        expect((await h.topics.findAll()).map((t) => t.id)).toEqual(['t2', 't1']);
      });

      it('checks names case-insensitively per locale and slugs', async () => {
        await seedTopics();

        expect(await h.topics.existsByName('en', ' ai ')).toBe(true);
        expect(await h.topics.existsByName('en', 'ai', 't1')).toBe(false);
        expect(await h.topics.existsByName('pt-BR', 'AI')).toBe(false);
        expect(await h.topics.existsBySlug(Slug.of('marketing'))).toBe(true);
        expect(await h.topics.existsBySlug(Slug.of('saas'))).toBe(false);
      });

      it('deletes a topic', async () => {
        await seedTopics();
        await h.topics.delete('t1');

        expect(await h.topics.findById('t1')).toBeNull();
        expect(await h.topics.findById('t2')).not.toBeNull();
      });

      it('lists topic items in the requested locale with product counts', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1']));
        await h.products.save(product('p2', 'Two', ['t1', 't2']));

        const items = await h.topicQueries.list('pt-BR');

        expect(items.map((i) => [i.slug, i.name, i.productCount])).toEqual([
          ['ai', 'IA', 2],
          ['marketing', 'Marketing', 1],
        ]);
        expect(items[0]?.description).toBeNull();
        expect((await h.topicQueries.list('en'))[0]?.description).toBe('AI desc');
      });

      it('reports the products that use a topic', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1']));
        await h.products.save(product('p2', 'Two', ['t1']));
        await h.products.save(product('p3', 'Three', ['t2']));

        const usage = await h.topicUsage.findProductsByTopic('t1', 1);

        expect(usage.total).toBe(2);
        expect(usage.items).toHaveLength(1);
        expect(['p1', 'p2']).toContain(usage.items[0]?.productId);
        expect((await h.topicUsage.findProductsByTopic('t2', 5)).items).toEqual([
          { productId: 'p3', title: 'Three' },
        ]);
      });
    });

    describe('products', () => {
      it('round-trips a product with its topics', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1', 't2']));

        const found = await h.products.findById('p1');

        expect(found?.title).toBe('One');
        expect(found?.longDescription).toBe('long');
        expect(found?.status).toBe('PUBLISHED');
        expect(found?.upvotes).toBe(0);
        expect(found?.topicIds.sort()).toEqual(['t1', 't2']);
        expect(found?.createdAt).toEqual(NOW);
        expect(await h.products.findById('missing')).toBeNull();
      });

      it('updates fields and replaces topics', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1']));
        const found = (await h.products.findById('p1'))!;
        found.update(
          'Renamed',
          'new short',
          null,
          'https://example.org',
          'http://img/x.png',
          LATER,
        );
        found.replaceTopics(['t2'], LATER);
        found.markAsComingSoon(LATER);
        await h.products.save(found);

        const reloaded = await h.products.findById('p1');

        expect(reloaded?.title).toBe('Renamed');
        expect(reloaded?.longDescription).toBeNull();
        expect(reloaded?.imageUrl).toBe('http://img/x.png');
        expect(reloaded?.status).toBe('COMING_SOON');
        expect(reloaded?.topicIds).toEqual(['t2']);
        expect(reloaded?.updatedAt).toEqual(LATER);
      });

      it('persists upvote changes and clears the pending delta', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1']));
        const found = (await h.products.findById('p1'))!;
        found.addUpvote();
        found.addUpvote();
        await h.products.save(found);

        expect(found.pendingUpvoteDelta).toBe(0);
        expect((await h.products.findById('p1'))?.upvotes).toBe(2);

        const again = (await h.products.findById('p1'))!;
        again.removeUpvote();
        await h.products.save(again);

        expect((await h.products.findById('p1'))?.upvotes).toBe(1);
      });

      it('checks titles case-insensitively and can exclude an id', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'My Product', ['t1']));

        expect(await h.products.existsByTitle('  my product ')).toBe(true);
        expect(await h.products.existsByTitle('my product', 'p1')).toBe(false);
        expect(await h.products.existsByTitle('other')).toBe(false);
      });

      it('deletes a product', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1']));

        await h.products.delete('p1');
        await h.products.delete('p1');

        expect(await h.products.findById('p1')).toBeNull();
        expect(await h.topics.findById('t1')).not.toBeNull();
      });
    });

    describe('reviews', () => {
      it('saves, updates and deletes a review', async () => {
        await seedTopics();
        await h.products.save(product('p1', 'One', ['t1']));
        await h.reviews.save(Review.create('r1', 'p1', 4, 'good', NOW));

        const found = (await h.reviews.findByProductId('p1'))!;
        expect([found.rating, found.summary]).toEqual([4, 'good']);

        found.update(2, 'meh', LATER);
        await h.reviews.save(found);
        const updated = await h.reviews.findByProductId('p1');
        expect([updated?.rating, updated?.summary, updated?.updatedAt]).toEqual([2, 'meh', LATER]);

        await h.reviews.delete('r1');
        expect(await h.reviews.findByProductId('p1')).toBeNull();
      });
    });

    describe('users', () => {
      it('saves, finds and deletes by external id', async () => {
        await h.users.save(User.create('u1', 'ext-1', NOW));

        expect((await h.users.findById('u1'))?.externalId).toBe('ext-1');
        expect((await h.users.findByExternalId('ext-1'))?.id).toBe('u1');
        expect(await h.users.findByExternalId('nope')).toBeNull();

        const found = (await h.users.findById('u1'))!;
        found.promote(LATER);
        await h.users.save(found);
        expect((await h.users.findById('u1'))?.isAdmin()).toBe(true);

        await h.users.deleteByExternalId('ext-1');
        expect(await h.users.findById('u1')).toBeNull();
      });
    });

    describe('votes', () => {
      it('finds, saves and deletes a vote and lists a user votes newest first', async () => {
        await seedTopics();
        await h.users.save(User.create('u1', 'ext-1', NOW));
        await h.products.save(product('p1', 'One', ['t1']));
        await h.products.save(product('p2', 'Two', ['t1']));
        expect(await h.votes.save(Vote.create('v1', 'u1', 'p1', NOW))).toBe(true);
        expect(await h.votes.save(Vote.create('v2', 'u1', 'p2', LATER))).toBe(true);
        expect(await h.votes.save(Vote.create('v3', 'u1', 'p1', LATER))).toBe(false);

        expect((await h.votes.findByUserAndProduct('u1', 'p1'))?.id).toBe('v1');
        expect(await h.votes.findByUserAndProduct('u1', 'p3')).toBeNull();
        expect(await h.userVotes.listProductIds('u1')).toEqual(['p2', 'p1']);

        expect(await h.votes.delete('v1')).toBe(true);
        expect(await h.votes.delete('v1')).toBe(false);
        expect(await h.userVotes.listProductIds('u1')).toEqual(['p2']);
      });
    });

    describe('product queries', () => {
      async function seedCatalog() {
        await seedTopics();
        await h.products.save(product('p1', 'Low', ['t1'], new Date('2026-01-01T00:00:00Z')));
        await h.products.save(
          product('p2', 'High', ['t1', 't2'], new Date('2026-01-02T00:00:00Z')),
        );
        await h.products.save(product('p3', 'Tie newer', ['t2'], new Date('2026-01-03T00:00:00Z')));
        await h.products.save(
          Product.create(
            'p4',
            'Soon',
            'short',
            null,
            'https://example.com',
            null,
            'COMING_SOON',
            ['t1'],
            new Date('2026-01-04T00:00:00Z'),
          ),
        );
        for (const id of ['p2', 'p3']) {
          const found = (await h.products.findById(id))!;
          found.addUpvote();
          found.addUpvote();
          await h.products.save(found);
        }
        await h.reviews.save(Review.create('r1', 'p2', 5, 'great', NOW));
      }

      it('ranks published products by upvotes then newest', async () => {
        await seedCatalog();

        const list = await h.productQueries.listPublic({ status: 'PUBLISHED' }, 'en');

        expect(list.map((p) => p.id)).toEqual(['p3', 'p2', 'p1']);
      });

      it('lists coming soon products newest first', async () => {
        await seedCatalog();

        const list = await h.productQueries.listPublic({ status: 'COMING_SOON' }, 'en');

        expect(list.map((p) => p.id)).toEqual(['p4']);
      });

      it('filters by topic slug and review state', async () => {
        await seedCatalog();

        const byTopic = await h.productQueries.listPublic(
          { status: 'PUBLISHED', topicSlug: 'marketing' },
          'en',
        );
        const reviewed = await h.productQueries.listPublic(
          { status: 'PUBLISHED', reviewed: true },
          'en',
        );
        const unreviewed = await h.productQueries.listPublic(
          { status: 'PUBLISHED', reviewed: false },
          'en',
        );
        const unknown = await h.productQueries.listPublic(
          { status: 'PUBLISHED', topicSlug: 'unknown' },
          'en',
        );

        expect(byTopic.map((p) => p.id)).toEqual(['p3', 'p2']);
        expect(reviewed.map((p) => p.id)).toEqual(['p2']);
        expect(unreviewed.map((p) => p.id)).toEqual(['p3', 'p1']);
        expect(unknown).toEqual([]);
      });

      it('localizes topic names and exposes the review rating', async () => {
        await seedCatalog();

        const list = await h.productQueries.listPublic({ status: 'PUBLISHED' }, 'pt-BR');
        const found = list.find((p) => p.id === 'p2');

        expect(found?.topics).toEqual([
          { id: 't1', name: 'IA', slug: 'ai' },
          { id: 't2', name: 'Marketing', slug: 'marketing' },
        ]);
        expect(found?.review).toEqual({ rating: 5 });
      });

      it('returns the detail with long description and full review', async () => {
        await seedCatalog();

        const detail = await h.productQueries.getById('p2', 'en');

        expect(detail?.longDescription).toBe('long');
        expect(detail?.review).toEqual({ rating: 5, summary: 'great' });
        expect(detail?.createdAt).toEqual(new Date('2026-01-02T00:00:00Z'));
        expect(await h.productQueries.getById('missing', 'en')).toBeNull();
      });

      it('lists every product for the admin, newest first', async () => {
        await seedCatalog();

        const list = await h.productQueries.listForAdmin('en');

        expect(list.map((p) => p.id)).toEqual(['p4', 'p3', 'p2', 'p1']);
        expect(list[0]?.updatedAt).toBeInstanceOf(Date);
      });
    });
  });
}
