import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExpenseSplitService } from '../expense-split/expense-split.service.js';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenseSplit: ExpenseSplitService,
  ) {}
  async create(createExpenseDto: CreateExpenseDto, reqId: number) {
    const { amount, description, groupId } = createExpenseDto;

    if (amount <= 0) {
      throw new ForbiddenException('Amount must be positive');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: reqId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const groupMembers = await this.prisma.groupMember.findMany({
      where: {
        groupId: group.id,
      },
      select: {
        userId: true,
      },
    });

    if (groupMembers.length === 0) {
      throw new ForbiddenException('Group has no members');
    }

    const isMember = groupMembers.some((member) => member.userId === user.id);

    if (!isMember) {
      throw new ForbiddenException('User is not a member of this group');
    }

    const debt = amount / groupMembers.length;

    const expense = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          amount,
          description,
          groupId: group.id,
          paidById: user.id,
        },
      });

      await tx.expenseSplit.createMany({
        data: groupMembers.map((member) => ({
          amount: debt,
          expenseId: expense.id,
          userId: member.userId,
        })),
      });

      return expense;
    });

    return expense;
  }

  async findAll() {
    return this.prisma.expense.findMany({
      include: {
        group: true,
        paidBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const expense = await this.prisma.expense.findUnique({
      where: {
        id,
      },
      include: {
        group: true,
        paidBy: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  // not need to exist when group remove its also deleted.

  // async remove(id: number) {
  //   const expense = await this.prisma.expense.findUnique({
  //     where: {
  //       id,
  //     },
  //   });

  //   if (!expense) {
  //     throw new NotFoundException('Expense not found');
  //   }

  //   return this.prisma.expense.delete({
  //     where: {
  //       id,
  //     },
  //   });
  // }
}
