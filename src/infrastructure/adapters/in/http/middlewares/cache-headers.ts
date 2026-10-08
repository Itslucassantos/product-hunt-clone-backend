import type { RequestHandler } from 'express';

export function publicCache(maxAgeSeconds: number): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}`);
    next();
  };
}

export function privateNoStore(): RequestHandler {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  };
}
