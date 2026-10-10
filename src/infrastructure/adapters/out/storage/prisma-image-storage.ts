import { ImageQueries } from '../../../../application/ports/out/products/image-queries';
import {
  ImageStorage,
  StoredImage,
} from '../../../../application/ports/out/products/image-storage';
import { PrismaContext } from '../persistence/prisma/prisma-context';

export class PrismaImageStorage implements ImageStorage, ImageQueries {
  constructor(
    private readonly context: PrismaContext,
    private readonly baseUrl: string,
  ) {}

  async put(image: StoredImage): Promise<string> {
    await this.context.client.productImage.create({
      data: {
        id: image.fileName,
        contentType: image.contentType,
        data: Buffer.from(image.content),
      },
    });
    return `${this.baseUrl}/${image.fileName}`;
  }

  async find(fileName: string): Promise<StoredImage | null> {
    const row = await this.context.client.productImage.findUnique({ where: { id: fileName } });
    return row ? { fileName: row.id, content: row.data, contentType: row.contentType } : null;
  }
}
