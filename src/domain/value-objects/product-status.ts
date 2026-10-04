import { ValidationError } from '../errors/validation-error';

export const PRODUCT_STATUS = ['PUBLISHED', 'COMING_SOON'] as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[number];

export const DEFAULT_PRODUCT_STATUS: ProductStatus = 'PUBLISHED';

export function isProductStatus(value: unknown): value is ProductStatus {
  return typeof value === 'string' && PRODUCT_STATUS.includes(value as ProductStatus);
}

export function parseProductStatus(value: unknown): ProductStatus {
  if (!isProductStatus(value)) {
    throw new ValidationError([{ field: 'status', code: 'INVALID_VALUE' }]);
  }
  return value;
}
