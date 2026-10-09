import { StoredImage } from './image-storage';

export interface ImageQueries {
  find(fileName: string): Promise<StoredImage | null>;
}
