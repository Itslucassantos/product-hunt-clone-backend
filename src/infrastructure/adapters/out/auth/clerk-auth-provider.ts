import { verifyToken } from '@clerk/express';
import { AuthIdentity, AuthProvider } from '../../../../application/ports/out/auth/auth-provider';
import { UnauthenticatedError } from '../../../../domain/errors/unauthenticated-error';

export interface ClerkAuthOptions {
  secretKey: string;
  jwtKey?: string;
  authorizedParties?: string[];
}

type TokenVerifier = (token: string, options: ClerkAuthOptions) => Promise<{ sub?: string }>;

export class ClerkAuthProvider implements AuthProvider {
  constructor(
    private readonly options: ClerkAuthOptions,
    private readonly verifier: TokenVerifier = verifyToken,
  ) {}

  async verify(token: string): Promise<AuthIdentity> {
    try {
      const { sub } = await this.verifier(token, this.options);
      if (sub) return { externalId: sub };
    } catch {
      throw new UnauthenticatedError();
    }
    throw new UnauthenticatedError();
  }
}
