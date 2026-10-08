import request from 'supertest';
import { createApp } from '../../src/infrastructure/adapters/in/http/app';
import { registerRoutes } from '../../src/infrastructure/adapters/in/http/routes';
import { loadEnv } from '../../src/infrastructure/config/env';
import { buildContainer } from '../../src/main/container';

export const ADMIN = 'Bearer dev:dev-admin';
export const USER = 'Bearer dev:user-1';

export function buildTestApp(overrides: Record<string, string> = {}) {
  const container = buildContainer(
    loadEnv({ NODE_ENV: 'test', LOG_LEVEL: process.env.TEST_LOG ?? 'silent', ...overrides }),
  );
  const app = createApp({ logger: container.logger, registerRoutes: registerRoutes(container) });
  return { app, http: request(app) };
}

export const topicBody = (en: string, pt = en) => ({
  translations: { en: { name: en }, 'pt-BR': { name: pt } },
});

export async function createTopic(http: ReturnType<typeof request>, en: string, pt = en) {
  const response = await http
    .post('/api/topics')
    .set('Authorization', ADMIN)
    .send(topicBody(en, pt));
  return response.body.id as string;
}

export async function createProduct(
  http: ReturnType<typeof request>,
  topicIds: string[],
  extra: Record<string, unknown> = {},
) {
  const response = await http
    .post('/api/products')
    .set('Authorization', ADMIN)
    .send({
      title: 'Lumen',
      description: 'Short description',
      url: 'https://lumen.app',
      topicIds,
      ...extra,
    });
  return response.body.id as string;
}
