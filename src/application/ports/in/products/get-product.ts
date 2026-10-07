import { Locale } from '../../../../domain/value-objects/locale';
import { ProductDetail } from '../../../read-models/product-item';

export interface GetProductInput {
  productId: string;
  locale: Locale;
}

export interface GetProductUseCase {
  execute(input: GetProductInput): Promise<ProductDetail>;
}
