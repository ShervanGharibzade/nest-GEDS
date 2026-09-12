import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddGroupMemberDto } from './dto/create-group-member.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SplitStatus } from '../prisma/generated/enums.js';

const SAFE_USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class GroupMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async add(addGroupMemberDto: AddGroupMemberDto, reqId: number) {
    const { groupId, userId } = addGroupMemberDto;

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    this.assertOwner(group, reqId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existingMembership) {
      throw new ConflictException('User is already a member of this group');
    }

    return this.prisma.groupMember.create({
      data: { groupId, userId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  /** All members across all groups (used by the generic lookup endpoints). */
  async findAll() {
    return this.prisma.groupMember.findMany({
      include: {
        user: { select: SAFE_USER_SELECT },
      },
    });
  }

  /** Members of a single group. */
  async findByGroup(groupId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async findOne(id: number) {
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { id },
      include: {
        user: { select: SAFE_USER_SELECT },
      },
    });

    if (!groupMember) {
      throw new NotFoundException('Group member not found');
    }

    return groupMember;
  }

  async remove(groupId: number, userId: number, reqId: number) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    this.assertOwner(group, reqId);

    if (group.ownerId === userId) {
      throw new ForbiddenException(
        'The group owner cannot be removed from the group',
      );
    }

    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!groupMember) {
      throw new NotFoundException('User is not a member of this group');
    }

    await this.assertNoUnresolvedDebts(groupId, userId);

    return this.prisma.groupMember.delete({ where: { id: groupMember.id } });
  }

  /**
   * A member can't be removed while they still owe money in this group, or
   * are still owed money by other members in this group — removing them
   * would silently orphan that debt.
   */
  private async assertNoUnresolvedDebts(
    groupId: number,
    userId: number,
  ): Promise<void> {
    const owedByThem = await this.prisma.expenseSplit.count({
      where: {
        userId,
        status: SplitStatus.UNPAID,
        expense: { groupId },
      },
    });

    if (owedByThem > 0) {
      throw new ForbiddenException(
        'This member still has unpaid debts in the group and cannot be removed',
      );
    }

    const owedToThem = await this.prisma.expenseSplit.count({
      where: {
        status: SplitStatus.UNPAID,
        expense: { groupId, paidById: userId },
      },
    });

    if (owedToThem > 0) {
      throw new ForbiddenException(
        'Other members still owe this member money in the group; settle debts before removing them',
      );
    }
  }

  private assertOwner(group: { ownerId: number }, reqId: number): void {
    if (group.ownerId !== reqId) {
      throw new ForbiddenException('Only the group owner can manage members');
    }
  }
}
