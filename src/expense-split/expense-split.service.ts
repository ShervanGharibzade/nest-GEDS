import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ExpenseSplitService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Splits are never created or mutated directly through this service's
   * public API — they are only ever created by ExpenseService (as part of
   * creating an expense) and only ever transitioned to PAID by
   * TransactionService (as part of recording a payment). This service is
   * read/query only, by design (see TODO section 7).
   */

  async findAllSplitsForGroup(groupId: number, userId: number) {
    const splits = await this.prisma.expenseSplit.findMany({
      where: {
        userId,
        expense: { groupId },
      },
      select: {
        id: true,
        uuid: true,
        amount: true,
        status: true,
        expenseId: true,
        userId: true,
      },
      orderBy: { id: 'desc' },
    });

    const total = splits.reduce((sum, split) => sum + split.amount, 0n);

    return {
      splits: splits.map((s) => ({ ...s, amount: s.amount.toString() })),
      total: total.toString(),
    };
  }

  async findOne(id: number, userId: number) {
    const split = await this.prisma.expenseSplit.findUnique({
      where: { id },
      include: { expense: { select: { groupId: true, paidById: true } } },
    });

    if (!split) {
      throw new NotFoundException('Expense split not found');
    }

    const isOwner = split.userId === userId;
    const isPayer = split.expense.paidById === userId;
    if (!isOwner && !isPayer) {
      throw new ForbiddenException(
        'You can only view splits that belong to you or that you are owed',
      );
    }

    return { ...split, amount: split.amount.toString() };
  }
}
