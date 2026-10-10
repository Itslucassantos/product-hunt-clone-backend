import { loadEnv } from '../infrastructure/config/env';
import { buildContainer } from './container';

const JOBS = ['reconcile-upvotes', 'cleanup-orphan-images'] as const;
type JobName = (typeof JOBS)[number];

function isJobName(value: string | undefined): value is JobName {
  return JOBS.includes(value as JobName);
}

async function run(): Promise<void> {
  const name = process.argv[2];
  if (!isJobName(name)) {
    throw new Error(`Usage: jobs <${JOBS.join(' | ')}>`);
  }

  const container = buildContainer(loadEnv());
  try {
    if (!container.jobs) throw new Error('Jobs require REPOSITORY_DRIVER=prisma');
    const result =
      name === 'reconcile-upvotes'
        ? await container.jobs.reconcileUpvotes.execute()
        : await container.jobs.cleanupOrphanImages.execute();
    container.logger.info({ job: name, ...result }, 'job finished');
  } finally {
    await container.shutdown();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
