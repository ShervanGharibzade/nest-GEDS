import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import {
  DebtDto,
  GroupBalancesResponseDto,
  MemberBalanceDto,
} from './dto/group-balances-response.dto.js';

import { PrismaService } from '../prisma/prisma.service.js';

import { ERROR_MESSAGES } from '../common/constants/error-messages.js';

import { Group } from '../prisma/generated/client.js';
import { SplitStatus } from '../prisma/generated/enums.js';

const SAFE_USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE — creator is automatically added as a GroupMember.
  async create(data: CreateGroupDto, userId: number): Promise<Group> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user === null) {
      throw ERROR_MESSAGES.USER.NOT_FOUND();
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name: data.name.trim(),
          owner: { connect: { id: user.id } },
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: user.id,
        },
      });

      return group;
    });
  }

  async findAll(): Promise<Group[]> {
    return this.prisma.group.findMany({
      orderBy: { id: 'desc' },
    });
  }

  /** Groups the user owns OR belongs to as a member. */
  async myGroups(userId: number): Promise<Group[]> {
    return this.prisma.group.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: SAFE_USER_SELECT } },
        },
      },
    });

    if (group === null) {
      throw new NotFoundException(`Group with id ${groupId} not found.`);
    }

    return group;
  }

  async update(
    groupId: number,
    data: UpdateGroupDto,
    userId: number,
  ): Promise<Group> {
    if (!data.name?.trim()) {
      throw new BadRequestException('Invalid group name');
    }

    const group = await this.findGroupOrThrow(groupId);
    this.assertOwner(group, userId, 'update');

    return this.prisma.group.update({
      where: { id: groupId },
      data: { name: data.name.trim() },
    });
  }

  async remove(groupId: number, userId: number): Promise<Group> {
    const group = await this.findGroupOrThrow(groupId);
    this.assertOwner(group, userId, 'delete');

    return this.prisma.group.delete({
      where: { id: groupId },
    });
  }

  /** GET /groups/:groupId/balances */
  async getBalances(
    groupId: number,
    requesterId: number,
  ): Promise<GroupBalancesResponseDto> {
    const group = await this.findGroupOrThrow(groupId);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: SAFE_USER_SELECT } },
    });

    const isMember = members.some((m) => m.userId === requesterId);
    if (!isMember && group.ownerId !== requesterId) {
      throw new ForbiddenException(
        'Only group members can view group balances',
      );
    }

    // Lifetime stats (all expenses, regardless of settlement status).
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      select: { paidById: true, amount: true },
    });

    const splits = await this.prisma.expenseSplit.findMany({
      where: { expense: { groupId } },
      select: {
        userId: true,
        amount: true,
        status: true,
        expense: { select: { paidById: true } },
      },
    });

    const totalPaid = new Map<number, bigint>();
    for (const expense of expenses) {
      totalPaid.set(
        expense.paidById,
        (totalPaid.get(expense.paidById) ?? 0n) + expense.amount,
      );
    }

    const totalOwed = new Map<number, bigint>();
    for (const split of splits) {
      totalOwed.set(
        split.userId,
        (totalOwed.get(split.userId) ?? 0n) + split.amount,
      );
    }

    // Outstanding debts — only UNPAID splits, so completed transactions
    // (which flip a split to PAID) are already reflected: settled splits
    // simply drop out of this calculation.
    const pairNet = new Map<string, bigint>(); // key "lowId:highId", positive => lowId owes highId
    for (const split of splits) {
      if (split.status !== SplitStatus.UNPAID) continue;
      const debtor = split.userId;
      const creditor = split.expense.paidById;
      if (debtor === creditor) continue;

      const [low, high] = debtor < creditor ? [debtor, creditor] : [creditor, debtor];
      const key = `${low}:${high}`;
      const signedAmount = debtor === low ? split.amount : -split.amount;
      pairNet.set(key, (pairNet.get(key) ?? 0n) + signedAmount);
    }

    const nameById = new Map(members.map((m) => [m.userId, m.user]));

    const debts: DebtDto[] = [];
    for (const [key, netAmount] of pairNet.entries()) {
      if (netAmount === 0n) continue;
      const [lowStr, highStr] = key.split(':');
      const low = Number(lowStr);
      const high = Number(highStr);
      const fromUserId = netAmount > 0n ? low : high;
      const toUserId = netAmount > 0n ? high : low;
      const amount = netAmount > 0n ? netAmount : -netAmount;

      debts.push({
        fromUserId,
        fromUserName: nameById.get(fromUserId)?.name ?? `User ${fromUserId}`,
        toUserId,
        toUserName: nameById.get(toUserId)?.name ?? `User ${toUserId}`,
        amount: amount.toString(),
      });
    }

    const netBalanceById = new Map<number, bigint>();
    for (const debt of debts) {
      netBalanceById.set(
        debt.toUserId,
        (netBalanceById.get(debt.toUserId) ?? 0n) + BigInt(debt.amount),
      );
      netBalanceById.set(
        debt.fromUserId,
        (netBalanceById.get(debt.fromUserId) ?? 0n) - BigInt(debt.amount),
      );
    }

    const balances: MemberBalanceDto[] = members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      totalPaid: (totalPaid.get(m.userId) ?? 0n).toString(),
      totalOwed: (totalOwed.get(m.userId) ?? 0n).toString(),
      netBalance: (netBalanceById.get(m.userId) ?? 0n).toString(),
    }));

    return { groupId, balances, debts };
  }

  private async findGroupOrThrow(groupId: number): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (group === null) {
      throw new NotFoundException(`Group with id ${groupId} not found.`);
    }

    return group;
  }

  private assertOwner(group: Group, userId: number, action: string): void {
    if (group.ownerId !== userId) {
      throw new ForbiddenException(`Only the owner can ${action} this group.`);
    }
  }
}
