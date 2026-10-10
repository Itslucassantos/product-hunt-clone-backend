import { Router } from 'express';
import { ServiceUnavailableError } from '../../../../../domain/errors/service-unavailable-error';

export interface HealthCheck {
  name: string;
  critical: boolean;
  check(): Promise<void>;
}

const CHECK_TIMEOUT_MS = 2000;

function withTimeout(work: Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
    work.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export function healthRoutes(checks: HealthCheck[] = []): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/health/ready', async (_req, res) => {
    const results = await Promise.all(
      checks.map(async (item) => {
        try {
          await withTimeout(item.check());
          return { item, ok: true };
        } catch {
          return { item, ok: false };
        }
      }),
    );

    const report = Object.fromEntries(
      results.map(({ item, ok }) => [item.name, ok ? 'ok' : 'down']),
    );
    if (results.some(({ item, ok }) => item.critical && !ok)) {
      throw new ServiceUnavailableError(report);
    }
    const degraded = results.some(({ ok }) => !ok);
    res.status(200).json({ status: degraded ? 'degraded' : 'ok', checks: report });
  });

  return router;
}
