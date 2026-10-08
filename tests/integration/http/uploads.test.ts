import { describe, expect, it } from 'vitest';
import { ADMIN, USER, buildTestApp } from '../../helpers/http';

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

describe('POST /api/uploads/product-image', () => {
  it('stores a PNG and returns its url', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/uploads/product-image')
      .set('Authorization', ADMIN)
      .attach('file', png, 'logo.png');

    expect(response.status).toBe(201);
    expect(response.body.imageUrl).toMatch(/\.png$/);
  });

  it('rejects a non-image file by content', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/uploads/product-image')
      .set('Authorization', ADMIN)
      .attach('file', Buffer.from('not an image at all'), 'logo.png');

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('UNSUPPORTED_IMAGE_TYPE');
  });

  it('rejects an image above 5 MB', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/uploads/product-image')
      .set('Authorization', ADMIN)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), 'big.png');

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('IMAGE_TOO_LARGE');
    expect(response.body.error.details).toEqual({ maxBytes: 5 * 1024 * 1024 });
  });

  it('requires a file', async () => {
    const { http } = buildTestApp();

    const response = await http.post('/api/uploads/product-image').set('Authorization', ADMIN);

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([{ field: 'file', code: 'REQUIRED' }]);
  });

  it('forbids non-admins', async () => {
    const { http } = buildTestApp();

    const response = await http
      .post('/api/uploads/product-image')
      .set('Authorization', USER)
      .attach('file', png, 'logo.png');

    expect(response.status).toBe(403);
  });
});
