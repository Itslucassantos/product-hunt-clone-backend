export interface ImageType {
  extension: 'png' | 'jpg';
  contentType: 'image/png' | 'image/jpeg';
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

const startsWith = (content: Uint8Array, signature: number[]) =>
  content.length >= signature.length && signature.every((byte, index) => content[index] === byte);

export function detectImageType(content: Uint8Array): ImageType | null {
  if (startsWith(content, PNG_SIGNATURE)) return { extension: 'png', contentType: 'image/png' };
  if (startsWith(content, JPEG_SIGNATURE)) return { extension: 'jpg', contentType: 'image/jpeg' };
  return null;
}
