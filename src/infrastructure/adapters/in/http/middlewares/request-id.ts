import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

const MAX_LENGTH = 128;

export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.length <= MAX_LENGTH ? incoming : randomUUID();
    res.locals.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}
