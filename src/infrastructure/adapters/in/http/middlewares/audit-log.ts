import type { RequestHandler } from 'express';
import type { Logger } from '../../../../logging/logger';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditAdminWrites(logger: Logger): RequestHandler {
  return (req, res, next) => {
    res.on('finish', () => {
      const actor = res.locals.actor as { id: string; role: string } | undefined;
      if (actor?.role !== 'ADMIN' || !WRITE_METHODS.has(req.method)) return;
      if (req.path.endsWith('/vote')) return;
      logger.info(
        {
          audit: true,
          requestId: res.locals.requestId,
          userId: actor.id,
          method: req.method,
          path: `${req.baseUrl}${req.path}`,
          status: res.statusCode,
        },
        'admin write',
      );
    });
    next();
  };
}
