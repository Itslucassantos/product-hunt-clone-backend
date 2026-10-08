import type { RequestHandler } from 'express';
import { sendError } from './error-handler';

export function notFound(): RequestHandler {
  return (req, res) => {
    sendError(res, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`);
  };
}
