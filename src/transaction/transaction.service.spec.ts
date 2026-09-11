import { TransactionService } from './transaction.service.js';

describe('TransactionService', () => {
  it('rejects a payment with the wrong amount before changing the split', async () => {
    const tx = {
      expense: { findUnique: vi.fn().mockResolvedValue({
        id: 1, uuid: 'expense-uuid', groupId: 2, paidById: 10, status: 'OPEN',
        group: { members: [{ userId: 10 }, { userId: 11 }] },
      }) },
      expenseSplit: { findUnique: vi.fn().mockResolvedValue({ id: 9, amount: 100n, status: 'UNPAID' }) },
      expense: undefined,
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 11, uuid: 'debtor' }) },
      $transaction: vi.fn(async (callback: any) => callback({
        expense: { findUnique: tx.expense.findUnique },
        expenseSplit: tx.expenseSplit,
      })),
    } as any;

    const service = new TransactionService(prisma);
    await expect(service.create({ expenseId: 'expense-uuid', amount: '99' }, 'debtor'))
      .rejects.toThrow('Payment amount must equal the debt');
  });
});
