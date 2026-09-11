import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';

const USER = { uuid: true, name: true, email: true } as const;

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, requesterUuid: string) {
    const payer = await this.prisma.user.findUnique({ where: { uuid: requesterUuid } });
    if (!payer) throw new NotFoundException('User not found');

    const group = await this.prisma.group.findUnique({
      where: { uuid: dto.groupId },
      include: { members: { select: { userId: true, user: { select: USER } }, orderBy: { joinedAt: 'asc' } } },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (!group.members.some((m) => m.userId === payer.id)) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const amount = BigInt(dto.amount);
    const members = group.members;
    if (members.length === 0) throw new ForbiddenException('Group has no members');

    const base = amount / BigInt(members.length);
    const remainder = amount % BigInt(members.length);

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          amount,
          description: dto.description.trim(),
          groupId: group.id,
          paidById: payer.id,
        },
      });

      await tx.expenseSplit.createMany({
        data: members.map((member, index) => ({
          expenseId: created.id,
          userId: member.userId,
          amount: base + (BigInt(index) < remainder ? 1n : 0n),
          status: member.userId === payer.id ? 'PAID' : 'UNPAID',
        })),
      });

      const unpaid = await tx.expenseSplit.count({
        where: { expenseId: created.id, status: 'UNPAID' },
      });
      if (unpaid === 0) {
        await tx.expense.update({ where: { id: created.id }, data: { status: 'CLOSE' } });
      }

      return tx.expense.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          group: { select: { uuid: true, name: true } },
          paidBy: { select: USER },
          splits: { include: { user: { select: USER } }, orderBy: { id: 'asc' } },
        },
      });
    });

    return this.mapExpense(expense);
  }

  async findAll(requesterUuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid: requesterUuid }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const expenses = await this.prisma.expense.findMany({
      where: { group: { members: { some: { userId: user.id } } } },
      include: {
        group: { select: { uuid: true, name: true } },
        paidBy: { select: USER },
        splits: { include: { user: { select: USER } }, orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return expenses.map((e) => this.mapExpense(e));
  }

  async findOne(uuid: string, requesterUuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid: requesterUuid }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const expense = await this.prisma.expense.findUnique({
      where: { uuid },
      include: {
        group: { select: { id: true, uuid: true, name: true, members: { select: { userId: true } } } },
        paidBy: { select: USER },
        splits: { include: { user: { select: USER } }, orderBy: { id: 'asc' } },
      },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    if (!expense.group.members.some((m) => m.userId === user.id)) {
      throw new ForbiddenException('You are not a member of this group');
    }
    return this.mapExpense(expense);
  }

  private mapExpense(expense: any) {
    return {
      uuid: expense.uuid,
      description: expense.description,
      amount: expense.amount.toString(),
      status: expense.status,
      group: { uuid: expense.group.uuid, name: expense.group.name },
      paidBy: expense.paidBy,
      splits: expense.splits.map((split: any) => ({
        uuid: split.uuid,
        user: split.user,
        amount: split.amount.toString(),
        status: split.status,
      })),
      createdAt: expense.createdAt,
    };
  }
}
