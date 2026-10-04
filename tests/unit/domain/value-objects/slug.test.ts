import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import { Slug } from '../../../../src/domain/value-objects/slug';

describe('Slug', () => {
  describe('fromName', () => {
    it.each([
      ['AI', 'ai'],
      ['SaaS', 'saas'],
      ['Developer Tools', 'developer-tools'],
      ['Produtividade & Gestão', 'produtividade-gestao'],
      ['  Spaced   out  ', 'spaced-out'],
      ['--Already-hyphenated--', 'already-hyphenated'],
      ['Web 3.0', 'web-3-0'],
    ])('turns "%s" into "%s"', (name, expected) => {
      expect(Slug.fromName(name).value).toBe(expected);
    });

    it.each(['', '   ', '!!!', '日本語'])('rejects "%s"', (name) => {
      expect(() => Slug.fromName(name)).toThrow(ValidationError);
    });
  });

  describe('of', () => {
    it('accepts a well-formed slug', () => {
      expect(Slug.of('developer-tools').value).toBe('developer-tools');
    });

    it.each(['', 'AI', 'a b', '-ai', 'ai-', 'a--b', 'gestão'])('rejects "%s"', (value) => {
      expect(() => Slug.of(value)).toThrow(ValidationError);
    });
  });

  it('compares by value', () => {
    expect(Slug.of('ai').equals(Slug.fromName('AI'))).toBe(true);
    expect(Slug.of('ai').equals(Slug.of('saas'))).toBe(false);
  });
});
