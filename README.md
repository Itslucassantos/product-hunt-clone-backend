# Product Hunt clone — backend

Express + Prisma (PostgreSQL) API with hexagonal architecture. Clerk handles authentication, Redis is an optional cache and rate-limit store, and product images live in PostgreSQL.

## Run locally

```bash
cp .env.example .env
docker compose up -d --wait      # PostgreSQL and Redis
npm install
npx prisma migrate dev
npx prisma db seed               # topics and products for development
npm run dev
```

`REPOSITORY_DRIVER=memory` runs everything in memory with no database (data is lost on restart).

### Authentication in development

- Without `CLERK_SECRET_KEY` the API accepts `Authorization: Bearer dev:<externalId>`; `dev:dev-admin` is an admin.
- With `CLERK_SECRET_KEY` only Clerk JWTs are accepted. Put the Clerk user ids that should become admins in `ADMIN_EXTERNAL_IDS` before their first request. Set `CLERK_AUTHORIZED_PARTIES` to the frontend origin to also check the token `azp` claim.

## Scripts

| Script                                      | What it does                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`                               | API with reload                                                                                         |
| `npm test`                                  | all tests (integration tests start PostgreSQL and Redis with Testcontainers, so Docker must be running) |
| `npm run lint`, `typecheck`, `format:check` | static checks                                                                                           |
| `npm run build` / `npm start`               | compile and run `dist/`                                                                                 |
| `npm run jobs -- reconcile-upvotes`         | recompute `Product.upvotes` from the votes                                                              |
| `npm run jobs -- cleanup-orphan-images`     | delete stored images no product references (older than 24 h)                                            |

## Configuration

See [.env.example](.env.example). Highlights:

| Variable            | Notes                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `REPOSITORY_DRIVER` | `prisma` or `memory`. Production requires `prisma`                                                                                        |
| `CACHE_DRIVER`      | `redis`, `memory` or `none`. Default: `redis` in production, `memory` in development, `none` in tests                                     |
| `RATE_LIMIT_DRIVER` | `redis`, `memory` or `none`. Follows the cache driver by default                                                                          |
| `REDIS_URL`         | required when a redis driver is used. Redis failures never break requests: the cache is skipped and the rate limiter falls back to memory |
| `TRUST_PROXY`       | number of proxies in front of the API (for example `1` behind a reverse proxy) so rate limiting sees the client IP                        |
| `METRICS_TOKEN`     | exposes `GET /metrics` (Prometheus) behind `Authorization: Bearer <token>`                                                                |
| `SENTRY_DSN`        | reports 5xx errors to Sentry, tagged with the `requestId`                                                                                 |

## Operations

- `GET /health` — liveness. `GET /health/ready` — readiness: 503 if the database is down, `degraded` if only Redis is down.
- Rate limits (per minute): public reads 120/IP, votes 30/user, admin writes 60/user, uploads 10/user. Over the limit: `429 RATE_LIMITED` with `Retry-After`.
- Admin writes are logged with `audit: true`, the user id and the `requestId`.

## Production notes

- `docker build -t product-hunt-backend .` builds the image. Run `npx prisma migrate deploy` against the database before starting a new version.
- Required variables in production: `NODE_ENV=production`, `REPOSITORY_DRIVER=prisma`, `DATABASE_URL`, `REDIS_URL`, `CLERK_SECRET_KEY`. Also set `CLERK_WEBHOOK_SECRET`, `CLERK_AUTHORIZED_PARTIES`, `ADMIN_EXTERNAL_IDS`, `CORS_ORIGIN` and `PUBLIC_URL`.
- Schedule `node dist/main/jobs.js reconcile-upvotes` (daily) and `node dist/main/jobs.js cleanup-orphan-images` (weekly) with any scheduler.
- Clerk webhook: create an endpoint to `/api/webhooks/clerk` for `user.created`, `user.updated` and `user.deleted` and copy its signing secret to `CLERK_WEBHOOK_SECRET`.

## Load tests

[k6](https://k6.io) scripts live in `tests/load`. Start the API with `RATE_LIMIT_DRIVER=none`, otherwise the per-IP limits will answer 429.

```bash
k6 run tests/load/products.js
PRODUCT_ID=<id> k6 run tests/load/votes.js
```

The vote script uses `dev:` tokens, so run it against an API without `CLERK_SECRET_KEY`.
