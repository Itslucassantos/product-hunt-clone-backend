import multer from 'multer';
import { MAX_PRODUCT_IMAGE_BYTES } from '../../../../../application/use-cases/products/upload-product-image';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 1 },
}).single('file');
