import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../../src/infrastructure/adapters/in/http/app';
import { ValidationError } from '../../../src/domain/errors/validation-error';

const app = createApp({
  registerRoutes: (instance) => {
    instance.post('/echo', (req, res) => {
      z.object({ title: z.string().min(1) }).parse(req.body);
      res.status(204).end();
    });
    instance.get('/invalid', () => {
      throw new ValidationError([{ field: 'title', code: 'REQUIRED' }]);
    });
    instance.get('/crash', () => {
      throw new Error('secret database detail');
    });
  },
});

describe('HTTP error handling', () => {
  it('responds ROUTE_NOT_FOUND for unknown routes', async () => {
    const response = await request(app).get('/nope');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('responds MALFORMED_REQUEST for invalid JSON', async () => {
    const response = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{bad');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MALFORMED_REQUEST');
  });

  it('maps zod errors to VALIDATION_ERROR with field details', async () => {
    const response = await request(app).post('/echo').send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual([{ field: 'title', code: 'TOO_SHORT' }]);
  });

  it('includes domain error details', async () => {
    const response = await request(app).get('/invalid');

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([{ field: 'title', code: 'REQUIRED' }]);
  });

  it('hides internals of unexpected errors', async () => {
    const response = await request(app).get('/crash');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('generates a request id when the client sends none', async () => {
    const response = await request(app).get('/health');

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
