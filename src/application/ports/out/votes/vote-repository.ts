import { Vote } from '../../../../domain/entities/vote';

export interface VoteRepository {
  findByUserAndProduct(userId: string, productId: string): Promise<Vote | null>;
  save(vote: Vote): Promise<void>;
  delete(id: string): Promise<void>;
}
