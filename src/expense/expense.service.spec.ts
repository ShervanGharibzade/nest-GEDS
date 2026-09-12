import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpenseService } from './expense.service.js';

function buildService() {
  const prisma = {
    group: { findUnique: vi.fn() },
    groupMember: { findMany: vi.fn(), findUnique: vi.fn() },
    expense: { create: vi.fn(), findUnique: vi.fn() },
    expenseSplit: { createMany: vi.fn() },
    $transaction: vi.fn(async (cb: any) => cb(prisma)),
  };

  const service = new ExpenseService(prisma as any);
  return { service, prisma };
}

describe('ExpenseService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a non-member trying to create an expense', async () => {
    const { service, prisma } = buildService();
    prisma.group.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
    prisma.groupMember.findMany.mockResolvedValue([{ userId: 2 }, { userId: 3 }]);

    await expect(
      service.create({ groupId: 1, amount: 300, description: 'Dinner' }, 99),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-positive amounts', async () => {
    const { service } = buildService();
    await expect(
      service.create({ groupId: 1, amount: 0, description: 'x' }, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('splits the amount evenly across debtors, distributing the remainder deterministically', async () => {
    const { service, prisma } = buildService();
    prisma.group.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
    // 3 members total, payer is userId 1 -> 2 debtors (2 and 3)
    prisma.groupMember.findMany.mockResolvedValue([
      { userId: 1 },
      { userId: 2 },
      { userId: 3 },
    ]);
    prisma.expense.create.mockResolvedValue({ id: 42, paidById: 1 });
    prisma.expense.findUnique.mockResolvedValue({
      id: 42,
      groupId: 1,
      paidBy: { id: 1, name: 'Payer', email: 'p@p.com' },
      splits: [],
    });
    prisma.groupMember.findUnique.mockResolvedValue({ groupId: 1, userId: 1 });

    // 100 split 3 ways = 33, 33, 34 (33*3=99, remainder 1)
    await service.create({ groupId: 1, amount: 100, description: 'Dinner' }, 1);

    expect(prisma.expenseSplit.createMany).toHaveBeenCalledWith({
      data: [
        { amount: 34n, expenseId: 42, userId: 2 }, // remainder goes to lowest userId first
        { amount: 33n, expenseId: 42, userId: 3 },
      ],
    });
  });
});
