import type { Request, Response } from 'express';
import { SyncUserUseCase } from '../../../../../application/ports/in/users/sync-user';
import { InvalidWebhookSignatureError } from '../../../../../domain/errors/invalid-webhook-signature-error';

interface SvixVerifier {
  verify(payload: Buffer, headers: Record<string, string>): unknown;
}

interface ClerkEvent {
  type: string;
  data: { id?: string };
}

export function webhooksController(syncUser: SyncUserUseCase, secret: string) {
  let webhook: SvixVerifier | undefined;

  return {
    async clerk(req: Request, res: Response) {
      const payload = req.rawBody ?? Buffer.alloc(0);
      try {
        const { Webhook } = await import('svix');
        webhook ??= new Webhook(secret);
        webhook.verify(payload, {
          'svix-id': req.header('svix-id') ?? '',
          'svix-timestamp': req.header('svix-timestamp') ?? '',
          'svix-signature': req.header('svix-signature') ?? '',
        });
      } catch {
        throw new InvalidWebhookSignatureError();
      }

      const event = JSON.parse(payload.toString('utf8')) as ClerkEvent;
      const externalId = event.data?.id;
      if (externalId) {
        if (event.type === 'user.created' || event.type === 'user.updated') {
          await syncUser.execute({ type: 'upsert', externalId });
        } else if (event.type === 'user.deleted') {
          await syncUser.execute({ type: 'delete', externalId });
        }
      }
      res.status(204).end();
    },
  };
}
