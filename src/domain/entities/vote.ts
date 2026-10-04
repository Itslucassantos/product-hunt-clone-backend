export class Vote {
  private constructor(
    readonly id: string,
    readonly userId: string,
    readonly productId: string,
    readonly createdAt: Date,
  ) {}

  static create(id: string, userId: string, productId: string, now: Date): Vote {
    return new Vote(id, userId, productId, now);
  }

  static restore(id: string, userId: string, productId: string, createdAt: Date): Vote {
    return new Vote(id, userId, productId, createdAt);
  }
}
