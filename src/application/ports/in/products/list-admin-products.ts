import { Locale } from '../../../../domain/value-objects/locale';
import { AdminProductListItem } from '../../../read-models/product-item';
import { Actor } from '../shared/actor';

export interface ListAdminProductsInput {
  actor: Actor;
  locale: Locale;
}

export interface ListAdminProductsUseCase {
  execute(input: ListAdminProductsInput): Promise<AdminProductListItem[]>;
}
