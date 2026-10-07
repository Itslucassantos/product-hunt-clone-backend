import { requireAdmin } from '../../policies/require-admin';
import {
  ListAdminProductsInput,
  ListAdminProductsUseCase,
} from '../../ports/in/products/list-admin-products';
import { ProductQueries } from '../../ports/out/products/product-queries';
import { AdminProductListItem } from '../../read-models/product-item';

export class ListAdminProducts implements ListAdminProductsUseCase {
  constructor(private readonly queries: ProductQueries) {}

  async execute(input: ListAdminProductsInput): Promise<AdminProductListItem[]> {
    requireAdmin(input.actor);
    return this.queries.listForAdmin(input.locale);
  }
}
