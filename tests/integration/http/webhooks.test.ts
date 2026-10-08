import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../../helpers/http';

const secret = `whsec_${Buffer.from('test-secret-value').toString('base64')}`;

async function signed(payload: object) {
  const body = JSON.stringify(payload);
  const id = 'msg_1';
  const timestamp = new Date();
  const { Webhook } = await import('svix');
  const signature = new Webhook(secret).sign(id, timestamp, body);
  return {
    body,
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
      'svix-signature': signature,
    },
  };
}

describe('POST /api/webhooks/clerk', () => {
  it('is not registered without a secret', async () => {
    const { http } = buildTestApp();

    const response = await http.post('/api/webhooks/clerk').send({});

    expect(response.status).toBe(404);
  });

  it('rejects an invalid signature', async () => {
    const { http } = buildTestApp({ CLERK_WEBHOOK_SECRET: secret });

    const response = await http
      .post('/api/webhooks/clerk')
      .set('content-type', 'application/json')
      .send('{"type":"user.created","data":{"id":"u1"}}');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
  });

  it('creates the user on user.created', async () => {
    const { http } = buildTestApp({ CLERK_WEBHOOK_SECRET: secret });
    const { body, headers } = await signed({ type: 'user.created', data: { id: 'u1' } });

    const response = await http.post('/api/webhooks/clerk').set(headers).send(body);
    const me = await http.get('/api/me').set('Authorization', 'Bearer dev:u1');

    expect(response.status).toBe(204);
    expect(me.body.role).toBe('USER');
  });
});
