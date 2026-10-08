import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ERROR_CATALOG } from '../../src/infrastructure/adapters/in/http/error-catalog';
import { createApp } from '../../src/infrastructure/adapters/in/http/app';
import { ForbiddenError } from '../../src/domain/errors/forbidden-error';

const errorsDir = join(__dirname, '../../src/domain/errors');

const domainErrorCodes = readdirSync(errorsDir)
  .filter((file) => file !== 'domain-error.ts')
  .flatMap((file) => [
    ...readFileSync(join(errorsDir, file), 'utf8').matchAll(/super\(\s*'([A-Z_]+)'/g),
  ])
  .map((match) => match[1] as string);

describe('error contract', () => {
  it('finds the domain error codes', () => {
    expect(domainErrorCodes.length).toBeGreaterThan(0);
  });

  it.each(domainErrorCodes)('catalogs domain error %s', (code) => {
    expect(ERROR_CATALOG).toHaveProperty(code);
  });

  it.each(Object.entries(ERROR_CATALOG))('%s maps to a valid HTTP error status', (code, status) => {
    expect(code).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(600);
  });

  it('answers every error with the single response format', async () => {
    const app = createApp({
      registerRoutes: (instance) => {
        instance.get('/boom', () => {
          throw new ForbiddenError();
        });
      },
    });

    const response = await request(app).get('/boom').set('X-Request-Id', 'req-1');

    expect(response.status).toBe(403);
    expect(response.headers['x-request-id']).toBe('req-1');
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        status: 403,
        message: 'Admin role required',
        requestId: 'req-1',
      },
    });
  });
});
