import express from 'express';
import type { Express, RequestHandler } from 'express';
import { createLogger } from '../../../logging/logger';
import type { Logger } from '../../../logging/logger';
import { ErrorHooks, errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { requestId } from './middlewares/request-id';
import { requestLogger } from './middlewares/request-logger';
import { securityHeaders } from './middlewares/security-headers';
import { HealthCheck, healthRoutes } from './routes/health.routes';

export interface AppOptions {
  logger?: Logger;
  corsOrigin?: string;
  trustProxy?: number;
  healthChecks?: HealthCheck[];
  requestMetrics?: RequestHandler;
  errorHooks?: ErrorHooks;
  registerRoutes?: (app: Express) => void;
}

export function createApp(options: AppOptions = {}): Express {
  const logger = options.logger ?? createLogger('silent');
  const app = express();
  app.disable('x-powered-by');

  if (options.trustProxy) app.set('trust proxy', options.trustProxy);

  app.use(requestId());

  if (options.requestMetrics) app.use(options.requestMetrics);

  app.use(requestLogger(logger));
  app.use(...securityHeaders(options.corsOrigin ?? ''));
  app.use(
    express.json({
      limit: '100kb',
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(healthRoutes(options.healthChecks));
  options.registerRoutes?.(app);
  app.use(notFound());
  app.use(errorHandler(logger, options.errorHooks));

  return app;
}
