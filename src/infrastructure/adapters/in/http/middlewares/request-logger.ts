import type { RequestHandler } from 'express';
import type { Logger } from '../../../../logging/logger';

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info(
        {
          requestId: res.locals.requestId,
          method: req.method,
          route: req.route?.path ?? req.path,
          status: res.statusCode,
          latencyMs: Math.round(latencyMs * 100) / 100,
          userId: res.locals.actor?.id,
        },
        'request completed',
      );
    });
    next();
  };
}
