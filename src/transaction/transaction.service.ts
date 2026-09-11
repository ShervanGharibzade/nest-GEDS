import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';

const USER = { uuid: true, name: true, email: true } as const;

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionDto, debtorUuid: string) {
    const debtor = await this.prisma.user.findUnique({ where: { uuid: debtorUuid } });
    if (!debtor) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({
        where: { uuid: dto.expenseId },
        include: {
          group: { include: { members: { select: { userId: true } } } },
          paidBy: { select: USER },
        },
      });
      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.status === 'CLOSE') throw new ConflictException('Expense is already closed');

      if (!expense.group.members.some((m) => m.userId === debtor.id)) {
        throw new ForbiddenException('You are not a member of this group');
      }
      if (expense.paidById === debtor.id) {
        throw new ForbiddenException('The payer does not owe this expense');
      }

      const split = await tx.expenseSplit.findUnique({
        where: { expenseId_userId: { expenseId: expense.id, userId: debtor.id } },
      });
      if (!split) throw new NotFoundException('Expense split not found');
      if (split.status === 'PAID') throw new ConflictException('Debt is already paid');

      const amount = BigInt(dto.amount);
      if (amount !== split.amount) throw new ForbiddenException('Payment amount must equal the debt');

      // The conditional update makes the state transition atomic and prevents duplicate payments.
      const updated = await tx.expenseSplit.updateMany({
        where: { id: split.id, status: 'UNPAID' },
        data: { status: 'PAID' },
      });
      if (updated.count !== 1) throw new ConflictException('Debt was already paid');

      const transaction = await tx.transaction.create({
        data: {
          groupId: expense.groupId,
          fromUserId: debtor.id,
          toUserId: expense.paidById,
          expenseId: expense.id,
          amount: split.amount,
          description: dto.description?.trim() || null,
        },
        include: {
          group: { select: { uuid: true } },
          fromUser: { select: USER },
          toUser: { select: USER },
        },
      });

      const remaining = await tx.expenseSplit.count({
        where: { expenseId: expense.id, status: 'UNPAID' },
      });
      if (remaining === 0) {
        await tx.expense.update({ where: { id: expense.id }, data: { status: 'CLOSE' } });
      }

      return {
        uuid: transaction.uuid,
        expenseId: expense.uuid,
        groupId: transaction.group.uuid,
        amount: transaction.amount.toString(),
        description: transaction.description,
        fromUser: transaction.fromUser,
        toUser: transaction.toUser,
        createdAt: transaction.createdAt,
      };
    });
  }

  async myTransactions(userUuid: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { fromUser: { uuid: userUuid } },
      include: {
        group: { select: { uuid: true } },
        fromUser: { select: USER },
        toUser: { select: USER },
      },
      orderBy: { createdAt: 'desc' },
    });
    const expenseIds = [...new Set(transactions.map((t) => t.expenseId))];
    const expenses = await this.prisma.expense.findMany({ where: { id: { in: expenseIds } }, select: { id: true, uuid: true } });
    const expenseMap = new Map(expenses.map((e) => [e.id, e.uuid]));
    return transactions.map((t) => this.map(t, expenseMap.get(t.expenseId)!));
  }

  async findOne(uuid: string, userUuid: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { uuid },
      include: {
        group: { select: { uuid: true } },
        fromUser: { select: USER },
        toUser: { select: USER },
      },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    if (transaction.fromUser.uuid !== userUuid && transaction.toUser.uuid !== userUuid) {
      throw new ForbiddenException('You cannot view this transaction');
    }
    const expense = await this.prisma.expense.findUnique({ where: { id: transaction.expenseId }, select: { uuid: true } });
    if (!expense) throw new NotFoundException('Expense not found');
    return this.map(transaction, expense.uuid);
  }

  async groupHistory(groupUuid: string, userUuid: string) {
    const member = await this.prisma.groupMember.findFirst({
      where: { group: { uuid: groupUuid }, user: { uuid: userUuid } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this group');

    const rows = await this.prisma.transaction.findMany({
      where: { group: { uuid: groupUuid } },
      include: {
        group: { select: { uuid: true } },
        fromUser: { select: USER },
        toUser: { select: USER },
      },
      orderBy: { createdAt: 'desc' },
    });
    const expenseIds = [...new Set(rows.map((t) => t.expenseId))];
    const expenses = await this.prisma.expense.findMany({ where: { id: { in: expenseIds } }, select: { id: true, uuid: true } });
    const expenseMap = new Map(expenses.map((e) => [e.id, e.uuid]));
    return rows.map((t) => this.map(t, expenseMap.get(t.expenseId)!));
  }

  private map(t: any, expenseUuid: string) {
    return {
      uuid: t.uuid,
      expenseId: expenseUuid,
      groupId: t.group.uuid,
      amount: t.amount.toString(),
      description: t.description,
      fromUser: t.fromUser,
      toUser: t.toUser,
      createdAt: t.createdAt,
    };
  }
}
