export interface StoredImage {
  fileName: string;
  content: Uint8Array;
  contentType: string;
}

export interface ImageStorage {
  put(image: StoredImage): Promise<string>;
}
