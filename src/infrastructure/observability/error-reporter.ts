import * as Sentry from '@sentry/node';

export interface ErrorReporter {
  capture(error: unknown, context: { requestId?: string }): void;
}

export class NoopErrorReporter implements ErrorReporter {
  capture(): void {}
}

export class SentryErrorReporter implements ErrorReporter {
  constructor(dsn: string, environment: string) {
    Sentry.init({ dsn, environment, tracesSampleRate: 0 });
  }

  capture(error: unknown, context: { requestId?: string }): void {
    Sentry.withScope((scope) => {
      if (context.requestId) scope.setTag('requestId', context.requestId);
      Sentry.captureException(error);
    });
  }
}

export function createErrorReporter(dsn: string | undefined, environment: string): ErrorReporter {
  return dsn ? new SentryErrorReporter(dsn, environment) : new NoopErrorReporter();
}
