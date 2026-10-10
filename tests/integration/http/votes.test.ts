import { describe, expect, it } from 'vitest';
import { USER, buildTestApp, createProduct, createTopic } from '../../helpers/http';

describe('vote routes', () => {
  it('toggles a vote and lists my votes', async () => {
    const { http } = buildTestApp();
    const id = await createProduct(http, [await createTopic(http, 'AI')]);

    const vote = await http.post(`/api/products/${id}/vote`).set('Authorization', USER);
    const mine = await http.get('/api/me/votes').set('Authorization', USER);
    const detail = await http.get(`/api/products/${id}`);
    const unvote = await http.post(`/api/products/${id}/vote`).set('Authorization', USER);

    expect(vote.body).toEqual({ upvotes: 1, voted: true });
    expect(mine.body).toEqual({ productIds: [id] });
    expect(detail.body.upvotes).toBe(1);
    expect(unvote.body).toEqual({ upvotes: 0, voted: false });
  });

  it('requires login', async () => {
    const { http } = buildTestApp();

    const response = await http.post('/api/products/x/vote');

    expect(response.status).toBe(401);
  });

  it('rejects voting on a coming soon product', async () => {
    const { http } = buildTestApp();
    const id = await createProduct(http, [await createTopic(http, 'AI')], {
      status: 'COMING_SOON',
    });

    const response = await http.post(`/api/products/${id}/vote`).set('Authorization', USER);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PRODUCT_NOT_VOTABLE');
  });

  it('responds PRODUCT_NOT_FOUND for an unknown product', async () => {
    const { http } = buildTestApp();

    const response = await http.post('/api/products/missing/vote').set('Authorization', USER);

    expect(response.status).toBe(404);
  });
});
