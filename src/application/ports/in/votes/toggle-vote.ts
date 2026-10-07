export interface ToggleVoteInput {
  userId: string;
  productId: string;
}

export interface ToggleVoteOutput {
  upvotes: number;
  voted: boolean;
}

export interface ToggleVoteUseCase {
  execute(input: ToggleVoteInput): Promise<ToggleVoteOutput>;
}
