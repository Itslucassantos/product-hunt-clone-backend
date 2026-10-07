import { Actor } from '../shared/actor';

export interface UploadProductImageInput {
  actor: Actor;
  content: Uint8Array;
}

export interface UploadProductImageOutput {
  imageUrl: string;
}

export interface UploadProductImageUseCase {
  execute(input: UploadProductImageInput): Promise<UploadProductImageOutput>;
}
