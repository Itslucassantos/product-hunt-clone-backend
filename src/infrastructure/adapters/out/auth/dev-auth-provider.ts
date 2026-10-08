import { AuthIdentity, AuthProvider } from '../../../../application/ports/out/auth/auth-provider';
import { UnauthenticatedError } from '../../../../domain/errors/unauthenticated-error';

const PREFIX = 'dev:';

export class DevAuthProvider implements AuthProvider {
  async verify(token: string): Promise<AuthIdentity> {
    const externalId = token.startsWith(PREFIX) ? token.slice(PREFIX.length).trim() : '';
    if (!externalId) throw new UnauthenticatedError();
    return { externalId };
  }
}
