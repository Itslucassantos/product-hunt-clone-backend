import type { Request, Response } from 'express';
import { UploadProductImageUseCase } from '../../../../../application/ports/in/products/upload-product-image';
import { ValidationError } from '../../../../../domain/errors/validation-error';
import { actorOf } from '../middlewares/authenticate';

export function uploadsController(uploadProductImage: UploadProductImageUseCase) {
  return {
    async productImage(req: Request, res: Response) {
      if (!req.file) throw new ValidationError([{ field: 'file', code: 'REQUIRED' }]);
      const output = await uploadProductImage.execute({
        actor: actorOf(res),
        content: req.file.buffer,
      });
      res.status(201).json(output);
    },
  };
}
