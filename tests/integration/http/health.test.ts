import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../src/infrastructure/adapters/in/http/app';

describe('GET /health', () => {
  it('responds with status ok', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
