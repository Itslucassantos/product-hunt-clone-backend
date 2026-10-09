import { describe, expect, it } from 'vitest';
import { ADMIN, USER, buildTestApp, createProduct, createTopic } from '../../helpers/http';

async function world() {
  const { http } = buildTestApp();
  const ai = await createTopic(http, 'AI', 'IA');
  const saas = await createTopic(http, 'SaaS');
  return { http, ai, saas };
}

describe('products routes', () => {
  it('creates and reads a product', async () => {
    const { http, ai } = await world();

    const id = await createProduct(http, [ai], { longDescription: 'Long' });
    const response = await http.get(`/api/products/${id}?locale=pt-BR`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id,
      title: 'Lumen',
      longDescription: 'Long',
      status: 'PUBLISHED',
      upvotes: 0,
      topics: [{ id: ai, name: 'IA', slug: 'ai' }],
      review: null,
    });
    expect(response.headers['cache-control']).toBe('public, max-age=30');
  });

  it('responds PRODUCT_NOT_FOUND', async () => {
    const { http } = await world();

    const response = await http.get('/api/products/missing');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('reports required fields', async () => {
    const { http } = await world();

    const response = await http.post('/api/products').set('Authorization', ADMIN).send({});

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'title', code: 'REQUIRED' },
        { field: 'topicIds', code: 'REQUIRED' },
      ]),
    );
  });

  it('requires an existing topic', async () => {
    const { http } = await world();

    const response = await http
      .post('/api/products')
      .set('Authorization', ADMIN)
      .send({ title: 'X', description: 'Y', url: 'https://x.app', topicIds: ['nope'] });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('TOPIC_NOT_FOUND');
  });

  it('filters by topic, status and review', async () => {
    const { http, ai, saas } = await world();
    const reviewed = await createProduct(http, [ai], { title: 'Reviewed' });
    await createProduct(http, [saas], { title: 'Plain' });
    await createProduct(http, [ai], { title: 'Soon', status: 'COMING_SOON' });
    await http
      .put(`/api/products/${reviewed}/review`)
      .set('Authorization', ADMIN)
      .send({ rating: 5, summary: 'Great' });

    const byTopic = await http.get('/api/products?topic=ai');
    const soon = await http.get('/api/products?status=coming-soon');
    const onlyReviewed = await http.get('/api/products?reviewed=true');

    expect(byTopic.body.map((p: { title: string }) => p.title)).toEqual(['Reviewed']);
    expect(soon.body.map((p: { title: string }) => p.title)).toEqual(['Soon']);
    expect(onlyReviewed.body).toMatchObject([{ title: 'Reviewed', review: { rating: 5 } }]);
  });

  it('rejects a product with a duplicate title', async () => {
    const { http, ai } = await world();
    await createProduct(http, [ai]);

    const response = await http
      .post('/api/products')
      .set('Authorization', ADMIN)
      .send({ title: 'lumen', description: 'D', url: 'https://x.app', topicIds: [ai] });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PRODUCT_ALREADY_EXISTS');
  });

  it('updates and deletes', async () => {
    const { http, ai } = await world();
    const id = await createProduct(http, [ai]);

    const update = await http
      .patch(`/api/products/${id}`)
      .set('Authorization', ADMIN)
      .send({ title: 'Renamed' });
    const read = await http.get(`/api/products/${id}`);
    const remove = await http.delete(`/api/products/${id}`).set('Authorization', ADMIN);
    const gone = await http.get(`/api/products/${id}`);

    expect(update.status).toBe(204);
    expect(read.body.title).toBe('Renamed');
    expect(remove.status).toBe(204);
    expect(gone.status).toBe(404);
  });

  it('saves and removes a review', async () => {
    const { http, ai } = await world();
    const id = await createProduct(http, [ai]);

    const save = await http
      .put(`/api/products/${id}/review`)
      .set('Authorization', ADMIN)
      .send({ rating: 4, summary: 'Nice' });
    const detail = await http.get(`/api/products/${id}`);
    const remove = await http.delete(`/api/products/${id}/review`).set('Authorization', ADMIN);
    const again = await http.delete(`/api/products/${id}/review`).set('Authorization', ADMIN);

    expect(save.status).toBe(204);
    expect(detail.body.review).toEqual({ rating: 4, summary: 'Nice' });
    expect(remove.status).toBe(204);
    expect(again.body.error.code).toBe('REVIEW_NOT_FOUND');
  });

  it('rejects an out-of-range rating', async () => {
    const { http, ai } = await world();
    const id = await createProduct(http, [ai]);

    const response = await http
      .put(`/api/products/${id}/review`)
      .set('Authorization', ADMIN)
      .send({ rating: 9, summary: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([{ field: 'rating', code: 'OUT_OF_RANGE' }]);
  });

  it('lists every product for admins only', async () => {
    const { http, ai } = await world();
    await createProduct(http, [ai], { status: 'COMING_SOON' });

    const admin = await http.get('/api/admin/products').set('Authorization', ADMIN);
    const user = await http.get('/api/admin/products').set('Authorization', USER);

    expect(admin.body).toHaveLength(1);
    expect(admin.body[0]).toHaveProperty('createdAt');
    expect(user.status).toBe(403);
  });
});
