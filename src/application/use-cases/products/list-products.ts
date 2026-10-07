import { DEFAULT_PRODUCT_STATUS } from '../../../domain/value-objects/product-status';
import { ListProductsInput, ListProductsUseCase } from '../../ports/in/products/list-products';
import { ProductQueries } from '../../ports/out/products/product-queries';
import { ProductListItem } from '../../read-models/product-item';

export class ListProducts implements ListProductsUseCase {
  constructor(private readonly queries: ProductQueries) {}

  execute(input: ListProductsInput): Promise<ProductListItem[]> {
    return this.queries.listPublic(
      {
        status: input.status ?? DEFAULT_PRODUCT_STATUS,
        topicSlug: input.topicSlug,
        reviewed: input.reviewed,
      },
      input.locale,
    );
  }
}
