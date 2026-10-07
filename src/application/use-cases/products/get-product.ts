import { ProductNotFoundError } from '../../../domain/errors/product-not-found-error';
import { GetProductInput, GetProductUseCase } from '../../ports/in/products/get-product';
import { ProductQueries } from '../../ports/out/products/product-queries';
import { ProductDetail } from '../../read-models/product-item';

export class GetProduct implements GetProductUseCase {
  constructor(private readonly queries: ProductQueries) {}

  async execute(input: GetProductInput): Promise<ProductDetail> {
    const product = await this.queries.getById(input.productId, input.locale);
    if (!product) throw new ProductNotFoundError(input.productId);
    return product;
  }
}
