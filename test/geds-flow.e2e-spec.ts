import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

/**
 * Full happy-path flow from the TODO's "E2E Test" section:
 *   Register A, B, C -> A creates a group -> A adds B and C ->
 *   A creates a 300-unit expense -> B and C pay their debts ->
 *   splits become PAID -> expense becomes CLOSE.
 *
 * Requires a real Postgres + Redis reachable via DATABASE_URL / REDIS_URL
 * (see docker-compose.yml — `docker compose up -d postgres redis` and run
 * `pnpm migrate:deploy` first).
 */
describe('GEDS end-to-end flow', () => {
  let app: INestApplication<App>;
  const runId = Date.now();

  const users = {
    a: { email: `a-${runId}@test.com`, name: 'Alice', password: 'password123' },
    b: { email: `b-${runId}@test.com`, name: 'Bob', password: 'password123' },
    c: { email: `c-${runId}@test.com`, name: 'Carol', password: 'password123' },
  };

  const tokens: Record<'a' | 'b' | 'c', string> = { a: '', b: '', c: '' };
  const ids: Record<'a' | 'b' | 'c', number> = { a: 0, b: 0, c: 0 };

  let groupId: number;
  let expenseId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers A, B, and C', async () => {
    for (const key of ['a', 'b', 'c'] as const) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(users[key])
        .expect(201);
    }
  });

  it('logs each of them in and captures an access token', async () => {
    for (const key of ['a', 'b', 'c'] as const) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: users[key].email, password: users[key].password })
        .expect(200);

      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.passwordHash).toBeUndefined();

      tokens[key] = res.body.accessToken;
      ids[key] = res.body.id;
    }
  });

  it('A creates a group (and is auto-added as a member)', async () => {
    const res = await request(app.getHttpServer())
      .post('/group')
      .set('Authorization', `Bearer ${tokens.a}`)
      .send({ name: `Trip ${runId}` })
      .expect(201);

    groupId = res.body.id;
    expect(res.body.ownerId).toBe(ids.a);
  });

  it('A adds B and C to the group', async () => {
    await request(app.getHttpServer())
      .post('/group-member')
      .set('Authorization', `Bearer ${tokens.a}`)
      .send({ groupId, userId: ids.b })
      .expect(201);

    await request(app.getHttpServer())
      .post('/group-member')
      .set('Authorization', `Bearer ${tokens.a}`)
      .send({ groupId, userId: ids.c })
      .expect(201);
  });

  it('B cannot add members (not the owner)', async () => {
    await request(app.getHttpServer())
      .post('/group-member')
      .set('Authorization', `Bearer ${tokens.b}`)
      .send({ groupId, userId: ids.c })
      .expect(403);
  });

  it('A creates a 300-unit expense, split 3 ways (100 each)', async () => {
    const res = await request(app.getHttpServer())
      .post('/expense')
      .set('Authorization', `Bearer ${tokens.a}`)
      .send({ groupId, amount: 300, description: 'Hotel' })
      .expect(201);

    expenseId = res.body.id;
    expect(res.body.status).toBe('OPEN');
    expect(res.body.splits).toHaveLength(2);
    for (const split of res.body.splits) {
      expect(split.amount).toBe('100');
      expect(split.status).toBe('UNPAID');
    }
  });

  it('B pays their debt', async () => {
    await request(app.getHttpServer())
      .post('/transaction')
      .set('Authorization', `Bearer ${tokens.b}`)
      .send({ expenseId, amount: 100 })
      .expect(201);
  });

  it('the expense is still OPEN with one split left unpaid', async () => {
    const res = await request(app.getHttpServer())
      .get(`/expense/${expenseId}`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);

    expect(res.body.status).toBe('OPEN');
    const bSplit = res.body.splits.find((s: any) => s.userId === ids.b);
    expect(bSplit.status).toBe('PAID');
  });

  it('C pays their debt, closing the expense', async () => {
    await request(app.getHttpServer())
      .post('/transaction')
      .set('Authorization', `Bearer ${tokens.c}`)
      .send({ expenseId, amount: 100 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/expense/${expenseId}`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);

    expect(res.body.status).toBe('CLOSE');
    expect(res.body.splits.every((s: any) => s.status === 'PAID')).toBe(true);
  });

  it('C cannot pay the same debt twice', async () => {
    await request(app.getHttpServer())
      .post('/transaction')
      .set('Authorization', `Bearer ${tokens.c}`)
      .send({ expenseId, amount: 100 })
      .expect(409);
  });

  it('group balances reflect the completed transactions (net zero)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/group/${groupId}/balances`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);

    expect(res.body.debts).toHaveLength(0);
    const aBalance = res.body.balances.find((b: any) => b.userId === ids.a);
    expect(aBalance.netBalance).toBe('0');
  });

  it('shows the group transaction history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/transaction/group/${groupId}`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/group').expect(401);
  });
});
