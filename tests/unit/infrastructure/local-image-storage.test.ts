import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalImageStorage } from '../../../src/infrastructure/adapters/out/storage/local-image-storage';

describe('LocalImageStorage', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'images-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes the file to the directory, creating it, and returns its public url', async () => {
    const directory = join(root, 'files');
    const storage = new LocalImageStorage(directory, 'http://localhost:3333/files');

    const url = await storage.put({
      fileName: 'a.png',
      content: Buffer.from([1, 2, 3]),
      contentType: 'image/png',
    });

    expect(url).toBe('http://localhost:3333/files/a.png');
    expect([...(await readFile(join(directory, 'a.png')))]).toEqual([1, 2, 3]);
  });
});
