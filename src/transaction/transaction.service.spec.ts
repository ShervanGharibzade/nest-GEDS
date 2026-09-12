import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { ExpenseStatus, SplitStatus } from '../prisma/generated/enums.js';

function buildService() {
  const prisma = {
    expense: { findUnique: vi.fn(), update: vi.fn() },
    groupMember: { findUnique: vi.fn() },
    expenseSplit: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    transaction: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    group: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: any) => cb(prisma)),
  };

  const service = new TransactionService(prisma as any);
  return { service, prisma };
}

describe('TransactionService', () => {
  beforeEach(() => vi.clearAllMocks());

  const openExpense = { id: 1, groupId: 1, paidById: 10, status: ExpenseStatus.OPEN };

  it('rejects payment against a closed expense', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue({ ...openExpense, status: ExpenseStatus.CLOSE });

    await expect(
      service.create({ expenseId: 1, amount: 50 }, 20),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a non-member', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue(openExpense);
    prisma.groupMember.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ expenseId: 1, amount: 50 }, 20),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the caller has no split for this expense', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue(openExpense);
    prisma.groupMember.findUnique.mockResolvedValue({ groupId: 1, userId: 20 });
    prisma.expenseSplit.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ expenseId: 1, amount: 50 }, 20),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects paying an already-paid split', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue(openExpense);
    prisma.groupMember.findUnique.mockResolvedValue({ groupId: 1, userId: 20 });
    prisma.expenseSplit.findUnique.mockResolvedValue({
      id: 5,
      status: SplitStatus.PAID,
      amount: 50n,
    });

    await expect(
      service.create({ expenseId: 1, amount: 50 }, 20),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a wrong payment amount', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue(openExpense);
    prisma.groupMember.findUnique.mockResolvedValue({ groupId: 1, userId: 20 });
    prisma.expenseSplit.findUnique.mockResolvedValue({
      id: 5,
      status: SplitStatus.UNPAID,
      amount: 50n,
    });

    await expect(
      service.create({ expenseId: 1, amount: 49 }, 20),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks the split PAID, records a transaction, and closes the expense when nothing is left unpaid', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue(openExpense);
    prisma.groupMember.findUnique.mockResolvedValue({ groupId: 1, userId: 20 });
    prisma.expenseSplit.findUnique.mockResolvedValue({
      id: 5,
      status: SplitStatus.UNPAID,
      amount: 50n,
    });
    prisma.transaction.create.mockResolvedValue({ id: 100, amount: 50n });
    prisma.expenseSplit.count.mockResolvedValue(0); // nothing left unpaid

    await service.create({ expenseId: 1, amount: 50 }, 20);

    expect(prisma.expenseSplit.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: SplitStatus.PAID },
    });
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        groupId: 1,
        fromUserId: 20,
        toUserId: 10,
        expenseId: 1,
        amount: 50n,
        description: undefined,
      },
    });
    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: ExpenseStatus.CLOSE },
    });
  });

  it('does NOT close the expense while other splits remain unpaid', async () => {
    const { service, prisma } = buildService();
    prisma.expense.findUnique.mockResolvedValue(openExpense);
    prisma.groupMember.findUnique.mockResolvedValue({ groupId: 1, userId: 20 });
    prisma.expenseSplit.findUnique.mockResolvedValue({
      id: 5,
      status: SplitStatus.UNPAID,
      amount: 50n,
    });
    prisma.transaction.create.mockResolvedValue({ id: 100, amount: 50n });
    prisma.expenseSplit.count.mockResolvedValue(1); // one split still unpaid

    await service.create({ expenseId: 1, amount: 50 }, 20);

    expect(prisma.expense.update).not.toHaveBeenCalled();
  });
});
