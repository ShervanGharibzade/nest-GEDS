import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('GEDS core flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aToken: string;
  let bToken: string;
  let cToken: string;
  let aUuid: string;
  let bUuid: string;
  let cUuid: string;
  let groupUuid: string;
  let expenseUuid: string;

  async function registerAndLogin(email: string, name: string) {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, name, password: 'password123' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'password123' })
      .expect(200);

    return { token: login.body.accessToken as string, uuid: login.body.uuid as string };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const suffix = Date.now();
    const a = await registerAndLogin(`a-${suffix}@test.local`, 'A');
    const b = await registerAndLogin(`b-${suffix}@test.local`, 'B');
    const c = await registerAndLogin(`c-${suffix}@test.local`, 'C');
    aToken = a.token; aUuid = a.uuid;
    bToken = b.token; bUuid = b.uuid;
    cToken = c.token; cUuid = c.uuid;

    await prisma.user.update({ where: { uuid: aUuid }, data: { role: 'ADMIN' } });
    const relogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `a-${suffix}@test.local`, password: 'password123' })
      .expect(200);
    aToken = relogin.body.accessToken;
  });

  it('runs the complete expense/payment flow', async () => {
    const group = await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${aToken}`)
      .send({ name: 'Test Group' })
      .expect(201);
    groupUuid = group.body.uuid;
    expect(group.body.members).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/groups/${groupUuid}/members`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ groupId: groupUuid, userId: bUuid })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/groups/${groupUuid}/members`)
      .set('Authorization', `Bearer ${aToken}`)
      .send({ groupId: groupUuid, userId: cUuid })
      .expect(201);

    const expense = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${aToken}`)
      .send({ groupId: groupUuid, amount: '300', description: 'Dinner' })
      .expect(201);
    expenseUuid = expense.body.uuid;

    expect(expense.body.status).toBe('OPEN');
    expect(expense.body.splits).toHaveLength(3);
    expect(expense.body.splits.filter((s: any) => s.status === 'UNPAID')).toHaveLength(2);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ expenseId: expenseUuid, amount: '100' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${cToken}`)
      .send({ expenseId: expenseUuid, amount: '100' })
      .expect(201);

    const closed = await request(app.getHttpServer())
      .get(`/expenses/${expenseUuid}`)
      .set('Authorization', `Bearer ${aToken}`)
      .expect(200);
    expect(closed.body.status).toBe('CLOSE');
    expect(closed.body.splits.every((s: any) => s.status === 'PAID')).toBe(true);

    const history = await request(app.getHttpServer())
      .get(`/transactions/group/${groupUuid}`)
      .set('Authorization', `Bearer ${aToken}`)
      .expect(200);
    expect(history.body).toHaveLength(2);

    const balances = await request(app.getHttpServer())
      .get(`/groups/${groupUuid}/balances`)
      .set('Authorization', `Bearer ${aToken}`)
      .expect(200);
    expect(balances.body.debts).toHaveLength(0);

    const aBalance = balances.body.members.find((m: any) => m.user.uuid === aUuid);
    expect(aBalance.netBalance).toBe('0');
  });

  it('rejects duplicate, wrong-amount, and non-member payments', async () => {
    const second = await request(app.getHttpServer())
      .post('/expenses')
      .set('Authorization', `Bearer ${aToken}`)
      .send({ groupId: groupUuid, amount: '300', description: 'Dinner 2' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ expenseId: second.body.uuid, amount: '99' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ expenseId: second.body.uuid, amount: '100' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${bToken}`)
      .send({ expenseId: second.body.uuid, amount: '100' })
      .expect(409);

    const outsider = await registerAndLogin(`outsider-${Date.now()}@test.local`, 'Outsider');
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ expenseId: second.body.uuid, amount: '100' })
      .expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
