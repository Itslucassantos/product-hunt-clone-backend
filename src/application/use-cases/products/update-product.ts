import { ProductNotFoundError } from '../../../domain/errors/product-not-found-error';
import { ProductAlreadyExistsError } from '../../../domain/errors/product-already-exists-error';
import { requireAdmin } from '../../policies/require-admin';
import { UpdateProductInput, UpdateProductUseCase } from '../../ports/in/products/update-product';
import { ProductRepository } from '../../ports/out/products/product-repository';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { Clock } from '../../ports/out/shared/clock';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';
import { TopicRepository } from '../../ports/out/topics/topic-repository';
import { assertTopicsExist } from './assert-topics-exist';

export class UpdateProduct implements UpdateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly topics: TopicRepository,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: UpdateProductInput): Promise<void> {
    requireAdmin(input.actor);

    const now = this.clock.now();

    await this.uow.run(async () => {
      const product = await this.products.findById(input.productId);
      if (!product) throw new ProductNotFoundError(input.productId);

      if (
        input.title !== undefined &&
        (await this.products.existsByTitle(input.title, product.id))
      ) {
        throw new ProductAlreadyExistsError();
      }

      product.update(
        input.title ?? product.title,
        input.description ?? product.description,
        input.longDescription === undefined ? product.longDescription : input.longDescription,
        input.url ?? product.url,
        input.imageUrl === undefined ? product.imageUrl : input.imageUrl,
        now,
      );

      if (input.topicIds) {
        await assertTopicsExist(this.topics, input.topicIds);
        product.replaceTopics(input.topicIds, now);
      }

      if (input.status === 'PUBLISHED' && product.status !== 'PUBLISHED') product.publish(now);
      if (input.status === 'COMING_SOON' && product.status !== 'COMING_SOON') {
        product.markAsComingSoon(now);
      }

      await this.products.save(product);
    });

    await this.cache.bumpVersion('products');
    await this.cache.bumpVersion('topics');
    await this.cache.del(`product:${input.productId}:en`, `product:${input.productId}:pt-BR`);
  }
}
