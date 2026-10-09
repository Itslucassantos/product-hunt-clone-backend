import { execFileSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  PrismaContext,
  createPrismaClient,
} from '../../src/infrastructure/adapters/out/persistence/prisma/prisma-context';

export interface TestDatabase {
  url: string;
  context: PrismaContext;
  prisma: PrismaClient;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:17-alpine',
  ).start();
  const url = container.getConnectionUri();

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });

  const prisma = createPrismaClient(url);

  return {
    url,
    context: new PrismaContext(prisma),
    prisma,
    async reset() {
      await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "Vote", "Review", "TopicTranslation", "Topic", "Product", "User" CASCADE',
      );
    },
    async stop() {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}
