import express from 'express';
import type { Express } from 'express';
import { createLogger } from '../../../logging/logger';
import type { Logger } from '../../../logging/logger';
import { errorHandler } from './middlewares/error-handler';
import { notFound } from './middlewares/not-found';
import { requestId } from './middlewares/request-id';
import { requestLogger } from './middlewares/request-logger';
import { securityHeaders } from './middlewares/security-headers';
import { healthRoutes } from './routes/health.routes';

export interface AppOptions {
  logger?: Logger;
  corsOrigin?: string;
  filesDir?: string;
  registerRoutes?: (app: Express) => void;
}

export function createApp(options: AppOptions = {}): Express {
  const logger = options.logger ?? createLogger('silent');
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId());
  app.use(requestLogger(logger));
  app.use(...securityHeaders(options.corsOrigin ?? ''));
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  if (options.filesDir) {
    app.use(
      '/files',
      (_req, res, next) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
      },
      express.static(options.filesDir, { index: false, dotfiles: 'deny' }),
    );
  }
  app.use(healthRoutes());
  options.registerRoutes?.(app);
  app.use(notFound());
  app.use(errorHandler(logger));
  return app;
}
