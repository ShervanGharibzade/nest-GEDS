import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpenseStatus, SplitStatus } from '../prisma/generated/enums.js';
import { Transaction } from '../prisma/generated/client.js';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pay off the authenticated user's own split for an expense.
   * - debtor is always the authenticated user (never client input)
   * - creditor is always the expense's payer
   * - amount must exactly equal the outstanding split amount
   * - the split must belong to the caller, be UNPAID, and its expense OPEN
   * - marking the split PAID + creating the Transaction happens atomically
   * - if that was the last unpaid split for the expense, the expense is
   *   automatically closed (status -> CLOSE)
   */
  async create(
    createTransactionDto: CreateTransactionDto,
    debtorId: number,
  ): Promise<Transaction> {
    const { expenseId, amount, description } = createTransactionDto;

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
      });

      if (!expense) {
        throw new NotFoundException('Expense not found');
      }

      if (expense.status === ExpenseStatus.CLOSE) {
        throw new ConflictException(
          'This expense is already closed; no further payments are accepted',
        );
      }

      const membership = await tx.groupMember.findUnique({
        where: {
          groupId_userId: { groupId: expense.groupId, userId: debtorId },
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          'You must be a member of this group to pay a debt in it',
        );
      }

      const split = await tx.expenseSplit.findUnique({
        where: {
          expenseId_userId: { expenseId, userId: debtorId },
        },
      });

      if (!split) {
        throw new NotFoundException(
          'You do not have an outstanding split for this expense',
        );
      }

      if (split.status === SplitStatus.PAID) {
        throw new ConflictException('This split has already been paid');
      }

      const amountBig = BigInt(amount);
      if (split.amount !== amountBig) {
        throw new BadRequestException(
          `Payment amount must equal the outstanding debt of ${split.amount.toString()}`,
        );
      }

      await tx.expenseSplit.update({
        where: { id: split.id },
        data: { status: SplitStatus.PAID },
      });

      const transaction = await tx.transaction.create({
        data: {
          groupId: expense.groupId,
          fromUserId: debtorId,
          toUserId: expense.paidById,
          expenseId,
          amount: amountBig,
          description,
        },
      });

      const remainingUnpaid = await tx.expenseSplit.count({
        where: { expenseId, status: SplitStatus.UNPAID },
      });

      if (remainingUnpaid === 0) {
        await tx.expense.update({
          where: { id: expenseId },
          data: { status: ExpenseStatus.CLOSE },
        });
      }

      return transaction;
    });
  }

  async myTransactions(userId: number): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: number, transactionId: number): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.fromUserId !== userId && transaction.toUserId !== userId) {
      throw new ForbiddenException(
        'You can only view transactions you sent or received',
      );
    }

    return transaction;
  }

  /** Full payment history for a group — members only. */
  async groupHistory(groupId: number, userId: number): Promise<Transaction[]> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.ownerId !== userId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      if (!membership) {
        throw new ForbiddenException(
          'Only members of this group can view its transaction history',
        );
      }
    }

    return this.prisma.transaction.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
