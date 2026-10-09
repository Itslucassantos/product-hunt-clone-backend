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
