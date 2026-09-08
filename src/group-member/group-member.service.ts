import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddGroupMemberDto } from './dto/create-group-member.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

// adjust to whatever fields are actually safe to expose
const SAFE_USER_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class GroupMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async add(addGroupMemberDto: AddGroupMemberDto, reqId: number) {
    const groupId = Number(addGroupMemberDto.groupId);
    const userId = Number(addGroupMemberDto.userId);

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

    return this.prisma.group.update({
      where: { id: groupId },
      data: { members: { connect: { id: userId } } },
      include: { members: { select: SAFE_USER_SELECT } },
    });
  }

  async findAll() {
    return this.prisma.groupMember.findMany({
      include: {
        user: { select: SAFE_USER_SELECT },
        group: true,
      },
    });
  }

  async findOne(id: number) {
    const groupMember = await this.prisma.groupMember.findUnique({
      where: { id },
      include: {
        user: { select: SAFE_USER_SELECT },
        group: true,
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

    const groupMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!groupMember) {
      throw new NotFoundException('User is not a member of this group');
    }

    return this.prisma.groupMember.delete({ where: { id: groupMember.id } });
  }

  private assertOwner(group: { ownerId: number }, reqId: number): void {
    if (group.ownerId !== reqId) {
      throw new ForbiddenException('Only the group owner can manage members');
    }
  }
}
