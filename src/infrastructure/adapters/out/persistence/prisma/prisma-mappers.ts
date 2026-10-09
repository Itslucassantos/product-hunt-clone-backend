import { Locale as DbLocale } from '../../../../../generated/prisma/client';
import { Locale } from '../../../../../domain/value-objects/locale';

export function toDbLocale(locale: Locale): DbLocale {
  return locale === 'pt-BR' ? 'pt_BR' : 'en';
}

export function fromDbLocale(locale: DbLocale): Locale {
  return locale === 'pt_BR' ? 'pt-BR' : 'en';
}
