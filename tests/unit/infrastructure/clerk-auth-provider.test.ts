import { describe, expect, it, vi } from 'vitest';
import { UnauthenticatedError } from '../../../src/domain/errors/unauthenticated-error';
import { ClerkAuthProvider } from '../../../src/infrastructure/adapters/out/auth/clerk-auth-provider';

const options = { secretKey: 'sk_test', authorizedParties: ['http://localhost:3000'] };

describe('ClerkAuthProvider', () => {
  it('returns the token subject as the external id and forwards the options', async () => {
    const verifier = vi.fn().mockResolvedValue({ sub: 'user_123' });

    const identity = await new ClerkAuthProvider(options, verifier).verify('jwt');

    expect(identity).toEqual({ externalId: 'user_123' });
    expect(verifier).toHaveBeenCalledWith('jwt', options);
  });

  it('rejects a token that fails verification', async () => {
    const verifier = vi.fn().mockRejectedValue(new Error('expired'));

    await expect(new ClerkAuthProvider(options, verifier).verify('jwt')).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('rejects a verified token without a subject', async () => {
    const verifier = vi.fn().mockResolvedValue({});

    await expect(new ClerkAuthProvider(options, verifier).verify('jwt')).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});

describe('ClerkAuthProvider failure reasons', () => {
  it('reports an expired token as SESSION_EXPIRED', async () => {
    const verifier = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('x'), { reason: 'token-expired' }));

    await expect(new ClerkAuthProvider(options, verifier).verify('jwt')).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('logs the reason without exposing it', async () => {
    const warn = vi.fn();
    const verifier = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('x'), { reason: 'token-invalid-signature' }));
    const provider = new ClerkAuthProvider(options, verifier, { warn } as never);

    await expect(provider.verify('jwt')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(warn).toHaveBeenCalledWith({ reason: 'token-invalid-signature' }, expect.any(String));
  });
});
