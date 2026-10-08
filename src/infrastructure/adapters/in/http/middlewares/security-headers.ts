import cors from 'cors';
import helmet from 'helmet';
import type { RequestHandler } from 'express';

export function securityHeaders(corsOrigin: string): RequestHandler[] {
  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [helmet(), cors({ origin: origins, exposedHeaders: ['X-Request-Id', 'Retry-After'] })];
}
