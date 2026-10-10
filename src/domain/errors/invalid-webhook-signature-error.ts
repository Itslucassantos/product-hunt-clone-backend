import { DomainError } from './domain-error';

export class InvalidWebhookSignatureError extends DomainError {
  constructor() {
    super('INVALID_WEBHOOK_SIGNATURE', 'Webhook signature is invalid');
  }
}
