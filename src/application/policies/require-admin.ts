import { ForbiddenError } from '../../domain/errors/forbidden-error';
import { Actor } from '../ports/in/actor';

export function requireAdmin(actor: Actor): void {
  if (actor.role !== 'ADMIN') throw new ForbiddenError();
}
