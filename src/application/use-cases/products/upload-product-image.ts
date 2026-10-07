import { ImageTooLargeError } from '../../../domain/errors/image-too-large-error';
import { UnsupportedImageTypeError } from '../../../domain/errors/unsupported-image-type-error';
import { requireAdmin } from '../../policies/require-admin';
import {
  UploadProductImageInput,
  UploadProductImageOutput,
  UploadProductImageUseCase,
} from '../../ports/in/products/upload-product-image';
import { ImageStorage } from '../../ports/out/products/image-storage';
import { IdGenerator } from '../../ports/out/shared/id-generator';
import { detectImageType } from './detect-image-type';

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export class UploadProductImage implements UploadProductImageUseCase {
  constructor(
    private readonly storage: ImageStorage,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: UploadProductImageInput): Promise<UploadProductImageOutput> {
    requireAdmin(input.actor);

    if (input.content.length > MAX_PRODUCT_IMAGE_BYTES) {
      throw new ImageTooLargeError(MAX_PRODUCT_IMAGE_BYTES);
    }

    const type = detectImageType(input.content);
    if (!type) throw new UnsupportedImageTypeError();

    const imageUrl = await this.storage.put({
      fileName: `${this.ids.next()}.${type.extension}`,
      content: input.content,
      contentType: type.contentType,
    });
    return { imageUrl };
  }
}
