import { DomainError } from './domain-error';

export class UnsupportedImageTypeError extends DomainError {
  constructor() {
    super('UNSUPPORTED_IMAGE_TYPE', 'Only PNG and JPEG images are supported');
  }
}
