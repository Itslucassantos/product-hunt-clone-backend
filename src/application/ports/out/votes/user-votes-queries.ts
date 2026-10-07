export interface UserVotesQueries {
  listProductIds(userId: string): Promise<string[]>;
}
