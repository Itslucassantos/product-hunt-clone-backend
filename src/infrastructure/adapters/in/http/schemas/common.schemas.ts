import { z } from 'zod';
import { DEFAULT_LOCALE, LOCALES } from '../../../../../domain/value-objects/locale';

export const localeQuery = z.object({
  locale: z.enum(LOCALES).default(DEFAULT_LOCALE),
});

export const idParam = z.object({ id: z.string().min(1) });
