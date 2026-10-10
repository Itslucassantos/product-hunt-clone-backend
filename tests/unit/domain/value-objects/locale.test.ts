import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../../src/domain/errors/validation-error';
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  parseLocale,
} from '../../../../src/domain/value-objects/locale';

describe('Locale', () => {
  it('lists the supported locales and defaults to en', () => {
    expect(LOCALES).toEqual(['en', 'pt-BR']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it.each(['en', 'pt-BR'])('accepts %s', (value) => {
    expect(isLocale(value)).toBe(true);
    expect(parseLocale(value)).toBe(value);
  });

  it.each(['pt', 'pt-br', 'EN', '', null, undefined, 1])('rejects %s', (value) => {
    expect(isLocale(value)).toBe(false);
    expect(() => parseLocale(value)).toThrow(ValidationError);
  });
});
