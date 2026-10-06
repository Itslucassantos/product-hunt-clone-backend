import { UserNotFoundError } from '../../../domain/errors/user-not-found-error';
import { GetMeInput, GetMeUseCase, MeOutput } from '../../ports/in/get-me';
import { UserRepository } from '../../ports/out/user-repository';

export class GetMe implements GetMeUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(input: GetMeInput): Promise<MeOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new UserNotFoundError(input.userId);
    return { id: user.id, role: user.role };
  }
}
