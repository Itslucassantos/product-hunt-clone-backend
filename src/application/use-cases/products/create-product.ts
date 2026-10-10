import { Product } from '../../../domain/entities/product';
import { ProductAlreadyExistsError } from '../../../domain/errors/product-already-exists-error';
import { DEFAULT_PRODUCT_STATUS } from '../../../domain/value-objects/product-status';
import { requireAdmin } from '../../policies/require-admin';
import {
  CreateProductInput,
  CreateProductOutput,
  CreateProductUseCase,
} from '../../ports/in/products/create-product';
import { ProductRepository } from '../../ports/out/products/product-repository';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { Clock } from '../../ports/out/shared/clock';
import { IdGenerator } from '../../ports/out/shared/id-generator';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';
import { TopicRepository } from '../../ports/out/topics/topic-repository';
import { assertTopicsExist } from './assert-topics-exist';

export class CreateProduct implements CreateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly topics: TopicRepository,
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: CreateProductInput): Promise<CreateProductOutput> {
    requireAdmin(input.actor);

    const product = Product.create(
      this.ids.next(),
      input.title,
      input.description,
      input.longDescription ?? null,
      input.url,
      input.imageUrl ?? null,
      input.status ?? DEFAULT_PRODUCT_STATUS,
      input.topicIds,
      this.clock.now(),
    );

    await this.uow.run(async () => {
      if (await this.products.existsByTitle(product.title)) throw new ProductAlreadyExistsError();
      await assertTopicsExist(this.topics, product.topicIds);
      await this.products.save(product);
    });

    await this.cache.bumpVersion('products');
    await this.cache.bumpVersion('topics');
    return { id: product.id };
  }
}
