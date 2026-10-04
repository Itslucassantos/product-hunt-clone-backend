import { ValidationError } from '../errors/validation-error';

export const LOCALES = ['en', 'pt-BR'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale);
}

export function parseLocale(value: unknown): Locale {
  if (!isLocale(value)) {
    throw new ValidationError([{ field: 'locale', code: 'INVALID_VALUE' }]);
  }
  return value;
}
