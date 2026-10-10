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
      const found = await this.products.findById(input.productId);
      if (!found) throw new ProductNotFoundError(input.productId);

      const existing = await this.votes.findByUserAndProduct(input.userId, found.id);
      let changed: 'added' | 'removed' | null = null;
      if (existing) {
        if (await this.votes.delete(existing.id)) changed = 'removed';
      } else {
        if (!found.isVotable()) throw new ProductNotVotableError(found.id);
        const created = await this.votes.save(
          Vote.create(this.ids.next(), input.userId, found.id, this.clock.now()),
        );
        if (created) changed = 'added';
      }

      const product = await this.products.findById(found.id);
      if (!product) throw new ProductNotFoundError(found.id);
      if (changed === 'added') product.addUpvote();
      if (changed === 'removed') product.removeUpvote();
      await this.products.save(product);

      return { upvotes: product.upvotes, voted: !existing };
    });

    await this.cache.del(`product:${input.productId}:en`, `product:${input.productId}:pt-BR`);
    return output;
  }
}
