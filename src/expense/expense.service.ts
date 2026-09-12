import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SAFE_USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto, reqId: number) {
    const { amount, description, groupId } = createExpenseDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const groupMembers = await this.prisma.groupMember.findMany({
      where: { groupId: group.id },
      select: { userId: true },
    });

    if (groupMembers.length === 0) {
      throw new BadRequestException('Group has no members');
    }

    const isMember = groupMembers.some((member) => member.userId === reqId);
    if (!isMember) {
      throw new ForbiddenException('User is not a member of this group');
    }

    // Split the amount evenly across every member of the group (the payer
    // included). Everyone except the payer owes their share back to the
    // payer; the payer's own share is what they've already covered by
    // paying. Any remainder from integer division is distributed one unit
    // at a time (deterministically, by userId) to the non-payer members so
    // the sum of all splits + the payer's implicit share always equals the
    // total expense amount exactly.
    const amountBig = BigInt(amount);
    const memberCount = BigInt(groupMembers.length);
    const baseShare = amountBig / memberCount;
    let remainder = amountBig % memberCount;

    const debtors = groupMembers
      .map((m) => m.userId)
      .filter((userId) => userId !== reqId)
      .sort((a, b) => a - b);

    const expense = await this.prisma.$transaction(async (tx) => {
      const createdExpense = await tx.expense.create({
        data: {
          amount: amountBig,
          description,
          groupId: group.id,
          paidById: reqId,
        },
      });

      const splits = debtors.map((userId) => {
        const extra = remainder > 0n ? 1n : 0n;
        if (remainder > 0n) remainder -= 1n;
        return {
          amount: baseShare + extra,
          expenseId: createdExpense.id,
          userId,
        };
      });

      if (splits.length > 0) {
        await tx.expenseSplit.createMany({ data: splits });
      }

      return createdExpense;
    });

    return this.findOne(expense.id, reqId);
  }

  /** Expenses in a group — only visible to members of that group. */
  async findAllForGroup(groupId: number, reqId: number) {
    await this.assertMembership(groupId, reqId);

    return this.prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: SAFE_USER_SELECT },
        splits: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, reqId: number) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        paidBy: { select: SAFE_USER_SELECT },
        splits: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    await this.assertMembership(expense.groupId, reqId);

    return expense;
  }

  private async assertMembership(
    groupId: number,
    userId: number,
  ): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.ownerId === userId) return;

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException(
        'Only members of this group can view its expenses',
      );
    }
  }
}
