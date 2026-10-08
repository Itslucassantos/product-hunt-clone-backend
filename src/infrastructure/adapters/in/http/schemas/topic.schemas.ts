import { z } from 'zod';

const translation = z.object({
  name: z.string(),
  description: z.string().nullable().default(null),
});

export const topicBody = z.object({
  translations: z.object({
    en: translation,
    'pt-BR': translation,
  }),
});

export const reorderTopicsBody = z.object({ ids: z.array(z.string()) });
