import { z } from 'zod';

const idList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );

type Driver = 'redis' | 'memory' | 'none';

function resolveDrivers(env: {
  NODE_ENV: 'development' | 'test' | 'production';
  CACHE_DRIVER?: Driver;
  RATE_LIMIT_DRIVER?: Driver;
}): { cache: Driver; rateLimit: Driver } {
  const defaultCache: Driver =
    env.NODE_ENV === 'production' ? 'redis' : env.NODE_ENV === 'test' ? 'none' : 'memory';
  const cache = env.CACHE_DRIVER ?? defaultCache;
  const rateLimit = env.RATE_LIMIT_DRIVER ?? (cache === 'redis' ? 'redis' : 'memory');
  return { cache, rateLimit };
}

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    PUBLIC_URL: z.string().default(''),
    CORS_ORIGIN: z.string().default(''),
    REPOSITORY_DRIVER: z.enum(['memory', 'prisma']).default('memory'),
    DATABASE_URL: z.string().optional(),
    CLERK_SECRET_KEY: z.string().optional(),
    CLERK_JWT_KEY: z.string().optional(),
    CLERK_AUTHORIZED_PARTIES: idList,
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    ADMIN_EXTERNAL_IDS: idList,
    CACHE_DRIVER: z.enum(['redis', 'memory', 'none']).optional(),
    RATE_LIMIT_DRIVER: z.enum(['redis', 'memory', 'none']).optional(),
    REDIS_URL: z.string().optional(),
    CACHE_TTL_PRODUCT_LIST: z.coerce.number().int().min(1).default(15),
    CACHE_TTL_PRODUCT_DETAIL: z.coerce.number().int().min(1).default(30),
    CACHE_TTL_TOPICS: z.coerce.number().int().min(1).default(60),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    METRICS_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.REPOSITORY_DRIVER === 'prisma' && !env.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'required when REPOSITORY_DRIVER=prisma',
      });
    }
    if (env.NODE_ENV === 'production') {
      if (env.REPOSITORY_DRIVER !== 'prisma') {
        ctx.addIssue({
          code: 'custom',
          path: ['REPOSITORY_DRIVER'],
          message: 'must be prisma in production',
        });
      }
      if (!env.CLERK_SECRET_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['CLERK_SECRET_KEY'],
          message: 'required in production',
        });
      }
    }
    const drivers = resolveDrivers(env);
    if ((drivers.cache === 'redis' || drivers.rateLimit === 'redis') && !env.REDIS_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'required when the cache or rate limit driver is redis',
      });
    }
  })
  .transform((env) => {
    const drivers = resolveDrivers(env);
    return { ...env, CACHE_DRIVER: drivers.cache, RATE_LIMIT_DRIVER: drivers.rateLimit };
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${problems}`);
  }
  return result.data;
}
