# GEDS TODO — Completion Status

This tracks progress against `GEDS_Project_Completion_TODO.docx`, section by
section. "Done" means implemented and manually reviewed against the schema
and existing code; it has **not** been verified with a real `pnpm install`
+ build + test run (this environment has no network access — see the
"How to verify" note at the bottom).

## 1. Prisma / Database — Done
- Fixed the `add_uuid` migration (it added `NOT NULL` columns with only a
  Prisma-level default, which fails on non-empty tables). Now backfills via
  a temporary DB-level default (`gen_random_uuid()`).
- Cascade deletes were already correctly declared in the schema.
- BigInt used consistently for all money fields; split math done in BigInt.
- `uuid` exposed on every response DTO as the public identifier, alongside
  the numeric `id` that routing still uses (see "Known follow-ups" below).

## 2. Authentication — Done
- Register/login/refresh/sign-out flows were already solid; unchanged.
- Added a `CurrentUser` decorator that reads the verified JWT (`req.user`)
  and rewired every other controller to use it instead of decoding the
  refresh-token cookie.

## 3. User authorization/DTOs — Done
- `passwordHash` no longer leaks from any endpoint.
- Self-or-admin authorization on update/delete; admin-only role changes and
  user listing.

## 4. Group and GroupMember — Done
- Creator is auto-added as a member on group creation.
- `myGroups` includes membership, not just ownership.
- Fixed the broken `DELETE` route (`:userId/groupId` → `:groupId/:userId`).
- Owner can no longer be removed as a member.
- Removing a member is blocked while they have unresolved debts (as debtor
  or creditor) in that group.
- Added `GET /group-member/group/:groupId` to list a single group's members.

## 5. Expense creation/splits — Done
- BigInt-safe split calculation with deterministic remainder distribution
  (no lost/gained cents).
- `findOne`/`findAllForGroup` now include splits and restrict visibility to
  group members.

## 6. Remove public ExpenseSplit mutation — Done
- Deleted the `create`/`update`/`delete` endpoints and DTOs entirely.
  `expense-split` is now read-only.

## 7. (merged into 6 above)

## 8. Transactions/Payments — Done
- Removed the two controller methods that called non-existent service
  methods (`findAll`/`remove` — this was a compile-breaking bug).
- Debtor is always the authenticated caller; creditor is always the
  expense's payer — never client-supplied.
- Verifies group membership, split ownership, split is UNPAID, and that the
  payment amount exactly matches the outstanding debt.
- Added `GET /transaction/group/:groupId` (group payment history) and kept
  `GET /transaction/mine` / `GET /transaction/:id`.

## 9. Expense closing — Done
- After a payment, if no UNPAID splits remain, the expense flips to
  `CLOSE` in the same DB transaction. Payments against a `CLOSE` expense
  are rejected.

## 10. Group balances — Done
- `GET /group/:id/balances` returns per-member total paid / total owed /
  net balance, plus a netted "who owes whom" debts list. Debts are computed
  only from UNPAID splits, so completed transactions are already reflected.

## 11–12. DTOs & validation — Done
- Every mutating endpoint has a `class-validator`-annotated DTO.
- Global `ValidationPipe` already had `whitelist`/`forbidNonWhitelisted` —
  confirmed unchanged and still in effect.
- Added response DTOs (Group, GroupMember, Expense, Transaction, User) so
  raw Prisma rows (with internal-only fields) are never returned directly.

## 13. Authorization audit — Done
- Walked every route; see sections 3–10 above for the specific rule per
  resource.

## 14. Cleanup — Done
- Removed the dead `trnasaction` module import that broke the build.
- Removed several stray/dead files found during the audit: a duplicate
  `add-member-group.dto copy.ts`, a broken `update-group-member.dto.ts`
  (imported a class name that didn't exist), and an orphaned
  `UpdateExpenseDto`/`ExpenseMapper` pair that nothing referenced.
- Replaced the Nest starter `AppController`/`AppService` ("Hello World")
  with a real `/health` endpoint.

## 15. Error handling — Done
- Expanded `ERROR_MESSAGES` into a comprehensive, consistent set of error
  factories covering every resource. Newly written services use it/
  consistent exception types throughout (`NotFoundException`,
  `ForbiddenException`, `ConflictException`, `BadRequestException`); no
  internal details (stack traces, raw DB errors) are ever returned.

## 16. Unit tests — Partially done
Written with mocked Prisma (no DB needed): `UsersService`, `GroupService`,
`ExpenseService` (including the remainder-distribution math), and
`TransactionService` (including the auto-close and duplicate-payment
rejection paths). **Not** written: `GroupMemberService`,
`ExpenseSplitService`, guard/decorator unit tests. Reasonable follow-up if
you want full coverage.

## 17. E2E test — Done
`test/geds-flow.e2e-spec.ts` implements the exact flow from the TODO:
register A/B/C → A creates a group → A adds B and C → A creates a 300-unit
expense → B and C pay their debts → splits become PAID → expense becomes
CLOSE — plus extra assertions (balances net to zero, transaction history,
duplicate-payment rejection, non-owner blocked from adding members,
unauthenticated request rejected). Requires a real Postgres + Redis (see
README).

## 18. Swagger — Done
`@ApiTags`/`@ApiOperation`/`@ApiBearerAuth` added across all controllers;
`SwaggerModule` wired up in `main.ts`, served at `/docs`.

## 19. Security pass — Done
- Helmet, CORS (configurable origin), global rate limiting
  (`@nestjs/throttler`) plus a tighter limit on `/auth/register` and
  `/auth/login`.
- Required environment variables validated at startup with a Joi schema
  (`src/common/config/env.validation.ts`) — the app refuses to boot with a
  missing/malformed/too-short secret.
- Confirmed `.env` was already git-ignored and never committed.

## 20. Docker/production — Done
- Added a multi-stage production `Dockerfile` (deps → build → prod-deps →
  minimal runner, non-root user, container `HEALTHCHECK`).
- `docker-compose.yml` now brings up Postgres, Redis, *and* the API, with
  proper health checks and `depends_on: condition: service_healthy`.
- Migrations are an explicit `pnpm migrate:deploy` step (not run
  automatically on container start), to avoid multiple replicas racing.

## 21. README — Done
Full rewrite: setup, architecture/design notes, full endpoint table,
end-to-end example walkthrough, security section.

---

## Known follow-ups (deliberately out of scope for this pass)
- **UUID-only public routing.** Every response now includes `uuid`, but
  routes are still numeric-`id`-based to limit the size of this change.
  Migrating every route/lookup to UUIDs is a reasonable next step.
- Unit tests for `GroupMemberService` / `ExpenseSplitService`.
- Full `ERROR_MESSAGES` constant integration at every single throw site
  (the error *types* and messages are already consistent; some services
  still throw inline rather than via the constants file).

## How to verify
This sandbox has no network access, so none of the above could be
confirmed with a real `pnpm install && pnpm build && pnpm test` run. The
code was written carefully against the existing patterns and schema, and
checked with a syntax-only TypeScript pass, but please run the full
install/build/test/e2e cycle locally or in CI before merging.
