import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ImageStorage,
  StoredImage,
} from '../../../../application/ports/out/products/image-storage';

export class LocalImageStorage implements ImageStorage {
  constructor(
    private readonly directory: string,
    private readonly baseUrl: string,
  ) {}

  async put(image: StoredImage): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, image.fileName), image.content);
    return `${this.baseUrl}/${image.fileName}`;
  }
}
