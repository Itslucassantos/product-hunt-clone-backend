import { verifyToken } from '@clerk/express';
import { AuthIdentity, AuthProvider } from '../../../../application/ports/out/auth/auth-provider';
import { SessionExpiredError } from '../../../../domain/errors/session-expired-error';
import { UnauthenticatedError } from '../../../../domain/errors/unauthenticated-error';
import type { Logger } from '../../../logging/logger';

export interface ClerkAuthOptions {
  secretKey: string;
  jwtKey?: string;
  authorizedParties?: string[];
}

type TokenVerifier = (token: string, options: ClerkAuthOptions) => Promise<{ sub?: string }>;

function failureReason(error: unknown): string {
  const { reason } = (error ?? {}) as { reason?: unknown };
  return typeof reason === 'string' ? reason : 'unknown';
}

export class ClerkAuthProvider implements AuthProvider {
  constructor(
    private readonly options: ClerkAuthOptions,
    private readonly verifier: TokenVerifier = verifyToken,
    private readonly logger?: Logger,
  ) {}

  async verify(token: string): Promise<AuthIdentity> {
    let sub: string | undefined;
    try {
      ({ sub } = await this.verifier(token, this.options));
    } catch (error) {
      const reason = failureReason(error);
      this.logger?.warn({ reason }, 'token verification failed');
      if (reason === 'token-expired') throw new SessionExpiredError();
      throw new UnauthenticatedError();
    }
    if (!sub) throw new UnauthenticatedError();
    return { externalId: sub };
  }
}
