import type { RequestHandler } from 'express';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { CacheStats } from '../adapters/out/cache/cached';

export interface Metrics {
  registry: Registry;
  requestMiddleware: RequestHandler;
  recordError(code: string): void;
  cacheStats: CacheStats;
}

export function createMetrics(): Metrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const duration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency by route',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });
  const errors = new Counter({
    name: 'http_errors_total',
    help: 'Error responses by error code',
    labelNames: ['code'],
    registers: [registry],
  });
  const lookups = new Counter({
    name: 'cache_lookups_total',
    help: 'Cache lookups by result',
    labelNames: ['result'],
    registers: [registry],
  });

  return {
    registry,
    requestMiddleware: (req, res, next) => {
      const stop = duration.startTimer();
      res.on('finish', () => {
        stop({
          method: req.method,
          route: req.route?.path ?? 'unmatched',
          status: String(res.statusCode),
        });
      });
      next();
    },
    recordError: (code) => errors.inc({ code }),
    cacheStats: { record: (hit) => lookups.inc({ result: hit ? 'hit' : 'miss' }) },
  };
}
