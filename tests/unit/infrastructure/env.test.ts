import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../src/infrastructure/config/env';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv({});

    expect(env.PORT).toBe(3333);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.ADMIN_EXTERNAL_IDS).toEqual([]);
  });

  it('parses the admin id list', () => {
    expect(loadEnv({ ADMIN_EXTERNAL_IDS: 'a, b,,c' }).ADMIN_EXTERNAL_IDS).toEqual(['a', 'b', 'c']);
  });

  it('fails naming the invalid variable', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
