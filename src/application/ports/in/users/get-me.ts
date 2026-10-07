import { Role } from '../../../../domain/value-objects/role';

export interface GetMeInput {
  userId: string;
}

export interface MeOutput {
  id: string;
  role: Role;
}

export interface GetMeUseCase {
  execute(input: GetMeInput): Promise<MeOutput>;
}
