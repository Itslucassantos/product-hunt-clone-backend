import { createApp } from '../infrastructure/adapters/in/http/app';
import { registerRoutes } from '../infrastructure/adapters/in/http/routes';
import { loadEnv } from '../infrastructure/config/env';
import { buildContainer } from './container';
import { seed } from './seed';

export async function startServer(): Promise<void> {
  const env = loadEnv();
  const container = buildContainer(env);
  const { logger } = container;

  if (env.NODE_ENV === 'development' && env.REPOSITORY_DRIVER === 'memory') {
    await seed(container);
    logger.info('in-memory data seeded; admin token: dev:dev-admin');
  }

  const app = createApp({
    logger,
    corsOrigin: container.corsOrigin,
    trustProxy: container.trustProxy,
    healthChecks: container.healthChecks,
    requestMetrics: container.requestMetrics,
    errorHooks: container.errorHooks,
    registerRoutes: registerRoutes(container),
  });

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API listening');
  });

  const shutdown = () => {
    server.close(() => {
      container
        .shutdown()
        .catch((error) => logger.error({ err: error }, 'shutdown failed'))
        .finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
