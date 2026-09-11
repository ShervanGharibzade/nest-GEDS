import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { GroupResponseDto } from './dto/group-response.dto.js';

const USER = { uuid: true, name: true, email: true } as const;
const GROUP_INCLUDE = {
  owner: { select: USER },
  members: { include: { user: { select: USER } }, orderBy: { joinedAt: 'asc' as const } },
} as const;

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupDto, userUuid: string): Promise<GroupResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { uuid: userUuid } });
    if (!user) throw new NotFoundException('User not found');

    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: { name: dto.name.trim(), ownerId: user.id },
      });
      await tx.groupMember.create({ data: { groupId: created.id, userId: user.id } });
      return tx.group.findUniqueOrThrow({ where: { id: created.id }, include: GROUP_INCLUDE });
    });
    return group;
  }

  async findAll(): Promise<GroupResponseDto[]> {
    return this.prisma.group.findMany({ include: GROUP_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async myGroups(userUuid: string): Promise<GroupResponseDto[]> {
    const user = await this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.group.findMany({
      where: { members: { some: { userId: user.id } } },
      include: GROUP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(groupUuid: string, requesterUuid?: string): Promise<GroupResponseDto> {
    const group = await this.prisma.group.findUnique({ where: { uuid: groupUuid }, include: GROUP_INCLUDE });
    if (!group) throw new NotFoundException('Group not found');
    if (requesterUuid) {
      const member = group.members.some((m) => m.user.uuid === requesterUuid);
      if (!member) throw new ForbiddenException('You are not a member of this group');
    }
    return group;
  }

  async update(groupUuid: string, dto: UpdateGroupDto, userUuid: string): Promise<GroupResponseDto> {
    const group = await this.getOwnedGroup(groupUuid, userUuid);
    const updated = await this.prisma.group.update({
      where: { id: group.id }, data: { name: dto.name.trim() }, include: GROUP_INCLUDE,
    });
    return updated;
  }

  async remove(groupUuid: string, userUuid: string) {
    const group = await this.getOwnedGroup(groupUuid, userUuid);
    await this.prisma.group.delete({ where: { id: group.id } });
    return 'Group deleted successfully';
  }

  async balances(groupUuid: string, requesterUuid: string) {
    const group = await this.prisma.group.findUnique({
      where: { uuid: groupUuid },
      include: {
        members: { include: { user: { select: USER } } },
        expenses: {
          select: {
            amount: true,
            paidById: true,
            splits: { select: { userId: true, amount: true } },
          },
        },
        transactions: { select: { amount: true, fromUserId: true, toUserId: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');

    const requester = group.members.find((m) => m.user.uuid === requesterUuid);
    if (!requester) throw new ForbiddenException('You are not a member of this group');

    const stats = new Map<number, { paid: bigint; owed: bigint; received: bigint; sent: bigint; user: any }>();
    for (const m of group.members) {
      stats.set(m.userId, { paid: 0n, owed: 0n, received: 0n, sent: 0n, user: m.user });
    }

    for (const expense of group.expenses) {
      stats.get(expense.paidById)!.paid += expense.amount;
      for (const split of expense.splits) stats.get(split.userId)!.owed += split.amount;
    }
    for (const tx of group.transactions) {
      stats.get(tx.fromUserId)!.sent += tx.amount;
      stats.get(tx.toUserId)!.received += tx.amount;
    }

    const members = [...stats.values()].map((s) => ({
      user: s.user,
      totalPaid: s.paid.toString(),
      totalOwed: s.owed.toString(),
      totalReceived: s.received.toString(),
      totalSent: s.sent.toString(),
      netBalance: (s.paid - s.owed - s.received + s.sent).toString(),
    }));

    const debts = await this.prisma.expenseSplit.findMany({
      where: {
        status: 'UNPAID',
        expense: { groupId: group.id },
      },
      include: {
        expense: { select: { uuid: true, paidBy: { select: USER } } },
        user: { select: USER },
      },
      orderBy: { id: 'asc' },
    });

    return {
      groupId: group.uuid,
      members,
      debts: debts.map((d) => ({
        expenseId: d.expense.uuid,
        debtor: d.user,
        creditor: d.expense.paidBy,
        amount: d.amount.toString(),
      })),
    };
  }

  private async getOwnedGroup(groupUuid: string, userUuid: string) {
    const group = await this.prisma.group.findUnique({ where: { uuid: groupUuid } });
    if (!group) throw new NotFoundException('Group not found');
    const user = await this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    if (group.ownerId !== user.id) throw new ForbiddenException('Only the group owner can perform this action');
    return group;
  }
}
