import type { RequestHandler, Response } from 'express';
import { AuthProvider } from '../../../../../application/ports/out/auth/auth-provider';
import { Actor } from '../../../../../application/ports/in/shared/actor';
import { SyncUserUseCase } from '../../../../../application/ports/in/users/sync-user';
import { UnauthenticatedError } from '../../../../../domain/errors/unauthenticated-error';

export function actorOf(res: Response): Actor {
  return res.locals.actor as Actor;
}

export function authenticate(auth: AuthProvider, syncUser: SyncUserUseCase): RequestHandler {
  return async (req, res, next) => {
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthenticatedError();

    const { externalId } = await auth.verify(token);
    const user = await syncUser.execute({ type: 'upsert', externalId });
    if (!user) throw new UnauthenticatedError();

    res.locals.actor = { id: user.id, role: user.role } satisfies Actor;
    next();
  };
}
