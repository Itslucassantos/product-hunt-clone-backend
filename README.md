# Product Hunt Clone — Backend

REST API for a Product Hunt style website: people browse products ranked by upvotes, filter them by topic, and upvote the ones they like. Admins publish products, write reviews, announce "coming soon" products and curate a bilingual list of topics.

The API is written in **TypeScript** on **Node.js 24**, built with **Express 5** and **Prisma 7** over **PostgreSQL**, uses **Redis** as an optional cache and rate-limit store, and delegates authentication to **Clerk**. The code follows a **hexagonal (ports and adapters) architecture**, enforced by lint rules.

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Getting started](#getting-started)
6. [Authentication and authorization](#authentication-and-authorization)
7. [Configuration](#configuration)
8. [API reference](#api-reference)
9. [Error contract](#error-contract)
10. [Caching and rate limiting](#caching-and-rate-limiting)
11. [Data model](#data-model)
12. [Business rules](#business-rules)
13. [Background jobs](#background-jobs)
14. [Observability](#observability)
15. [Testing](#testing)
16. [Scripts](#scripts)
17. [Continuous integration](#continuous-integration)
18. [Deploying to production](#deploying-to-production)
19. [Conventions](#conventions)

---

## Features

- Public product list ranked by upvotes (no pagination), filterable by topic, by reviewed status and by "coming soon".
- Product detail with long description, topics and review.
- One upvote per user per product, toggled on and off, safe under concurrent clicks.
- Admin area: create, edit and delete products, upload product images, write or remove reviews (rating 1–5 plus summary), manage topics (English and Portuguese names, custom order).
- Topics are dynamic and translated (`en` and `pt-BR`), with product counts.
- Authentication through Clerk JWTs; the admin role is stored in our database, so revoking it is immediate.
- Clerk webhook that keeps local users in sync, with lazy user creation as a fallback.
- Redis cache with graceful degradation: if Redis goes down, the API keeps working from PostgreSQL.
- Per-IP and per-user rate limiting, structured logs, Prometheus metrics, optional Sentry reporting.
- Stable, machine-readable error codes so the frontend can translate every error.
- Maintenance jobs that reconcile vote counters and clean up orphan images.

## Tech stack

| Area              | Choice                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| Language          | TypeScript 6 in `strict` mode                                               |
| Runtime           | Node.js 24 (CommonJS output)                                                |
| HTTP framework    | Express 5, with `helmet` and `cors`                                         |
| Database          | PostgreSQL 17                                                               |
| ORM               | Prisma 7 with the `@prisma/adapter-pg` driver adapter                       |
| Cache / limits    | Redis 7 through `ioredis` (optional)                                        |
| Authentication    | Clerk (`@clerk/express`), webhooks verified with Svix                       |
| Validation        | zod                                                                         |
| Logging           | pino                                                                        |
| Metrics / errors  | `prom-client` (Prometheus) and `@sentry/node`                               |
| Uploads           | multer (in memory), image type checked by file signature                    |
| Tests             | Vitest, supertest, Testcontainers (PostgreSQL and Redis), k6 for load tests |
| Code quality      | ESLint with `eslint-plugin-boundaries`, Prettier, Husky and lint-staged     |
| Containers and CI | Docker (multi-stage), Docker Compose, GitHub Actions, Dependabot            |

## Architecture

The project uses **hexagonal architecture** (ports and adapters). Business rules sit in the center and know nothing about Express, Prisma, Redis or Clerk. Every technology lives at the edges and is connected to the center through **ports** (TypeScript interfaces).

```
          DRIVING ADAPTERS (infrastructure/adapters/in)
          Express routes, controllers, middlewares, Clerk webhook
                              │ call
                              ▼
        ┌───────────────────────────────────────────┐
        │  application                              │
        │    ports/in   use case contracts          │
        │    use-cases  orchestration, authorization│
        │    ports/out  repositories, queries,      │
        │               cache, storage, auth, clock │
        │  ───────────────────────────────────────  │
        │  domain                                   │
        │    entities, value objects, domain errors │
        └───────────────────────────────────────────┘
                              ▲ implemented by
                              │
          DRIVEN ADAPTERS (infrastructure/adapters/out)
          Prisma, in-memory, Redis, Clerk, system clock, UUIDs
```

### Dependency rule

Arrows always point inward, and ESLint (`eslint-plugin-boundaries`) fails the build when they do not:

- `domain` imports nothing from the outside.
- `application` imports only `domain`.
- `infrastructure` imports `application` and `domain`.
- `main` (the composition root) is the only place that knows which adapter implements which port.

### Layers

| Layer                         | Responsibility                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`                      | Entities (`Product`, `Topic`, `Vote`, `Review`, `User`), value objects (`Upvotes`, `Rating`, `Slug`, `Locale`, `Role`, `ProductStatus`) and domain errors. Pure TypeScript, no I/O |
| `application/use-cases`       | One class per operation (`ToggleVote`, `CreateProduct`, `DeleteTopic`, ...). Enforces authorization (`require-admin`) and orchestrates ports                                       |
| `application/ports/in`        | Input and output types of each use case                                                                                                                                            |
| `application/ports/out`       | Interfaces the application needs: repositories, queries, `CacheStore`, `RateLimiter`, `ImageStorage`, `AuthProvider`, `UnitOfWork`, `Clock`, `IdGenerator`                         |
| `infrastructure/adapters/in`  | HTTP: routes, controllers, zod schemas, middlewares and the error catalog                                                                                                          |
| `infrastructure/adapters/out` | Prisma, in-memory, Redis and Clerk implementations of the output ports                                                                                                             |
| `main`                        | `container.ts` wires everything by environment, `server.ts` starts Express with graceful shutdown, `jobs.ts` runs maintenance jobs, `seed.ts` seeds development data               |

### Reads and writes are separate (light CQRS)

- **Write side:** use cases work with domain entities through repositories (`ProductRepository`, `TopicRepository`, `VoteRepository`, `ReviewRepository`, `UserRepository`). Business rules live in the entities.
- **Read side:** screens only need ready-to-display data, so separate query ports (`ProductQueries`, `TopicQueries`, `UserVotesQueries`) return read models without building entities. This is also where the cache plugs in, as a **decorator**: `CachedProductQueries` wraps the Prisma implementation and nothing above it notices.

### Swappable adapters

Adapters are chosen by environment variables in `src/main/container.ts`:

| Concern     | Options                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| Persistence | `REPOSITORY_DRIVER=prisma` (PostgreSQL) or `memory` (no database)          |
| Cache       | `CACHE_DRIVER=redis`, `memory` or `none`                                   |
| Rate limit  | `RATE_LIMIT_DRIVER=redis`, `memory` or `none`                              |
| Auth        | Clerk when `CLERK_SECRET_KEY` is set, otherwise a development provider     |
| Images      | Stored in PostgreSQL (Prisma) or in memory, behind the `ImageStorage` port |

### Key design decisions

- **PostgreSQL is the only source of truth.** Redis is disposable: if it is wiped or unreachable, nothing is lost, the API is just slower.
- **Atomic vote counter.** `Product` tracks a pending upvote delta and the repository writes `upvotes = upvotes ± 1` in the database, never `read + 1`. A `unique(userId, productId)` constraint decides races between concurrent votes, and the vote plus the counter change happen in one transaction.
- **Cacheable responses.** `hasVoted` is not part of list or detail responses. The frontend calls `GET /api/me/votes` and merges it, so public responses are identical for every user and can be cached by Redis, CDN and browser.
- **Admin role lives in the database**, not in the token, so revoking it is immediate.
- **Errors are codes, not sentences.** The domain throws `DomainError`s with a stable `code`; a single HTTP middleware maps codes to statuses through `error-catalog.ts`.
- **Stateless API.** No sessions and no files on local disk, so it can run on several replicas.

## Project structure

```
.
├── prisma/
│   ├── schema.prisma                 # data model
│   └── migrations/                   # versioned SQL migrations
├── src/
│   ├── domain/
│   │   ├── entities/                 # product, topic, vote, review, user
│   │   ├── value-objects/            # upvotes, rating, slug, locale, role, product-status
│   │   └── errors/                   # DomainError subclasses
│   ├── application/
│   │   ├── policies/                 # require-admin
│   │   ├── ports/in/                 # use case contracts
│   │   ├── ports/out/                # repositories, queries, cache, storage, auth, ...
│   │   ├── read-models/              # DTOs used by the query side
│   │   └── use-cases/                # products, topics, votes, users, maintenance
│   ├── infrastructure/
│   │   ├── adapters/in/http/         # app, routes, controllers, schemas, middlewares, error catalog
│   │   ├── adapters/out/             # persistence, cache, rate-limit, auth, storage, clock, id
│   │   ├── config/env.ts             # environment validated with zod
│   │   ├── logging/                  # pino logger
│   │   └── observability/            # Prometheus metrics, error reporter
│   ├── main/                         # container, server, jobs, seed
│   ├── generated/prisma/             # generated Prisma client
│   └── index.ts                      # entry point
├── tests/
│   ├── unit/                         # domain, use cases, infrastructure (no I/O)
│   ├── integration/                  # PostgreSQL, Redis and HTTP, using Testcontainers
│   ├── contract/                     # repository and error contracts
│   ├── load/                         # k6 scripts
│   └── helpers/
├── monitoring/                       # Prometheus config and Grafana provisioning (local)
├── Dockerfile                        # multi-stage: build, migrate, runtime
├── docker-compose.yaml               # postgres, redis, migrate, api
├── prisma.config.ts
└── .env.example
```

## Getting started

### Prerequisites

- Node.js 24 or newer and npm
- Docker with Docker Compose (also required by the integration tests)

### Option 1: everything in Docker

```bash
docker compose up -d --build --wait
```

This starts four services:

| Service    | What it does                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `postgres` | PostgreSQL 17 on `localhost:5432` (user and password `postgres`, database `product_hunt`)      |
| `redis`    | Redis 7 on `localhost:6379`, no password                                                       |
| `migrate`  | Runs once: applies the Prisma migrations and the idempotent seed, then exits                   |
| `api`      | The API on `http://localhost:3333`, started only after `migrate` succeeds and Redis is healthy |

Prometheus and Grafana are not part of this default set. Add them with `docker compose --profile monitoring up -d --build --wait` (see [Observability](#observability)). Because the Compose `api` service always sets a development `METRICS_TOKEN`, `GET /metrics` is enabled whenever you start it through Compose.

Check that it works:

```bash
curl http://localhost:3333/health/ready
curl http://localhost:3333/api/products
```

If a `.env` file exists, the `api` service also loads it, so a `CLERK_SECRET_KEY` in it turns on Clerk authentication. Leave it empty to use the development tokens described in [Authentication](#authentication-and-authorization).

Useful commands:

```bash
docker compose logs -f api       # follow the API logs
docker compose down              # stop everything, keep the data
docker compose down -v           # stop everything and delete the database volume
```

### Option 2: run the API on your machine

Run only the infrastructure in Docker and the API with hot reload:

```bash
cp .env.example .env
docker compose up -d --wait postgres redis
npm install
npx prisma migrate dev
npx prisma db seed              # sample topics and products
npm run dev                     # http://localhost:3333
```

`REPOSITORY_DRIVER=memory` runs the whole API with in-memory data and no database, which is handy for quick frontend work.

### Seed data

`npx prisma db seed` creates four topics (AI, SaaS, Developer Tools, Productivity) and three sample products, one of them "coming soon" and one with a review. It does nothing if topics already exist, so it is safe to run repeatedly.

## Authentication and authorization

Clerk handles sign-up and login in the frontend. The API only **verifies** the JWT sent as `Authorization: Bearer <token>`. There are no session cookies, so there is no CSRF surface.

| Situation                               | Result                |
| --------------------------------------- | --------------------- |
| No token or an invalid token            | `401 UNAUTHENTICATED` |
| Valid but expired token                 | `401 SESSION_EXPIRED` |
| Logged in, not an admin, on admin route | `403 FORBIDDEN`       |

- **Users:** the local `User` stores only the Clerk id (`externalId`) and a role. It is created by the Clerk webhook (`user.created`, `user.updated`, `user.deleted`) and, if the webhook is late or disabled, lazily on the first authenticated request.
- **Admins:** `Role.ADMIN` is stored in our database. List Clerk user ids in `ADMIN_EXTERNAL_IDS` (comma separated) and those users become admins when they are first created. Authorization is an application rule (`policies/require-admin.ts`) checked inside the use cases.

### Authentication in development

- **Without** `CLERK_SECRET_KEY`, the API accepts `Authorization: Bearer dev:<externalId>`. The id `dev:dev-admin` is an admin; any other id is a regular user.
- **With** `CLERK_SECRET_KEY`, only real Clerk JWTs are accepted. Set `CLERK_AUTHORIZED_PARTIES` to the frontend origin to also validate the token `azp` claim, and `CLERK_JWT_KEY` to verify tokens offline.

```bash
curl -H "Authorization: Bearer dev:dev-admin" http://localhost:3333/api/me
```

## Configuration

All variables are read and validated at startup with zod. If one is missing or invalid the process refuses to start and says which one. A full template is in [.env.example](.env.example).

| Variable                                         | Default       | Notes                                                                                                 |
| ------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                       | `development` | `development`, `test` or `production`                                                                 |
| `PORT`                                           | `3333`        | HTTP port                                                                                             |
| `LOG_LEVEL`                                      | `info`        | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`                                          |
| `PUBLIC_URL`                                     | empty         | Public base URL of the API, used to build image URLs                                                  |
| `CORS_ORIGIN`                                    | empty         | Allowed frontend origin(s). Never `*`                                                                 |
| `REPOSITORY_DRIVER`                              | `memory`      | `prisma` or `memory`. Production requires `prisma`                                                    |
| `DATABASE_URL`                                   | —             | PostgreSQL connection string. Required with the `prisma` driver                                       |
| `CLERK_SECRET_KEY`                               | —             | Enables Clerk authentication. Required in production                                                  |
| `CLERK_JWT_KEY`                                  | —             | Clerk public key for offline JWT verification                                                         |
| `CLERK_AUTHORIZED_PARTIES`                       | empty         | Comma separated allowed `azp` values (frontend origins)                                               |
| `CLERK_WEBHOOK_SECRET`                           | —             | Signing secret of the Clerk webhook. Without it, `/api/webhooks/clerk` is not mounted                 |
| `ADMIN_EXTERNAL_IDS`                             | empty         | Comma separated Clerk user ids that become admins                                                     |
| `CACHE_DRIVER`                                   | see note      | `redis`, `memory` or `none`. Default: `redis` in production, `memory` in development, `none` in tests |
| `RATE_LIMIT_DRIVER`                              | follows cache | `redis`, `memory` or `none`                                                                           |
| `REDIS_URL`                                      | —             | Required when a Redis driver is used, for example `redis://localhost:6379`                            |
| `CACHE_TTL_PRODUCT_LIST` / `_DETAIL` / `_TOPICS` | 15 / 30 / 60  | Cache TTLs in seconds                                                                                 |
| `TRUST_PROXY`                                    | `0`           | Number of proxies in front of the API, so rate limiting sees the real client IP                       |
| `METRICS_TOKEN`                                  | —             | Enables `GET /metrics`, protected by `Authorization: Bearer <token>`                                  |
| `SENTRY_DSN`                                     | —             | Reports 5xx errors to Sentry, tagged with the `requestId`                                             |

## API reference

All routes live under `/api` (except health, metrics and files), speak JSON in UTF-8 and return errors in the [standard format](#error-contract). Names are returned in the language given by `?locale=en` (default) or `?locale=pt-BR`.

| Method | Route                        | Access    | Description                                                                                           |
| ------ | ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| GET    | `/api/products`              | public    | Products ordered by upvotes. Filters: `topic=<slug>`, `reviewed=true`, `status=coming-soon`, `locale` |
| GET    | `/api/products/:id`          | public    | Product detail with long description, topics and review                                               |
| GET    | `/api/admin/products`        | admin     | Every product in every status, uncached                                                               |
| POST   | `/api/products`              | admin     | Create a product                                                                                      |
| PATCH  | `/api/products/:id`          | admin     | Edit a product, including `status` and `topicIds`                                                     |
| DELETE | `/api/products/:id`          | admin     | Delete a product (its votes and review are deleted too)                                               |
| PUT    | `/api/products/:id/review`   | admin     | Create or update the review `{ rating: 1-5, summary }`                                                |
| DELETE | `/api/products/:id/review`   | admin     | Remove the review                                                                                     |
| POST   | `/api/uploads/product-image` | admin     | Upload a PNG or JPEG (multipart, up to 5 MB). Returns `{ imageUrl }`                                  |
| POST   | `/api/products/:id/vote`     | logged in | Toggle your vote. Returns `{ upvotes, voted }`                                                        |
| GET    | `/api/me`                    | logged in | `{ id, role }`                                                                                        |
| GET    | `/api/me/votes`              | logged in | `{ productIds: [...] }` of products you voted for                                                     |
| GET    | `/api/topics`                | public    | Topics ordered by position, with `productCount`                                                       |
| POST   | `/api/topics`                | admin     | Create a topic with English and Portuguese `translations`                                             |
| PATCH  | `/api/topics/:id`            | admin     | Rename a topic (the slug never changes)                                                               |
| PUT    | `/api/topics/order`          | admin     | Reorder topics: `{ ids: [...] }` with every topic id                                                  |
| DELETE | `/api/topics/:id`            | admin     | Delete a topic, unless a product would be left without topics                                         |
| POST   | `/api/webhooks/clerk`        | Svix      | Clerk user sync (mounted only when `CLERK_WEBHOOK_SECRET` is set)                                     |
| GET    | `/files/:fileName`           | public    | Serves an uploaded product image                                                                      |
| GET    | `/health`                    | public    | Liveness: the process responds                                                                        |
| GET    | `/health/ready`              | public    | Readiness: `503` if the database is down, `degraded` if only Redis is down                            |
| GET    | `/metrics`                   | token     | Prometheus metrics (only when `METRICS_TOKEN` is set)                                                 |

Example product from `GET /api/products`:

```json
{
  "id": "…",
  "title": "Lumen",
  "description": "AI notes that organize themselves",
  "url": "https://lumen.example.com",
  "imageUrl": null,
  "status": "PUBLISHED",
  "upvotes": 298,
  "topics": [{ "id": "…", "name": "AI", "slug": "ai" }],
  "review": { "rating": 5 }
}
```

Example body of `POST /api/topics`:

```json
{
  "translations": {
    "en": { "name": "AI", "description": "Assistants and automations applied to products." },
    "pt-BR": { "name": "IA", "description": "Assistentes e automações aplicados a produtos." }
  }
}
```

Lists are not paginated by design; this is fine up to a few hundred published products.

## Error contract

Every error, on every route, has the same shape. The frontend uses `code` to pick the translated message; `message` is English text for debugging only.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "status": 400,
    "message": "Request validation failed",
    "requestId": "7f1c2b9e-…",
    "details": [{ "field": "title", "code": "REQUIRED" }]
  }
}
```

The `requestId` is also sent in the `X-Request-Id` header (a client-provided one is reused) and appears in every log line. Stack traces, SQL and file paths never leave the server; unexpected failures become `INTERNAL_ERROR`.

| Code                                                                                            | HTTP | When                                                    |
| ----------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------- |
| `MALFORMED_REQUEST`, `VALIDATION_ERROR`, `INVALID_TOPIC_ORDER`                                  | 400  | Bad JSON, invalid fields, incomplete topic order        |
| `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_WEBHOOK_SIGNATURE`                               | 401  | Missing, invalid or expired credentials                 |
| `FORBIDDEN`                                                                                     | 403  | Not an admin on an admin route                          |
| `ROUTE_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `TOPIC_NOT_FOUND`, `REVIEW_NOT_FOUND`, `USER_NOT_FOUND` | 404  | Resource does not exist                                 |
| `PRODUCT_NOT_VOTABLE`                                                                           | 409  | Voting on a "coming soon" product                       |
| `PRODUCT_ALREADY_EXISTS`, `TOPIC_ALREADY_EXISTS`                                                | 409  | Duplicate product title or topic name in a language     |
| `TOPIC_IN_USE`                                                                                  | 409  | Deleting a topic would leave products without any topic |
| `IMAGE_TOO_LARGE`                                                                               | 413  | Image above 5 MB                                        |
| `UNSUPPORTED_IMAGE_TYPE`                                                                        | 415  | File is not a PNG or JPEG (checked by content)          |
| `RATE_LIMITED`                                                                                  | 429  | Too many requests, with a `Retry-After` header          |
| `INTERNAL_ERROR`                                                                                | 500  | Unexpected failure                                      |
| `UPSTREAM_ERROR`                                                                                | 502  | External service failure                                |
| `SERVICE_UNAVAILABLE`                                                                           | 503  | Database unavailable                                    |

The single source of truth is [error-catalog.ts](src/infrastructure/adapters/in/http/error-catalog.ts), and a contract test checks that every domain error is in it.

## Caching and rate limiting

### Cache layers

| Layer                | Effect                                                                         |
| -------------------- | ------------------------------------------------------------------------------ |
| HTTP `Cache-Control` | Public read routes send `public, max-age=…`; `/api/me*` is `private, no-store` |
| Redis                | `CachedProductQueries` and `CachedTopicQueries` decorate the Prisma queries    |
| PostgreSQL index     | `Product(status, upvotes DESC, createdAt DESC)` keeps a cache miss cheap       |

### Redis strategy

- **Version-based invalidation.** Each group has a version number that is part of the cache key. An admin write bumps the version, which makes every old key unreachable at once; they expire by TTL. No key scanning.
- **Votes do not invalidate lists**, otherwise the cache would never warm up. Lists lag by at most the 15 s TTL, and the product detail key is deleted on each vote.
- **Stampede protection.** On a miss, only one request loads from the database while the others wait briefly. TTLs get a ±10% random jitter.
- **Fail-open.** Each Redis call has a short timeout and a circuit breaker. If Redis fails, the request reads from PostgreSQL and the rate limiter falls back to an in-memory limiter. Users never see an error.

### Rate limits

| Route group   | Limit per minute |
| ------------- | ---------------- |
| Public reads  | 120 per IP       |
| Votes         | 30 per user      |
| Admin writes  | 60 per user      |
| Image uploads | 10 per user      |

Over the limit the API answers `429 RATE_LIMITED` with a `Retry-After` header. Set `TRUST_PROXY` correctly behind a reverse proxy, otherwise every request looks like it comes from the proxy.

## Data model

```
User 1───* Vote *───1 Product 1───0..1 Review
                       │
                       * (many to many)
                     Topic 1───* TopicTranslation (en, pt-BR)

ProductImage   (bytes of an uploaded image, served at /files/:fileName)
```

| Model              | Notes                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `User`             | `externalId` (Clerk id, unique) and `role` (`USER` or `ADMIN`)                                                                 |
| `Product`          | Unique `title`, short and long description, `url`, `imageUrl`, `status` (`PUBLISHED` or `COMING_SOON`), denormalized `upvotes` |
| `Vote`             | `unique(userId, productId)`; deleted with the user or the product                                                              |
| `Review`           | At most one per product (`productId` unique), `rating` 1–5 and `summary`                                                       |
| `Topic`            | Immutable `slug` derived from the English name, `position` for ordering                                                        |
| `TopicTranslation` | One per locale, `unique(topicId, locale)` and `unique(locale, name)`                                                           |
| `ProductImage`     | Uploaded image bytes and content type                                                                                          |

Migrations live in `prisma/migrations` and are applied with `prisma migrate deploy`. CI verifies they match `schema.prisma`.

## Business rules

1. Each user has at most one vote per product; voting again removes it.
2. The vote and the `upvotes` change happen in one transaction, with an atomic increment in the database.
3. The public list is ordered by `upvotes` descending, ties broken by newest first. "Coming soon" is ordered by newest first.
4. Only admins create, edit and delete products, reviews and topics, and upload images.
5. `upvotes` never goes negative (entity invariant plus a database check).
6. "Coming soon" products do not receive votes and are not part of the main list. A product can go back to "coming soon" and keeps its existing votes.
7. A review has a rating from 1 to 5 and a required summary. It is independent of the product status.
8. Every product has at least one topic, and every referenced topic must exist.
9. Topics need a name in both languages, unique per language. The slug comes from the English name and never changes.
10. Reordering topics requires exactly all existing topic ids.
11. A topic can only be deleted if no product would be left without topics; otherwise `TOPIC_IN_USE` lists the blocking products. When allowed, it is detached from products and positions are compacted.
12. Product titles are unique.
13. Images must be PNG or JPEG, verified by content (not by extension), up to 5 MB, and stored under a server-generated name.

## Background jobs

Two maintenance jobs run through `src/main/jobs.ts` and require `REPOSITORY_DRIVER=prisma`:

| Job                     | Suggested schedule | What it does                                                            |
| ----------------------- | ------------------ | ----------------------------------------------------------------------- |
| `reconcile-upvotes`     | daily              | Recomputes `Product.upvotes` from the `Vote` table and logs differences |
| `cleanup-orphan-images` | weekly             | Deletes stored images that no product references (older than 24 h)      |

```bash
npm run jobs -- reconcile-upvotes
npm run jobs -- cleanup-orphan-images

# in a built image or on a scheduler
node dist/main/jobs.js reconcile-upvotes
```

## Observability

- **Logs:** structured JSON through pino, one line per request with `requestId`, method, route, status, latency and user id when known. Tokens, passwords and request bodies are never logged. Admin writes are tagged `audit: true`.
- **Health:** `GET /health` (liveness) and `GET /health/ready` (readiness, with a `checks` object for the database and Redis).
- **Metrics:** set `METRICS_TOKEN` to expose Prometheus metrics at `GET /metrics`: `http_request_duration_seconds` (latency by method, route and status), `http_errors_total` (by error code), `cache_lookups_total` (hit or miss) and the default Node.js process metrics.
- **Local Prometheus and Grafana:** the Compose file has an optional `monitoring` profile.

```bash
docker compose --profile monitoring up -d --build --wait
```

| Service    | URL                     | Notes                                                                                 |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------- |
| Prometheus | `http://localhost:9090` | Scrapes `api:3333/metrics` every 5 s (config in `monitoring/prometheus.yml`)          |
| Grafana    | `http://localhost:3001` | No login in this local setup; the Prometheus data source is provisioned automatically |

In this Compose setup the API uses the fixed development token `dev-metrics-token` (set in `docker-compose.yaml` and `monitoring/prometheus.yml`). Never reuse it outside local development. To build your first chart in Grafana: open **Dashboards → New → New dashboard → Add visualization**, pick the **Prometheus** data source, switch the query editor (below the preview) from **Builder** to **Code**, paste a query and press Shift+Enter, then save the dashboard. Generate some traffic first (for example a few `curl` calls to `/api/products`) or the chart will be empty. Example queries:

```
histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[1m])))
sum(rate(cache_lookups_total{result="hit"}[1m])) / sum(rate(cache_lookups_total[1m]))
sum by (code) (rate(http_errors_total[5m]))
```

- **Errors:** set `SENTRY_DSN` to report 5xx errors, tagged with the `requestId`.
- **Graceful shutdown:** on `SIGTERM` the server stops accepting connections, finishes in-flight requests and closes Prisma and Redis.

## Testing

| Suite       | Command                    | What it covers                                                                                                                             |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | `npm run test:unit`        | Domain, use cases and infrastructure helpers with in-memory adapters. No I/O                                                               |
| Contract    | `npm run test:contract`    | The same repository suite against in-memory and Prisma, plus the error catalog                                                             |
| Integration | `npm run test:integration` | Prisma repositories on a real PostgreSQL, Redis cache and limiter on a real Redis, HTTP routes with supertest, maintenance jobs, hardening |
| All         | `npm test`                 | Everything above                                                                                                                           |

Integration and contract tests start PostgreSQL and Redis with **Testcontainers**, so Docker must be running.

### Load tests

[k6](https://k6.io) scripts live in `tests/load`. Start the API with `RATE_LIMIT_DRIVER=none`, otherwise the per-IP limits answer `429`.

```bash
k6 run tests/load/products.js                  # browsing, thresholds: p95 < 200 ms, < 1% errors
PRODUCT_ID=<id> k6 run tests/load/votes.js     # vote spikes
```

The vote script uses `dev:` tokens, so run it against an API without `CLERK_SECRET_KEY`.

## Scripts

| Script                                                                     | What it does                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                                                              | Run the API with reload (`tsx watch`, loads `.env`) |
| `npm run build`                                                            | Compile TypeScript to `dist/`                       |
| `npm start`                                                                | Run the compiled API                                |
| `npm run jobs -- <job>`                                                    | Run a maintenance job                               |
| `npm run lint`                                                             | ESLint, including the architecture boundary rules   |
| `npm run typecheck`                                                        | `tsc --noEmit`                                      |
| `npm run format` / `format:check`                                          | Prettier                                            |
| `npm test`, `test:unit`, `test:integration`, `test:contract`, `test:watch` | Vitest suites                                       |
| `npm run prisma:generate`                                                  | Generate the Prisma client                          |
| `npm run prisma:migrate`                                                   | Create and apply a migration in development         |
| `npm run prisma:deploy`                                                    | Apply pending migrations (production)               |
| `npm run prisma:seed`                                                      | Seed development data                               |

Husky and lint-staged run ESLint and Prettier on staged `.ts` files before each commit.

## Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yaml` runs these steps:

1. Install dependencies and generate the Prisma client.
2. Check formatting, lint (with the layer boundary rules) and type check.
3. Run all tests (PostgreSQL and Redis through Testcontainers).
4. Build the project.
5. Verify that `prisma/migrations` matches `schema.prisma`.
6. Audit production dependencies with `npm audit`.
7. Build the Docker image.

Dependabot keeps npm packages and GitHub Actions up to date.

## Deploying to production

The Dockerfile is multi-stage: `build` compiles the code, `migrate` is used by Docker Compose to run migrations and the seed, and `runtime` is the final, slim image that runs as a non-root user with a health check.

```bash
docker build -t product-hunt-backend .
```

1. Provision PostgreSQL and Redis (for example on Railway), and run the API as an always-on Node service.
2. Set the environment. Required in production: `NODE_ENV=production`, `REPOSITORY_DRIVER=prisma`, `DATABASE_URL`, `REDIS_URL` and `CLERK_SECRET_KEY`. Also set `CLERK_WEBHOOK_SECRET`, `CLERK_AUTHORIZED_PARTIES`, `ADMIN_EXTERNAL_IDS`, `CORS_ORIGIN`, `PUBLIC_URL` and, behind a proxy, `TRUST_PROXY`.
3. Apply migrations before starting a new version: `npx prisma migrate deploy`. Keep migrations backward compatible (add first, remove later) for zero-downtime deploys.
4. Use `GET /health/ready` as the platform health check.
5. Schedule the two jobs (`reconcile-upvotes` daily, `cleanup-orphan-images` weekly).
6. Create a Clerk webhook pointing to `https://<your-api>/api/webhooks/clerk` for `user.created`, `user.updated` and `user.deleted`, and copy its signing secret to `CLERK_WEBHOOK_SECRET`.

The API is stateless, so it can run as several replicas that share the same PostgreSQL and Redis. Rollback means redeploying the previous image; destructive migrations should be done in two steps.

## Conventions

- All code is in English: identifiers, files, routes, JSON fields, tables, environment variables, tests and commits.
- Files and folders in `kebab-case`, classes and types in `PascalCase`, functions and variables in `camelCase`, constants and environment variables in `UPPER_SNAKE_CASE`.
- Port implementations are prefixed by their technology: `PrismaProductRepository`, `InMemoryProductRepository`, `RedisCacheStore`.
- Domain errors end in `Error` and have a stable `UPPER_SNAKE_CASE` code.
- Entities are created with `create()` (validates) and rebuilt with `restore()` (trusts the database). The domain never calls `Date.now()` or generates ids; use cases pass them in through `Clock` and `IdGenerator`.
- Commits follow Conventional Commits, for example `feat: add toggle vote use case`.

## License

MIT. See [LICENSE](LICENSE).
