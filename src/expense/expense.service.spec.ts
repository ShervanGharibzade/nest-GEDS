import { ExpenseService } from './expense.service.js';

describe('ExpenseService', () => {
  it('creates exact integer splits, includes payer as an already-paid share, and closes only when all shares are paid', async () => {
    const tx = {
      expense: {
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn(),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          uuid: 'e', description: 'Dinner', amount: 301n, status: 'OPEN',
          group: { uuid: 'g-a', name: 'Group' },
          paidBy: { uuid: 'u-a', name: 'A', email: 'a@test' },
          splits: [
            { uuid: 's1', user: { uuid: 'u-a', name: 'A', email: 'a@test' }, amount: 101n, status: 'PAID' },
            { uuid: 's2', user: { uuid: 'u-b', name: 'B', email: 'b@test' }, amount: 100n, status: 'UNPAID' },
            { uuid: 's3', user: { uuid: 'u-c', name: 'C', email: 'c@test' }, amount: 100n, status: 'UNPAID' },
          ],
          createdAt: new Date(),
        }),
      },
      expenseSplit: {
        createMany: vi.fn(),
        count: vi.fn().mockResolvedValue(2),
      },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 10, uuid: 'u-a' }) },
      group: {
        findUnique: vi.fn().mockResolvedValue({
          id: 20,
          uuid: 'g-a',
          members: [
            { userId: 10, user: { uuid: 'u-a', name: 'A', email: 'a@test' } },
            { userId: 11, user: { uuid: 'u-b', name: 'B', email: 'b@test' } },
            { userId: 12, user: { uuid: 'u-c', name: 'C', email: 'c@test' } },
          ],
        }),
      },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any;

    const service = new ExpenseService(prisma);
    await expect(service.create({ groupId: 'g-a', amount: '301', description: 'Dinner' }, 'u-a')).resolves.toBeDefined();

    expect(tx.expenseSplit.createMany).toHaveBeenCalledWith({
      data: [
        { expenseId: 1, userId: 10, amount: 101n, status: 'PAID' },
        { expenseId: 1, userId: 11, amount: 100n, status: 'UNPAID' },
        { expenseId: 1, userId: 12, amount: 100n, status: 'UNPAID' },
      ],
    });
    expect(tx.expense.update).not.toHaveBeenCalled();
  });
});
