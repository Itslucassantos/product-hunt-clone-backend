import type { Response } from 'superagent';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../../src/main/container';
import { loadEnv } from '../../../src/infrastructure/config/env';
import { seed } from '../../../src/main/seed';
import { TestDatabase, startTestDatabase } from '../../helpers/database';
import { ADMIN, USER, buildTestApp, createProduct, createTopic } from '../../helpers/http';

const binary = (res: Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('HTTP API on the prisma driver', () => {
  let db: TestDatabase;
  let url: string;

  beforeAll(async () => {
    db = await startTestDatabase();
    url = db.url;
  }, 120_000);

  afterAll(async () => {
    await db.stop();
  });

  it('serves the main flow end to end with real persistence', async () => {
    const { http } = buildTestApp({ REPOSITORY_DRIVER: 'prisma', DATABASE_URL: url });
    const topicId = await createTopic(http, 'AI', 'IA');
    const productId = await createProduct(http, [topicId]);

    const vote = await http.post(`/api/products/${productId}/vote`).set('Authorization', USER);
    const unvote = await http.post(`/api/products/${productId}/vote`).set('Authorization', USER);
    await http.post(`/api/products/${productId}/vote`).set('Authorization', USER);
    const list = await http.get('/api/products?locale=pt-BR');
    const mine = await http.get('/api/me/votes').set('Authorization', USER);
    const me = await http.get('/api/me').set('Authorization', ADMIN);

    expect(vote.body).toEqual({ upvotes: 1, voted: true });
    expect(unvote.body).toEqual({ upvotes: 0, voted: false });
    expect(list.body[0]).toMatchObject({ id: productId, upvotes: 1 });
    expect(list.body[0].topics[0].name).toBe('IA');
    expect(mine.body).toEqual({ productIds: [productId] });
    expect(me.body.role).toBe('ADMIN');
  });

  it('stores an uploaded image in the database and serves it back', async () => {
    const { http } = buildTestApp({ REPOSITORY_DRIVER: 'prisma', DATABASE_URL: url });
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('payload'),
    ]);

    const upload = await http
      .post('/api/uploads/product-image')
      .set('Authorization', ADMIN)
      .attach('file', png, 'logo.png');
    const path = new URL(upload.body.imageUrl).pathname;
    const served = await http.get(path).buffer(true).parse(binary);
    const missing = await http.get('/files/missing.png');

    expect(upload.status).toBe(201);
    expect(path).toMatch(/^\/files\/[\w-]+\.png$/);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(served.body, png)).toBe(0);
    expect(await db.prisma.productImage.count()).toBe(1);
    expect(missing.status).toBe(404);
  });

  it('blocks deleting a topic that is still used', async () => {
    const { http } = buildTestApp({ REPOSITORY_DRIVER: 'prisma', DATABASE_URL: url });
    const topicId = await createTopic(http, 'Blocked');
    await createProduct(http, [topicId], { title: 'Uses blocked topic' });

    const response = await http.delete(`/api/topics/${topicId}`).set('Authorization', ADMIN);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TOPIC_IN_USE');
  });

  it('seeds only once', async () => {
    await db.reset();
    const container = buildContainer(
      loadEnv({
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        REPOSITORY_DRIVER: 'prisma',
        DATABASE_URL: url,
      }),
    );

    await seed(container);
    await seed(container);

    expect(await db.prisma.topic.count()).toBe(4);
    expect(await db.prisma.product.count()).toBe(3);
    await container.shutdown();
  });
});
