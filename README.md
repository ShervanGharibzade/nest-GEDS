# GEDS — Group Expense & Debt Sharing

A NestJS + PostgreSQL (Prisma) + Redis backend for tracking shared group
expenses, splitting them among members, and settling debts.

## Features

- Email/password auth with short-lived JWT access tokens and rotating,
  Redis-backed HttpOnly-cookie refresh tokens.
- Groups with owner + member roles.
- Expenses are split evenly among all group members the moment they're
  created (remainders distributed deterministically so totals always add
  up exactly).
- Members pay off their own split; once every split on an expense is paid
  it's automatically closed.
- Group balance sheet: who owes whom, and how much, net of everything
  already settled.
- Role-based access control (`USER` / `ADMIN`).

## Tech stack

- NestJS 12, TypeScript
- PostgreSQL via Prisma ORM
- Redis (refresh-token storage/revocation)
- class-validator / class-transformer for request validation
- Helmet, CORS, and rate limiting (`@nestjs/throttler`) at the edge
- Swagger (OpenAPI) docs generated at runtime
- Vitest + Supertest for unit and e2e tests

## Getting started

### 1. Configure environment variables

```bash
cp .env.example .env
```

Fill in real values — in particular generate strong secrets for
`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (e.g. `openssl rand -hex 32`).
`.env` is git-ignored; never commit it. Startup fails fast with a clear
error if a required variable is missing or malformed (see
`src/common/config/env.validation.ts`).

### 2. Start Postgres + Redis

```bash
docker compose up -d postgres redis
```

### 3. Install dependencies and apply migrations

```bash
pnpm install
pnpm migrate:deploy   # applies existing migrations to a clean database
pnpm prisma:generate  # regenerate the Prisma client if needed
```

### 4. Run the API

```bash
pnpm start:dev
```

The API listens on `http://localhost:3000` by default. Interactive API
docs (Swagger UI) are served at `http://localhost:3000/docs`, and a
liveness/readiness probe is available at `GET /health`.

### Running everything in Docker

```bash
docker compose up --build
```

This brings up Postgres, Redis, and the API together. Run
`pnpm migrate:deploy` against the containerized database once before the
API can serve real traffic (migrations are a deliberate, explicit step —
not run automatically on container start — to avoid multiple replicas
racing to apply the same migration).

> **Before your first build:** `pnpm-lock.yaml` needs to be regenerated
> once locally (`pnpm install`) and committed, since `helmet`, `joi`, and
> `@nestjs/throttler` were added to `package.json` without network access
> to update the lockfile. The `Dockerfile` currently uses a plain
> `pnpm install` (not `--frozen-lockfile`) to tolerate that; switch it
> back to `--frozen-lockfile` once the lockfile is committed, for
> reproducible builds.

## Tests

```bash
pnpm test        # unit tests (mocked Prisma, no external services needed)
pnpm test:cov    # unit tests with coverage
pnpm test:e2e    # full HTTP flow against a real Postgres + Redis
```

The e2e suite (`test/geds-flow.e2e-spec.ts`) exercises the full happy
path end to end: register three users, one creates a group and adds the
other two, creates an expense, both debtors pay it off, and the test
asserts the splits flip to `PAID`, the expense automatically closes, and
the group balance sheet nets out to zero. It needs `DATABASE_URL` /
`REDIS_URL` pointing at a real (test) database — run
`docker compose up -d postgres redis && pnpm migrate:deploy` first.

## API overview

All endpoints except `POST /auth/register`, `POST /auth/login`, and
`POST /auth/refresh` require `Authorization: Bearer <accessToken>`.

| Method & path | Description |
| --- | --- |
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Log in; sets an HttpOnly refresh-token cookie, returns an access token |
| `POST /auth/refresh` | Exchange a valid refresh-token cookie for a new access token |
| `POST /auth/sign-out` | Revoke the refresh token and clear the cookie |
| `GET /users` | List users (admin only) |
| `GET /users/:id` | Get a user |
| `PATCH /users/:id` | Update a user (self or admin) |
| `PATCH /users/:id/role` | Change a user's role (admin only) |
| `DELETE /users/:id` | Delete a user (self or admin) |
| `POST /group` | Create a group (creator becomes owner + member) |
| `GET /group` | List all groups |
| `GET /group/my` | List groups you own or belong to |
| `GET /group/:id` | Get a group with its members |
| `GET /group/:id/balances` | Who owes whom in the group, and each member's net balance |
| `PATCH /group/:id` | Update a group (owner only) |
| `DELETE /group/:id` | Delete a group (owner only) |
| `POST /group-member` | Add a member to a group (owner only) |
| `GET /group-member/group/:groupId` | List a group's members |
| `DELETE /group-member/:groupId/:userId` | Remove a member (owner only; blocked while they have unresolved debts) |
| `POST /expense` | Create an expense; splits are generated automatically |
| `GET /expense?groupId=` | List a group's expenses (members only) |
| `GET /expense/:id` | Get an expense with its splits (members only) |
| `GET /expense-split/group/:groupId/mine` | Your splits within a group |
| `GET /expense-split/:id` | A single split (visible to the debtor or the payer) |
| `POST /transaction` | Pay off your own split for an expense |
| `GET /transaction/mine` | Transactions you've paid |
| `GET /transaction/group/:groupId` | A group's full payment history (members only) |
| `GET /transaction/:id` | A transaction you sent or received |

### End-to-end example

```
1. A, B, C register and log in.
2. A: POST /group { name: "Trip" }               -> group 1 (A is owner + member)
3. A: POST /group-member { groupId: 1, userId: B } -> B joins
4. A: POST /group-member { groupId: 1, userId: C } -> C joins
5. A: POST /expense { groupId: 1, amount: 300, description: "Hotel" }
     -> expense OPEN, split evenly: B owes 100, C owes 100 (A already paid)
6. B: POST /transaction { expenseId, amount: 100 }  -> B's split -> PAID
7. C: POST /transaction { expenseId, amount: 100 }  -> C's split -> PAID
     -> no splits left unpaid, expense automatically flips to CLOSE
8. Anyone: GET /group/1/balances -> everyone nets to 0, no outstanding debts
9. Anyone: GET /transaction/group/1 -> the 2 settlement transactions
```

## Design notes

- **Identity**: every protected route reads `req.user` (populated by
  `JwtStrategy` from a verified access-token JWT via the global
  `JwtAuthGuard`), never the refresh-token cookie. The refresh cookie is
  only ever read by `POST /auth/refresh` and `POST /auth/sign-out`.
- **Money**: amounts are stored as `BigInt` (smallest currency unit,
  e.g. cents) to avoid floating-point rounding errors. When an expense is
  split, any remainder from integer division is distributed one unit at a
  time to non-payer members (sorted by id) so the sum of all splits plus
  the payer's own implicit share always equals the total exactly.
- **Expense splits are never publicly mutable.** They're created only by
  `ExpenseService` (as part of creating an expense) and only transition
  to `PAID` through `TransactionService` (as part of recording a
  payment) — there is no `POST/PATCH/DELETE` on `expense-split`.
- **Removing a group member is blocked** while they have any unpaid
  splits (as debtor or creditor) in that group, so debts can never be
  silently orphaned. The group owner can't be removed at all.
- **Public vs internal identifiers**: every resource has both a numeric
  `id` (used for routing, matching the rest of this API) and a `uuid`
  (a non-guessable public identifier included in every response). A
  natural follow-up, if you want it, is migrating routes to be UUID-only.

## Security

- Passwords hashed with bcrypt (cost factor 12); `passwordHash` is never
  returned in any API response.
- Helmet sets standard security headers; CORS is restricted to
  `CORS_ORIGIN`.
- Global rate limiting via `@nestjs/throttler`, with a tighter limit
  specifically on `/auth/register` and `/auth/login`.
- Refresh tokens are stored in Redis so they can be revoked (sign-out) and
  rotated; the refresh cookie is `HttpOnly`, `SameSite=Strict`, and
  `Secure` in production, scoped to `/auth/refresh`.
- Request bodies are validated and stripped of unknown fields
  (`whitelist` + `forbidNonWhitelisted`) — clients can't smuggle extra
  fields like `id`, `status`, or `role` into a create/update payload.
- Required environment variables are validated at startup (see
  `src/common/config/env.validation.ts`); the app refuses to boot with a
  missing/weak secret instead of running insecurely.

## Not included (by design)

Per the project's scope, this deliberately does **not** include
microservices, Kafka, CQRS, event sourcing, or WebSockets.
