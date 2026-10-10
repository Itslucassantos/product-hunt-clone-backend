import { z } from 'zod';
import { PRODUCT_STATUS, ProductStatus } from '../../../../../domain/value-objects/product-status';
import { localeQuery } from './common.schemas';

const statusQuery = z
  .enum(['published', 'coming-soon'])
  .transform((value): ProductStatus => (value === 'coming-soon' ? 'COMING_SOON' : 'PUBLISHED'));

export const listProductsQuery = localeQuery.extend({
  status: statusQuery.optional(),
  topic: z.string().min(1).optional(),
  reviewed: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const createProductBody = z.object({
  title: z.string(),
  description: z.string(),
  longDescription: z.string().nullish(),
  url: z.string(),
  imageUrl: z.string().nullish(),
  status: z.enum(PRODUCT_STATUS).optional(),
  topicIds: z.array(z.string()),
});

export const updateProductBody = createProductBody.partial();

export const reviewBody = z.object({
  rating: z.number(),
  summary: z.string(),
});
