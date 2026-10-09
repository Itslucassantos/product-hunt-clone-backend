import type { NextFunction, Request, Response } from 'express';
import { ImageQueries } from '../../../../../application/ports/out/products/image-queries';

const FILE_NAME = /^[A-Za-z0-9-]+\.(png|jpg)$/;

export function imagesController(images: ImageQueries) {
  return {
    async get(req: Request, res: Response, next: NextFunction) {
      const fileName = String(req.params.fileName);
      const image = FILE_NAME.test(fileName) ? await images.find(fileName) : null;
      if (!image) return next();

      res.setHeader('Content-Type', image.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.send(Buffer.from(image.content));
    },
  };
}
