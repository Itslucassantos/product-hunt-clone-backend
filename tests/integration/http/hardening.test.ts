import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/infrastructure/adapters/in/http/app';
import { registerRoutes } from '../../../src/infrastructure/adapters/in/http/routes';
import { loadEnv } from '../../../src/infrastructure/config/env';
import { buildContainer } from '../../../src/main/container';
import { ADMIN, USER, buildTestApp, createProduct, createTopic } from '../../helpers/http';

describe('rate limiting', () => {
  it('blocks the 31st vote of a user within a minute', async () => {
    const { http } = buildTestApp();
    const topicId = await createTopic(http, 'AI');
    const productId = await createProduct(http, [topicId]);

    let last = await http.post(`/api/products/${productId}/vote`).set('Authorization', USER);
    for (let i = 1; i < 30; i += 1) {
      last = await http.post(`/api/products/${productId}/vote`).set('Authorization', USER);
    }
    const blocked = await http.post(`/api/products/${productId}/vote`).set('Authorization', USER);
    const other = await http
      .post(`/api/products/${productId}/vote`)
      .set('Authorization', 'Bearer dev:user-2');

    expect(last.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.error.details.retryAfterSeconds).toBeGreaterThan(0);
    expect(other.status).toBe(200);
  });

  it('blocks public reads above 120 per minute per ip', async () => {
    const { http } = buildTestApp();

    for (let i = 0; i < 120; i += 1) await http.get('/api/topics');
    const blocked = await http.get('/api/topics');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('limits uploads to 10 per minute per user', async () => {
    const { http } = buildTestApp();
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(8),
    ]);

    for (let i = 0; i < 10; i += 1) {
      const ok = await http
        .post('/api/uploads/product-image')
        .set('Authorization', ADMIN)
        .attach('file', png, 'a.png');
      expect(ok.status).toBe(201);
    }
    const blocked = await http
      .post('/api/uploads/product-image')
      .set('Authorization', ADMIN)
      .attach('file', png, 'a.png');

    expect(blocked.status).toBe(429);
  });

  it('can be switched off', async () => {
    const { http } = buildTestApp({ RATE_LIMIT_DRIVER: 'none' });

    for (let i = 0; i < 125; i += 1) await http.get('/api/topics');
    const response = await http.get('/api/topics');

    expect(response.status).toBe(200);
  });
});

describe('readiness', () => {
  it('reports ok when every dependency answers', async () => {
    const app = createApp({
      healthChecks: [
        { name: 'database', critical: true, check: async () => {} },
        { name: 'redis', critical: false, check: async () => {} },
      ],
    });

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } });
  });

  it('answers 503 when the database is down', async () => {
    const app = createApp({
      healthChecks: [
        {
          name: 'database',
          critical: true,
          check: async () => {
            throw new Error('down');
          },
        },
      ],
    });

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(response.body.error.details).toEqual({ database: 'down' });
  });

  it('stays available but degraded when only redis is down', async () => {
    const app = createApp({
      healthChecks: [
        { name: 'database', critical: true, check: async () => {} },
        {
          name: 'redis',
          critical: false,
          check: async () => {
            throw new Error('down');
          },
        },
      ],
    });

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'degraded',
      checks: { database: 'ok', redis: 'down' },
    });
  });
});

describe('request body limit', () => {
  it('rejects a JSON body above 100 KB', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/topics')
      .set('Authorization', ADMIN)
      .send({ translations: { en: { name: 'x'.repeat(120 * 1024) } } });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });
});

describe('admin audit log', () => {
  it('logs admin writes with the user and request id, and ignores reads and votes', async () => {
    const lines: string[] = [];
    const logger = pino({ level: 'info' }, { write: (line: string) => lines.push(line) });
    const container = buildContainer(loadEnv({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
    const http = request(
      createApp({ logger, registerRoutes: registerRoutes({ ...container, logger }) }),
    );

    const topic = await http
      .post('/api/topics')
      .set('Authorization', ADMIN)
      .send({ translations: { en: { name: 'AI' }, 'pt-BR': { name: 'IA' } } });
    await http.get('/api/topics');
    await http.post(`/api/products/none/vote`).set('Authorization', ADMIN);

    const audits = lines.map((line) => JSON.parse(line)).filter((entry) => entry.audit);
    expect(topic.status).toBe(201);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      method: 'POST',
      path: '/api/topics',
      status: 201,
      userId: expect.any(String),
      requestId: expect.any(String),
    });
  });
});

describe('metrics', () => {
  it('is not exposed without a token', async () => {
    const { http } = buildTestApp();

    expect((await http.get('/metrics')).status).toBe(404);
  });

  it('requires the bearer token', async () => {
    const { http } = buildTestApp({ METRICS_TOKEN: 'secret' });

    expect((await http.get('/metrics')).status).toBe(401);
    expect((await http.get('/metrics').set('Authorization', 'Bearer wrong')).status).toBe(401);
  });

  it('exposes latency, error and cache counters', async () => {
    const { http } = buildTestApp({ METRICS_TOKEN: 'secret', CACHE_DRIVER: 'memory' });
    await http.get('/api/topics');
    await http.get('/api/topics');
    await http.get('/api/products/missing');

    const response = await http.get('/metrics').set('Authorization', 'Bearer secret');

    expect(response.status).toBe(200);
    expect(response.text).toContain('http_request_duration_seconds_bucket');
    expect(response.text).toContain('route="/topics"');
    expect(response.text).toContain('http_errors_total{code="PRODUCT_NOT_FOUND"} 1');
    expect(response.text).toContain('cache_lookups_total{result="hit"} 1');
    expect(response.text).toContain('cache_lookups_total{result="miss"}');
  });
});

describe('cached reads', () => {
  it('serves a list from the cache and refreshes it after an admin write', async () => {
    const { http } = buildTestApp({ CACHE_DRIVER: 'memory' });
    const topicId = await createTopic(http, 'AI');
    await createProduct(http, [topicId], { title: 'First' });
    const before = await http.get('/api/products');

    await createProduct(http, [topicId], { title: 'Second' });
    const after = await http.get('/api/products');

    expect(before.body).toHaveLength(1);
    expect(after.body).toHaveLength(2);
  });

  it('returns the detail with a valid creation date from the cache', async () => {
    const { http } = buildTestApp({ CACHE_DRIVER: 'memory' });
    const topicId = await createTopic(http, 'AI');
    const productId = await createProduct(http, [topicId]);

    await http.get(`/api/products/${productId}`);
    const second = await http.get(`/api/products/${productId}`);

    expect(second.status).toBe(200);
    expect(new Date(second.body.createdAt).toString()).not.toBe('Invalid Date');
  });
});
