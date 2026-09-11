# GEDS — Group Expense & Debt Sharing

GEDS is a NestJS + PostgreSQL + Redis backend for groups that share expenses, split debts, record payments, and calculate group balances.

## Features

- Register/login with bcrypt password hashing.
- Short-lived JWT access tokens.
- HttpOnly refresh-token cookie with Redis-backed rotation and revocation.
- UUIDs are the public identifiers; internal numeric database IDs stay server-side.
- Groups with owner-only management and automatic owner membership.
- Automatic, integer-safe expense splitting with remainder distribution.
- Payer's own split is created as `PAID`; only other members owe the payer.
- Payments atomically mark a split `PAID`, create a transaction, and close the expense when no unpaid splits remain.
- Group balances and outstanding debtor → creditor relationships.
- Stable response DTOs; passwords and raw Prisma users are never returned.
- Strict request validation and authorization.
- Swagger/OpenAPI at `/docs`.
- PostgreSQL + Redis + API Docker Compose stack.
- Health endpoint at `/health`.

## Stack

- NestJS
- TypeScript
- Prisma 7 with PostgreSQL adapter
- PostgreSQL 17
- Redis
- JWT / Passport
- bcrypt
- class-validator / class-transformer
- Swagger

## Setup

1. Copy `.env.example` to `.env` and use strong, different JWT secrets.
2. Start infrastructure:

```bash
docker compose up -d postgres redis
```

3. Install dependencies:

```bash
pnpm install
```

4. Generate Prisma Client:

```bash
pnpm prisma:generate
```

5. Apply migrations:

```bash
pnpm exec prisma migrate deploy --config ./prisma.config.ts
```

6. Start the API:

```bash
pnpm start:dev
```

API: `http://localhost:3000`

Swagger: `http://localhost:3000/docs`

## Production

Build the API image and start all services:

```bash
docker compose up -d --build
```

The API waits for healthy PostgreSQL and Redis containers.

For production, replace the example database credentials and JWT secrets, set `NODE_ENV=production`, configure a real `CORS_ORIGIN`, and terminate TLS at the reverse proxy/load balancer.

## Authentication flow

### Register

`POST /auth/register`

Returns a safe user DTO. The password hash is never returned.

### Login

`POST /auth/login`

Returns an access token and sets `refresh_token` as an HttpOnly cookie.

### Refresh

`POST /auth/refresh`

The refresh cookie is verified cryptographically and against Redis. A new refresh token is issued and the old Redis value is replaced.

### Sign out

`POST /auth/sign-out`

Requires the access token, revokes the user's Redis refresh token, and clears the refresh cookie.

Protected endpoints use the access-token JWT subject (`req.user.sub`) as the authenticated user's public UUID. They do not use the refresh cookie as the user's identity.

## Core API

- `POST /groups`
- `GET /groups/mine`
- `GET /groups/:uuid`
- `GET /groups/:uuid/balances`
- `PATCH /groups/:uuid`
- `DELETE /groups/:uuid`
- `POST /groups/:groupUuid/members`
- `GET /groups/:groupUuid/members`
- `DELETE /groups/:groupUuid/members/:userUuid`
- `POST /expenses`
- `GET /expenses`
- `GET /expenses/:uuid`
- `GET /groups/:groupUuid/splits/mine`
- `POST /transactions`
- `GET /transactions/mine`
- `GET /transactions/group/:groupUuid`
- `GET /transactions/:uuid`
- `GET /users/me`
- `GET /users` (ADMIN)
- `PATCH /users/:uuid`
- `PATCH /users/:uuid/role` (ADMIN)
- `DELETE /users/:uuid`

Expense splits intentionally have no public create/update/delete endpoint. They are created by the expense service and changed to `PAID` only by the transaction/payment flow.

## Expense example

Assume A, B and C are group members and A pays 300.

The expense creates three 100-unit shares:

- A: `PAID`, 100
- B: `UNPAID`, 100
- C: `UNPAID`, 100

B and C each call `POST /transactions` with the expense UUID and exact debt amount. Each call atomically marks the split paid and records a transaction. After C pays, the expense becomes `CLOSE`.

If the amount does not divide evenly, the remainder is distributed one unit at a time across the members, so the sum of all splits always equals the expense amount.

## BigInt / money representation

Database amounts are PostgreSQL `BIGINT`. API request amounts are positive integer strings representing the smallest currency unit. API responses serialize amounts as strings to avoid JavaScript precision loss.

Example:

```json
{
  "amount": "300"
}
```

## Testing

Unit tests:

```bash
pnpm test
pnpm test:cov
```

E2E tests require PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
pnpm exec prisma migrate deploy --config ./prisma.config.ts
pnpm test:e2e
```

The E2E scenario registers A/B/C, creates a group, adds members, creates an expense, pays the debts, verifies `PAID` splits, verifies `CLOSE`, checks transactions, and checks balances.

## Database migrations

The UUID migration uses PostgreSQL `gen_random_uuid()` as a database default, so UUID columns can be added to existing rows without relying on Prisma-level defaults.

The transaction `expenseId` migration is intended for a clean database because historical transaction rows cannot be assigned an expense safely when the old schema did not store that relationship.

For an existing production database with historical transactions, create a data-specific backfill plan before making `expenseId` mandatory.

## Security

- Access tokens are short-lived.
- Refresh tokens are HttpOnly.
- Refresh tokens are rotated and Redis-backed.
- Refresh cookies become Secure in production.
- Login/register have an in-process rate limiter.
- CORS is explicitly configured.
- Security response headers are enabled.
- Required environment variables and JWT secret strength are validated at startup.
- ValidationPipe rejects unexpected fields.
- Password hashes never cross the API response boundary.
- Authorization is enforced using the access-token identity.

## Deliberately deferred

The project does not add microservices, Kafka, CQRS, event sourcing, or WebSockets. These are outside the current Definition of Done.
