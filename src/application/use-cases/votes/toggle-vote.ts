import { Vote } from '../../../domain/entities/vote';
import { ProductNotFoundError } from '../../../domain/errors/product-not-found-error';
import { ProductNotVotableError } from '../../../domain/errors/product-not-votable-error';
import {
  ToggleVoteInput,
  ToggleVoteOutput,
  ToggleVoteUseCase,
} from '../../ports/in/votes/toggle-vote';
import { ProductRepository } from '../../ports/out/products/product-repository';
import { CacheStore } from '../../ports/out/shared/cache-store';
import { Clock } from '../../ports/out/shared/clock';
import { IdGenerator } from '../../ports/out/shared/id-generator';
import { UnitOfWork } from '../../ports/out/shared/unit-of-work';
import { VoteRepository } from '../../ports/out/votes/vote-repository';

export class ToggleVote implements ToggleVoteUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly votes: VoteRepository,
    private readonly uow: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly cache: CacheStore,
  ) {}

  async execute(input: ToggleVoteInput): Promise<ToggleVoteOutput> {
    const output = await this.uow.run(async () => {
      const product = await this.products.findById(input.productId);
      if (!product) throw new ProductNotFoundError(input.productId);

      const existing = await this.votes.findByUserAndProduct(input.userId, product.id);
      if (existing) {
        await this.votes.delete(existing.id);
        product.removeUpvote();
      } else {
        if (!product.isVotable()) throw new ProductNotVotableError(product.id);
        await this.votes.save(
          Vote.create(this.ids.next(), input.userId, product.id, this.clock.now()),
        );
        product.addUpvote();
      }

      await this.products.save(product);
      return { upvotes: product.upvotes, voted: !existing };
    });

    await this.cache.del(`product:${input.productId}:en`, `product:${input.productId}:pt-BR`);
    return output;
  }
}
