import express from 'express';
import type { Express } from 'express';
import { healthRoutes } from './routes/health.routes';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(healthRoutes());
  return app;
}
