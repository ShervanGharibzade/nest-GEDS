import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddGroupMemberDto } from './dto/create-group-member.dto.js';

const USER = { uuid: true, name: true, email: true } as const;

@Injectable()
export class GroupMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async add(dto: AddGroupMemberDto, requesterUuid: string) {
    const group = await this.prisma.group.findUnique({ where: { uuid: dto.groupId } });
    if (!group) throw new NotFoundException('Group not found');
    await this.assertOwner(group.ownerId, requesterUuid);

    const user = await this.prisma.user.findUnique({ where: { uuid: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
    });
    if (existing) throw new ConflictException('User is already a member of this group');

    return this.prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id },
      include: { user: { select: USER } },
    });
  }

  async findAll(groupUuid: string, requesterUuid: string) {
    const group = await this.prisma.group.findUnique({
      where: { uuid: groupUuid },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.assertMember(group.id, requesterUuid);

    return this.prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: { select: USER } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async remove(groupUuid: string, userUuid: string, requesterUuid: string) {
    const group = await this.prisma.group.findUnique({ where: { uuid: groupUuid } });
    if (!group) throw new NotFoundException('Group not found');
    await this.assertOwner(group.ownerId, requesterUuid);

    const target = await this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === group.ownerId) throw new ForbiddenException('The group owner cannot be removed');

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: target.id } },
      include: { user: { select: USER } },
    });
    if (!membership) throw new NotFoundException('User is not a member of this group');

    const unresolved = await this.prisma.expenseSplit.count({
      where: { userId: target.id, status: 'UNPAID', expense: { groupId: group.id } },
    });
    if (unresolved > 0) throw new ConflictException('Member has unresolved debts');

    await this.prisma.groupMember.delete({ where: { id: membership.id } });
    return 'Member removed successfully';
  }

  private async assertOwner(ownerId: number, requesterUuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid: requesterUuid }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id !== ownerId) throw new ForbiddenException('Only the group owner can manage members');
  }

  private async assertMember(groupId: number, requesterUuid: string) {
    const member = await this.prisma.groupMember.findFirst({
      where: { groupId, user: { uuid: requesterUuid } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this group');
  }
}
