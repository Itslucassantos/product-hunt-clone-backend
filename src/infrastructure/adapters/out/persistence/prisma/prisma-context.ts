import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../../../../generated/prisma/client';

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

export class PrismaContext {
  private readonly transactions = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(readonly root: PrismaClient) {}

  get client(): DbClient {
    return this.transactions.getStore() ?? this.root;
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.transactions.getStore()) return work();
    return this.root.$transaction((tx) => this.transactions.run(tx, work));
  }
}
