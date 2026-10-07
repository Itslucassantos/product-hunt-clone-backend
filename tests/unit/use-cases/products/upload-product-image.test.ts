import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_PRODUCT_IMAGE_BYTES,
  UploadProductImage,
} from '../../../../src/application/use-cases/products/upload-product-image';
import { ForbiddenError } from '../../../../src/domain/errors/forbidden-error';
import { ImageTooLargeError } from '../../../../src/domain/errors/image-too-large-error';
import { UnsupportedImageTypeError } from '../../../../src/domain/errors/unsupported-image-type-error';
import { InMemoryImageStorage } from '../../../../src/infrastructure/adapters/out/storage/in-memory-image-storage';
import { FakeIdGenerator } from '../../../helpers/fakes';
import { admin, regularUser } from '../../../helpers/topics';

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

describe('UploadProductImage', () => {
  let storage: InMemoryImageStorage;
  let upload: UploadProductImage;

  beforeEach(() => {
    storage = new InMemoryImageStorage('https://cdn.test');
    upload = new UploadProductImage(storage, new FakeIdGenerator('img'));
  });

  it('stores a PNG under a server generated name and returns its url', async () => {
    const output = await upload.execute({ actor: admin, content: png });

    expect(output).toEqual({ imageUrl: 'https://cdn.test/img-1.png' });
    expect(storage.files.get('img-1.png')).toMatchObject({ contentType: 'image/png' });
  });

  it('stores a JPEG with the jpg extension', async () => {
    const output = await upload.execute({ actor: admin, content: jpeg });

    expect(output.imageUrl).toBe('https://cdn.test/img-1.jpg');
    expect(storage.files.get('img-1.jpg')).toMatchObject({ contentType: 'image/jpeg' });
  });

  it('accepts a file of exactly the maximum size', async () => {
    const content = new Uint8Array(MAX_PRODUCT_IMAGE_BYTES);
    content.set(png);

    await expect(upload.execute({ actor: admin, content })).resolves.toBeDefined();
  });

  it('rejects files above the maximum size', async () => {
    const content = new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1);
    content.set(png);

    await expect(upload.execute({ actor: admin, content })).rejects.toBeInstanceOf(
      ImageTooLargeError,
    );
    expect(storage.files.size).toBe(0);
  });

  it('rejects content that is not PNG or JPEG', async () => {
    const gif = new TextEncoder().encode('GIF89a-not-allowed');

    await expect(upload.execute({ actor: admin, content: gif })).rejects.toBeInstanceOf(
      UnsupportedImageTypeError,
    );
    await expect(
      upload.execute({ actor: admin, content: new Uint8Array() }),
    ).rejects.toBeInstanceOf(UnsupportedImageTypeError);
    expect(storage.files.size).toBe(0);
  });

  it('rejects non-admin actors', async () => {
    await expect(upload.execute({ actor: regularUser, content: png })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
