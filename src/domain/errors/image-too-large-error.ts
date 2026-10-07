import { DomainError } from './domain-error';

export class ImageTooLargeError extends DomainError {
  constructor(maxBytes: number) {
    super('IMAGE_TOO_LARGE', `Image exceeds ${maxBytes} bytes`, { maxBytes });
  }
}
