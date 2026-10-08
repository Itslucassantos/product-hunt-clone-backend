import { describe, expect, it } from 'vitest';
import { ADMIN, USER, buildTestApp } from '../../helpers/http';

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const { http } = buildTestApp();

    const response = await http.get('/api/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an invalid token', async () => {
    const { http } = buildTestApp();

    const response = await http.get('/api/me').set('Authorization', 'Bearer nope');

    expect(response.status).toBe(401);
  });

  it('creates the user on first request with role USER', async () => {
    const { http } = buildTestApp();

    const response = await http.get('/api/me').set('Authorization', USER);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('USER');
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('gives the dev admin the ADMIN role', async () => {
    const { http } = buildTestApp();

    const response = await http.get('/api/me').set('Authorization', ADMIN);

    expect(response.body.role).toBe('ADMIN');
  });

  it('forbids a regular user on admin routes', async () => {
    const { http } = buildTestApp();

    const response = await http.get('/api/admin/products').set('Authorization', USER);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
