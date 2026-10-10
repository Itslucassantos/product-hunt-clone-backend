import { Locale } from '../../../../domain/value-objects/locale';
import { ProductStatus } from '../../../../domain/value-objects/product-status';
import {
  AdminProductListItem,
  ProductDetail,
  ProductListItem,
} from '../../../read-models/product-item';

export interface ProductListFilter {
  status: ProductStatus;
  topicSlug?: string;
  reviewed?: boolean;
}

export interface ProductQueries {
  listPublic(filter: ProductListFilter, locale: Locale): Promise<ProductListItem[]>;
  getById(id: string, locale: Locale): Promise<ProductDetail | null>;
  listForAdmin(locale: Locale): Promise<AdminProductListItem[]>;
}
