import { Locale } from '../../../../domain/value-objects/locale';
import { ProductStatus } from '../../../../domain/value-objects/product-status';
import { ProductListItem } from '../../../read-models/product-item';

export interface ListProductsInput {
  locale: Locale;
  status?: ProductStatus;
  topicSlug?: string;
  reviewed?: boolean;
}

export interface ListProductsUseCase {
  execute(input: ListProductsInput): Promise<ProductListItem[]>;
}
