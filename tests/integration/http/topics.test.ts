import { describe, expect, it } from 'vitest';
import {
  ADMIN,
  USER,
  buildTestApp,
  createProduct,
  createTopic,
  topicBody,
} from '../../helpers/http';

describe('topics routes', () => {
  it('creates and lists topics by locale with cache headers', async () => {
    const { http } = buildTestApp();
    await createTopic(http, 'AI', 'IA');

    const en = await http.get('/api/topics');
    const pt = await http.get('/api/topics?locale=pt-BR');

    expect(en.body).toMatchObject([{ slug: 'ai', name: 'AI', position: 0, productCount: 0 }]);
    expect(pt.body[0].name).toBe('IA');
    expect(en.headers['cache-control']).toBe('public, max-age=60');
  });

  it('rejects an invalid locale', async () => {
    const { http } = buildTestApp();

    const response = await http.get('/api/topics?locale=fr');

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([{ field: 'locale', code: 'INVALID' }]);
  });

  it('requires admin to create', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/topics')
      .set('Authorization', USER)
      .send(topicBody('AI'));

    expect(response.status).toBe(403);
  });

  it('reports a missing translation', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/topics')
      .set('Authorization', ADMIN)
      .send({ translations: { en: { name: 'AI' } } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate topic', async () => {
    const { http } = buildTestApp();
    await createTopic(http, 'AI');

    const response = await http
      .post('/api/topics')
      .set('Authorization', ADMIN)
      .send(topicBody('AI'));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TOPIC_ALREADY_EXISTS');
  });

  it('updates, reorders and deletes', async () => {
    const { http } = buildTestApp();
    const ai = await createTopic(http, 'AI');
    const saas = await createTopic(http, 'SaaS');

    const update = await http
      .patch(`/api/topics/${ai}`)
      .set('Authorization', ADMIN)
      .send(topicBody('AI', 'Inteligência Artificial'));
    const reorder = await http
      .put('/api/topics/order')
      .set('Authorization', ADMIN)
      .send({ ids: [saas, ai] });
    const remove = await http.delete(`/api/topics/${saas}`).set('Authorization', ADMIN);
    const list = await http.get('/api/topics?locale=pt-BR');

    expect([update.status, reorder.status, remove.status]).toEqual([204, 204, 204]);
    expect(list.body).toMatchObject([{ id: ai, name: 'Inteligência Artificial' }]);
  });

  it('rejects an incomplete reorder', async () => {
    const { http } = buildTestApp();
    await createTopic(http, 'AI');
    await createTopic(http, 'SaaS');

    const response = await http
      .put('/api/topics/order')
      .set('Authorization', ADMIN)
      .send({ ids: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_TOPIC_ORDER');
  });

  it('blocks deleting a topic that is the only topic of a product', async () => {
    const { http } = buildTestApp();
    const ai = await createTopic(http, 'AI');
    await createProduct(http, [ai]);

    const response = await http.delete(`/api/topics/${ai}`).set('Authorization', ADMIN);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TOPIC_IN_USE');
    expect(response.body.error.details.total).toBe(1);
  });
});
