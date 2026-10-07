import {
  ImageStorage,
  StoredImage,
} from '../../../../application/ports/out/products/image-storage';

export class InMemoryImageStorage implements ImageStorage {
  readonly files = new Map<string, StoredImage>();

  constructor(private readonly baseUrl = 'http://localhost/uploads') {}

  async put(image: StoredImage): Promise<string> {
    this.files.set(image.fileName, image);
    return `${this.baseUrl}/${image.fileName}`;
  }
}
