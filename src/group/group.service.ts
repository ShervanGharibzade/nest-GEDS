import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { InvalidClassException } from '@nestjs/core/internal';

import { ERROR_MESSAGES } from '../common/constants/error-messages.js';

import { Group } from '../prisma/generated/client.js';

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(data: CreateGroupDto, userId: number): Promise<Group> {
    if (!userId) {
      throw new InvalidClassException('owner id missing');
    }

    if (!data.name?.trim()) {
      throw new InvalidClassException('invalid group name');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (user === null) {
      throw new NotFoundException(ERROR_MESSAGES.USER.NOT_FOUND());
    }

    return this.prisma.group.create({
      data: {
        name: data.name.trim(),

        owner: {
          connect: {
            id: user.id,
          },
        },
      },
    });
  }

  async findAll(): Promise<Group[]> {
    return this.prisma.group.findMany({
      orderBy: {
        id: 'desc',
      },
    });
  }

  async myGroups(userId: number): Promise<Group[]> {
    return this.prisma.group.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findOne(groupId: number): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (group === null) {
      throw new NotFoundException(`Group with this id ${groupId} not found.`);
    }

    return group;
  }

  async update(
    groupId: number,
    data: UpdateGroupDto,
    userId: number,
  ): Promise<Group> {
    if (!userId) {
      throw new InvalidClassException('user id missing');
    }

    if (!data.name?.trim()) {
      throw new BadRequestException('invalid group name');
    }

    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (group === null) {
      throw new NotFoundException(`Group with this id ${groupId} not found.`);
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can update this group.');
    }

    return this.prisma.group.update({
      where: {
        id: groupId,
      },
      data: {
        name: data.name.trim(),
      },
    });
  }

  async remove(groupId: number, userId: number): Promise<Group> {
    if (!userId) {
      throw new InvalidClassException('user id missing');
    }

    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (group === null) {
      throw new NotFoundException(`Group with this id ${groupId} not found.`);
    }

    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this group.');
    }

    return this.prisma.group.delete({
      where: {
        id: groupId,
      },
    });
  }
}
