export interface ListMyVotesInput {
  userId: string;
}

export interface ListMyVotesOutput {
  productIds: string[];
}

export interface ListMyVotesUseCase {
  execute(input: ListMyVotesInput): Promise<ListMyVotesOutput>;
}
