import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const USER = { uuid: true, name: true, email: true } as const;

@Injectable()
export class ExpenseSplitService {
  constructor(private readonly prisma: PrismaService) {}

  async mine(groupUuid: string, userUuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');

    const group = await this.prisma.group.findUnique({ where: { uuid: groupUuid }, select: { id: true } });
    if (!group) throw new NotFoundException('Group not found');

    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this group');

    const splits = await this.prisma.expenseSplit.findMany({
      where: { userId: user.id, expense: { groupId: group.id } },
      include: { expense: { select: { uuid: true } }, user: { select: USER } },
      orderBy: { id: 'asc' },
    });
    return splits.map((s) => ({
      uuid: s.uuid,
      expenseId: s.expense.uuid,
      amount: s.amount.toString(),
      status: s.status,
      user: s.user,
    }));
  }
}
