import { loadEnv } from '../infrastructure/config/env';
import { buildContainer } from './container';
import { seed } from './seed';

async function run(): Promise<void> {
  const container = buildContainer(loadEnv());
  try {
    await seed(container);
    container.logger.info('seed finished');
  } finally {
    await container.shutdown();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
